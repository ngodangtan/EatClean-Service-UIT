You are a senior backend engineer building production-grade features
for a health-tech meal planning API.

Context:

- Express + ES Modules
- MongoDB + Mongoose
- Phase 1: Validation layer (AJV schema + logical validation + retry)
- Phase 2: Deterministic nutrition engine (BMR/TDEE/macros/distribution)
- Phase 3: AI creative layer isolated (strict prompts, sanitization, guardrails)
- Phase 4: Disease restriction engine (macro adjustment, ingredient filtering, safety validation)
- Phase 5: Production hardening (auth, logging, validation, favorites, swap, shopping list)
- Current state: AI generation works well but relies on LM Studio generating meals purely from
  scratch — no grounding in real recipe data. This leads to hallucinated ingredient combinations,
  culturally inaccurate dishes, and limited disease-awareness depth.

Goal of Phase 6:

RAG (Retrieval-Augmented Generation) Integration.
Replace unconstrained free-form AI generation with retrieval-grounded generation:
before each meal prompt, retrieve semantically similar reference meals from a curated
knowledge base, then inject them as grounding context into the prompt.

Architecture:
  User request → NutritionEngine → DiseaseEngine
    → [NEW] RAG Retriever: query vector DB for relevant meals/ingredients
    → promptBuilder (inject retrieved context) → LLM → sanitize → validate

Tech choices (local-first, matching existing LM Studio approach):
- Vector DB: ChromaDB (Docker, free, zero cloud dependency)
- Embeddings: LM Studio embedding endpoint (nomic-embed-text or all-minilm)
- Knowledge base: curated JSON files in src/data/knowledgeBase/ (version controlled)
- RAG is graceful-degradation: if Chroma is unavailable, generation continues without context

========================================
1. KNOWLEDGE BASE DATA FILES
========================================

Create directory: src/data/knowledgeBase/

Create three JSON files:

---

src/data/knowledgeBase/recipes.json

Array of recipe reference documents. Each document:
{
  "id": "rec_001",
  "name": "Grilled Salmon with Steamed Broccoli",
  "mealType": "lunch",           // breakfast | lunch | dinner | snack
  "cuisine": "western",
  "goal": ["lose-weight", "improve-health"],
  "diseaseCompatible": ["hypertension", "high-uric-acid"],
  "ingredients": ["salmon fillet", "broccoli", "lemon", "olive oil", "garlic", "dill"],
  "description": "A light, protein-rich meal with omega-3 fatty acids and cruciferous vegetables.",
  "tags": ["high-protein", "low-carb", "gluten-free"]
}

Include at least 30 recipes covering:
- All 4 mealTypes (breakfast, lunch, dinner, snack)
- All 3 goals (lose-weight, gain-weight, improve-health)
- All 4 diseases (diabetes, kidney-disease, high-uric-acid, hypertension)
- At least 4 cuisines (vietnamese, western, asian, mediterranean)
- Mix of disease-compatible and general recipes

---

src/data/knowledgeBase/diseaseGuidelines.json

Array of disease dietary guideline documents. Each document:
{
  "id": "guide_diabetes",
  "disease": "diabetes",
  "summary": "Focus on low glycemic index foods. Limit refined carbs and sugars.",
  "recommendedFoods": ["brown rice", "quinoa", "leafy greens", "berries", "legumes", "oats"],
  "avoidFoods": ["white bread", "sugary drinks", "white rice", "candy", "processed snacks"],
  "mealTips": [
    "Pair carbs with protein to slow glucose absorption",
    "Choose whole grains over refined grains",
    "Include fiber-rich vegetables in every meal"
  ]
}

Include all 4 diseases: diabetes, kidney-disease, high-uric-acid, hypertension.

---

src/data/knowledgeBase/ingredients.json

Array of ingredient reference documents. Each document:
{
  "id": "ing_001",
  "name": "quinoa",
  "category": "grains",          // produce | protein | dairy | grains | pantry | other
  "aliases": ["quinua"],
  "safeFor": ["diabetes", "hypertension", "high-uric-acid"],
  "avoidFor": [],
  "nutritionProfile": "high-protein grain, complete amino acids, low glycemic index",
  "substitutes": ["brown rice", "buckwheat", "bulgur"]
}

Include at least 40 common ingredients covering all food categories.
Ensure coverage of ingredients already referenced in diseaseRules.js forbidden/preferred lists.

========================================
2. RAG SERVICE LAYER
========================================

Create directory: src/services/rag/

----------------------------------------
2a. src/services/rag/embeddingClient.js
----------------------------------------

Handles embedding generation via LM Studio.

Export:
  async getEmbedding(text)
  async getEmbeddingBatch(texts)  // array of strings

Implementation:
- POST to process.env.LM_STUDIO_EMBEDDING_URL (e.g. http://localhost:1234/v1/embeddings)
- Model: process.env.EMBEDDING_MODEL (e.g. "nomic-embed-text")
- 10 second timeout with AbortController
- On failure: log warning and return null (graceful degradation)
- Normalize text before embedding: trim, lowercase, collapse whitespace

Example request body:
{
  "model": "nomic-embed-text",
  "input": "grilled salmon with vegetables for lunch"
}

Parse response: data[0].embedding (array of floats)

----------------------------------------
2b. src/services/rag/vectorStore.js
----------------------------------------

Wraps ChromaDB client. Uses package: chromadb

Export:
  async initializeCollection(collectionName)   // create if not exists
  async upsertDocuments(collectionName, documents)
  async queryDocuments(collectionName, queryEmbedding, options)
  async deleteCollection(collectionName)
  async healthCheck()  // returns boolean

upsertDocuments(collectionName, documents):
- documents is array of: { id, embedding, metadata, document }
- metadata: flat object of strings/numbers/booleans (ChromaDB requirement)
- document: string representation of the content for display

queryDocuments(collectionName, queryEmbedding, options):
- options: { nResults = 3, where = {} }
- where: ChromaDB metadata filter (e.g. { mealType: "breakfast" })
- Returns: { ids, documents, metadatas, distances }
- On failure: log warning and return null (graceful degradation)

ChromaDB connection:
- URL: process.env.CHROMA_URL (default: http://localhost:8000)
- Collection name constant: COLLECTIONS = { RECIPES: 'recipes', GUIDELINES: 'guidelines', INGREDIENTS: 'ingredients' }

----------------------------------------
2c. src/services/rag/retriever.js
----------------------------------------

High-level retrieval logic. Composes embeddingClient + vectorStore.

Export:
  async retrieveRelevantMeals(params)
  async retrieveDiseaseGuidelines(diseases)
  async retrieveIngredientInfo(ingredientNames)

retrieveRelevantMeals(params):
  params: {
    mealType,        // "breakfast" | "lunch" | "dinner" | "snack"
    goal,            // "lose-weight" | "gain-weight" | "improve-health"
    diseases,        // string[] - may be empty
    cuisine,         // string - may be null
    favoriteMeal,    // string - may be null
    nResults: 3      // how many to return
  }

  Steps:
  1. Build query string from params:
     "{mealType} meal for {goal} goal {cuisine} cuisine {favoriteMeal}"
     (omit null/empty fields)
  2. Get embedding via getEmbedding(queryString)
  3. If embedding fails: return [] (graceful degradation)
  4. Build metadata filter:
     - If diseases non-empty: filter where mealType matches (ChromaDB $in not supported for arrays,
       so filter only mealType; disease filtering done post-retrieval in ragContextBuilder)
     - Otherwise filter by mealType only
  5. Query RECIPES collection with filter
  6. Parse and return raw results

retrieveDiseaseGuidelines(diseases):
  - diseases: string[] (e.g. ["diabetes", "hypertension"])
  - If empty: return []
  - Query GUIDELINES collection for each disease
  - Use metadata filter: { disease: diseaseName }
  - Return combined results (deduplicated by id)

retrieveIngredientInfo(ingredientNames):
  - ingredientNames: string[] (top forbidden/preferred from diseaseRules)
  - Build query from ingredient names joined by comma
  - Query INGREDIENTS collection
  - Return top 5 results

----------------------------------------
2d. src/services/rag/ragContextBuilder.js
----------------------------------------

Formats retrieved documents into a prompt-injectable string.
Applies same sanitization as promptBuilder.js to prevent prompt injection via document content.

Import sanitizePromptInput from promptBuilder.js

Export:
  buildMealContext(retrievedMeals, retrievedGuidelines)

buildMealContext(retrievedMeals, retrievedGuidelines):
- retrievedMeals: raw retrieval results from retrieveRelevantMeals()
- retrievedGuidelines: raw retrieval results from retrieveDiseaseGuidelines()
- Returns: string to inject into prompt (max 1500 characters total)

Format:

If meals found:
"""
Reference meals (use as inspiration, do NOT copy exactly):
1. {sanitized name}: {sanitized ingredient list} ({sanitized description})
2. ...
"""

If guidelines found:
"""
Dietary guidelines to follow:
- {sanitized tip 1}
- {sanitized tip 2}
"""

Sanitization rules (CRITICAL for prompt injection prevention):
- Apply sanitizePromptInput() to every string field from retrieved documents
- Cap each meal entry to 200 chars
- Cap each guideline tip to 150 chars
- Cap total output to 1500 chars (hard truncate at last complete line)
- Strip any text containing: "ignore", "forget", "system", "assistant", "human",
  "instruction", "override" (case-insensitive) — these indicate injected adversarial content

Return empty string if no relevant content found.

----------------------------------------
2e. src/services/rag/indexer.js
----------------------------------------

One-time and incremental indexing of knowledge base JSON files into ChromaDB.

Export:
  async indexAllCollections()    // index all three JSON files
  async indexRecipes()
  async indexGuidelines()
  async indexIngredients()

indexRecipes():
1. Read src/data/knowledgeBase/recipes.json
2. For each recipe, build document string:
   "{name}. {mealType} for {goal.join(', ')}. Ingredients: {ingredients.join(', ')}. {description}"
3. Get embedding for document string
4. Build metadata (ChromaDB requires flat, no arrays):
   {
     name: recipe.name,
     mealType: recipe.mealType,
     cuisine: recipe.cuisine,
     goal: recipe.goal.join(','),              // join arrays as comma-separated strings
     diseaseCompatible: recipe.diseaseCompatible.join(','),
     tags: recipe.tags.join(',')
   }
5. Upsert to RECIPES collection
6. Log progress every 10 items

indexGuidelines():
1. Read src/data/knowledgeBase/diseaseGuidelines.json
2. For each guideline:
   - document string: "{disease}: {summary}. Tips: {mealTips.join('. ')}"
   - metadata: { disease: guide.disease, type: 'guideline' }
3. Upsert to GUIDELINES collection

indexIngredients():
1. Read src/data/knowledgeBase/ingredients.json
2. For each ingredient:
   - document string: "{name} ({aliases.join(', ')}). {nutritionProfile}. Safe for: {safeFor.join(', ')}."
   - metadata: { name: ing.name, category: ing.category, safeFor: ing.safeFor.join(','), avoidFor: ing.avoidFor.join(',') }
3. Upsert to INGREDIENTS collection

Add progress logging with logger (info level).
Skip embedding failures (log warning, continue to next item).
Return summary: { recipes: N, guidelines: N, ingredients: N, errors: N }

========================================
3. UPDATE promptBuilder.js
========================================

File: src/services/ai/promptBuilder.js

Add parameter retrievedContext (string | null) to buildMealPrompt():

buildMealPrompt({
  mealType, goal, dietPreference, favoriteMeal,
  cuisinePreference, diseases, targetMacros,
  forbiddenIngredients, limitedIngredients, preferredIngredients,
  errorFeedback,
  retrievedContext    // NEW: pre-sanitized context string from ragContextBuilder
})

Inject retrievedContext as a new section in the prompt, between the meal requirements
section and the strict rules section:

If retrievedContext is non-empty:
"""

REFERENCE CONTEXT (inspiration only — do not copy):
{retrievedContext}

"""

Place it AFTER the user preferences block and BEFORE the STRICT RULES block.
Make it clear in the prompt that the AI should use context as inspiration, not copy.

No sanitization needed here (ragContextBuilder already sanitizes).
Do NOT inject if retrievedContext is empty string or null.

========================================
4. UPDATE mealplan.controller.js
========================================

File: src/controllers/mealplan.controller.js

Add retrieval step AFTER disease adjustments and BEFORE the retry generation loop.

Import at top:
  import { retrieveRelevantMeals, retrieveDiseaseGuidelines } from '../services/rag/retriever.js'
  import { buildMealContext } from '../services/rag/ragContextBuilder.js'

Add in generateMealPlan():

// After applyDiseaseAdjustments(), before the generation retry loop:

// RAG: retrieve context per mealType (deduplicated)
const uniqueMealTypes = [...new Set(allMealTasks.map(t => t.mealType))];
const ragContextByMealType = {};

for (const mealType of uniqueMealTypes) {
  const [meals, guidelines] = await Promise.all([
    retrieveRelevantMeals({
      mealType,
      goal: nutritionPlan.goal,
      diseases: effectiveDiseases,
      cuisine: healthProfile.cuisinePreference?.[0] ?? null,
      favoriteMeal: healthProfile.favoriteMeal ?? null
    }),
    retrieveDiseaseGuidelines(effectiveDiseases)
  ]);
  ragContextByMealType[mealType] = buildMealContext(meals, guidelines);
}

When building meal generation tasks, pass ragContextByMealType[task.mealType]
as retrievedContext to generateMeal() → which passes it to buildMealPrompt().

Update generateMeal() signature in mealGenerator.js to accept and forward retrievedContext:
  generateMeal({ ..., retrievedContext = null })

If retrieval throws (network error, Chroma down): catch, log warning, set
ragContextByMealType to {} and continue without RAG (graceful degradation).

========================================
5. CREATE INDEXER SCRIPT
========================================

Create: scripts/indexKnowledgeBase.js

#!/usr/bin/env node
// Run: node scripts/indexKnowledgeBase.js

import '../src/config/db.js' is NOT needed (no MongoDB for this script).
Load .env with: import 'dotenv/config'

Call indexAllCollections() and log the summary.
Exit with code 0 on success, code 1 on fatal error.

Add to package.json scripts:
  "rag:index": "node scripts/indexKnowledgeBase.js"

========================================
6. ENVIRONMENT VARIABLES
========================================

Add to .env (document in .env.example):

# RAG / Embeddings
LM_STUDIO_EMBEDDING_URL=http://localhost:1234/v1/embeddings
EMBEDDING_MODEL=nomic-embed-text
CHROMA_URL=http://localhost:8000
RAG_ENABLED=true     # set false to disable RAG entirely (skip retrieval, generation continues)

In retriever.js: check RAG_ENABLED env var. If "false", skip all retrieval and return [].
This allows instant RAG disable without code changes.

========================================
7. DOCKER SETUP FOR CHROMADB
========================================

Create: docker-compose.rag.yml

version: '3.8'
services:
  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/chroma
    environment:
      - IS_PERSISTENT=TRUE
      - PERSIST_DIRECTORY=/chroma/chroma
    restart: unless-stopped

volumes:
  chroma_data:

Add to package.json scripts:
  "rag:start": "docker-compose -f docker-compose.rag.yml up -d"
  "rag:stop": "docker-compose -f docker-compose.rag.yml down"

========================================
8. UNIT TESTS
========================================

Create test structure:

tests/unit/services/rag/
  ragContextBuilder.test.js
  retriever.test.js (mock embeddingClient and vectorStore)

tests/unit/data/
  knowledgeBase.test.js

ragContextBuilder.test.js:
- Empty retrieval → returns empty string
- Meals present → format includes meal names and ingredients (sanitized)
- Guidelines present → format includes tips
- Total output capped at 1500 chars
- Adversarial content in document → sanitized/stripped
  (test: a document with "ignore all previous instructions" → that text absent from output)
- sanitizePromptInput applied to all fields

retriever.test.js (mock dependencies):
- retrieveRelevantMeals builds correct query string from params
- retrieveRelevantMeals returns [] when embeddingClient returns null
- retrieveDiseaseGuidelines returns [] for empty diseases array
- RAG_ENABLED=false → all retrieval returns [] immediately

knowledgeBase.test.js:
- recipes.json: all required fields present per item
- recipes.json: all mealType values are valid enum
- recipes.json: all diseases in diseaseCompatible are valid enum
- diseaseGuidelines.json: covers all 4 diseases
- ingredients.json: safeFor/avoidFor reference valid disease names

========================================
9. STRICT RULES
========================================

- RAG is ADDITIVE: zero changes to NutritionEngine, DiseaseEngine, MealValidationService
- Prompt injection prevention MUST extend to retrieved content:
  ragContextBuilder must sanitize every field, check for adversarial keywords,
  and enforce hard output length cap
- Graceful degradation is MANDATORY: any RAG failure (Chroma down, embedding error,
  network timeout) must log a warning and fall back to generation without context.
  Never let RAG failure block meal plan generation.
- All numeric nutrition values remain backend-injected only. Retrieved context
  contains NO calorie or macro numbers (stripped during knowledge base curation)
- Retrieved context must be clearly marked as "inspiration" in the prompt to prevent
  the LLM from treating it as authoritative facts
- Do NOT break existing API responses — mealPlan schema unchanged
- All new code: async/await, ES Modules, import/export
- Reuse existing patterns: logger from src/utils/logger.js, AppError from src/utils/AppError.js
- sanitizePromptInput imported from promptBuilder.js — do NOT duplicate sanitization logic

========================================
IMPLEMENTATION ORDER
========================================

1. Knowledge base JSON files (src/data/knowledgeBase/) — domain data first
2. embeddingClient.js — foundational, needed by all RAG services
3. vectorStore.js — ChromaDB client
4. indexer.js + docker-compose.rag.yml — stand up ChromaDB and index data
5. retriever.js — query logic, verify retrieval quality before integration
6. ragContextBuilder.js — format + sanitize retrieved content for prompt injection
7. Update promptBuilder.js — add retrievedContext parameter
8. Update mealGenerator.js — forward retrievedContext to buildMealPrompt
9. Update mealplan.controller.js — add retrieval step in generation flow
10. scripts/indexKnowledgeBase.js — indexing CLI
11. Tests

Verify at each step: run npm test after step 8 to confirm existing tests still pass.

========================================
OUTPUT REQUIREMENTS
========================================

Return:

- Full content of src/data/knowledgeBase/recipes.json (30+ recipes)
- Full content of src/data/knowledgeBase/diseaseGuidelines.json (4 diseases)
- Full content of src/data/knowledgeBase/ingredients.json (40+ ingredients)
- Full code for all new files in src/services/rag/
- Updated src/services/ai/promptBuilder.js
- Updated src/services/ai/mealGenerator.js
- Updated src/controllers/mealplan.controller.js (retrieval step only)
- scripts/indexKnowledgeBase.js
- docker-compose.rag.yml
- Updated package.json scripts section
- All test files
- Clear comments on design decisions
- No extra explanation outside code blocks

========================================
NPM PACKAGES NEEDED
========================================

npm install chromadb dotenv
