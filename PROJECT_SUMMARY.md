# Eat Clean API — Comprehensive Technical Summary

> Generated: 2026-03-12 | Last updated: 2026-04-11 | Based on all requirement documents (Phase 1–6) and full source code analysis
>
> **2026-04-11 update notes:** Vietnamese-only product (LM Studio embedding model: `bge-m3`, knowledge base + prompts in Vietnamese). `POST /api/meal-plans/generate` is now **purpose-driven** (`daily_health_based | weight_management | disease_based`). `desiredWeight` is no longer stored on the health profile — it is request-scoped on `/generate`. The orphaned `/api/recipes` resource and its model/controller/routes/validator/tests have been removed. `HealthProfile.diseases` is now a structured subdocument array (`{ key, diagnosedAt, indicators[] }`) backed by the disease catalog.

---

## 1. Project Overview

### What the Project Does

Eat Clean API is a Node.js/Express REST API that provides **AI-powered, medically-aware meal plan generation** for health-conscious users. It solves the problem of creating personalised meal plans that simultaneously satisfy:

- Individual nutritional targets (calories, protein, carbs, fat) derived from body metrics and fitness goals
- Medical dietary restrictions for chronic conditions (diabetes, kidney disease, high uric acid, hypertension)
- User food preferences (cuisine, favourite meals, diet style)
- Practical usability (shopping lists, meal swaps)
- **Grounded AI generation** — meals are inspired by a curated **Vietnamese** knowledge base of real recipes and disease dietary guidelines rather than generated purely from scratch
- **Purpose-aware planning** — the same `/generate` endpoint serves three distinct flows (daily Apple Watch–driven plans, weight-management plans with explicit duration + target weight, and disease-management plans), each with its own request validation and safety guards

### Main Problem Solved

Generic meal planning tools either ignore medical restrictions entirely, or rely on static templates. This system uniquely combines:

1. A **deterministic nutrition engine** — precise, repeatable medical-grade macro calculation
2. A **disease restriction engine** — ingredient blacklists and macro caps per medical condition
3. A **RAG (Retrieval-Augmented Generation) layer** — real reference recipes and dietary guidelines retrieved from a vector database and injected into the AI prompt as grounding context
4. A **generative AI layer** — creative meal naming and descriptions, grounded by the retrieved context
5. A **safety guardrail** — no medically forbidden ingredient can appear in a generated plan

The RAG layer was added in Phase 6 to address the original system's weakness: AI meals were hallucinated from scratch, leading to culturally inaccurate dishes, implausible ingredient combinations, and shallow disease-awareness. With RAG, the LLM now works from real examples.

### Overall System Workflow

```
User Registration (optionally captures height + currentWeight) → Health Profile Setup
     ↓
Nutrition Engine (deterministic: BMR → TDEE → calories → macros → meal distribution)
     ↓
Disease Engine (cap macros for active diseases, build ingredient restriction lists)
     ↓
RAG Retriever (query ChromaDB for similar reference meals + disease guidelines per mealType)
     ↓
Prompt Builder (inject nutrition targets + restrictions + retrieved context)
     ↓
LM Studio / LLM (generates name, description, ingredients, benefits ONLY — grounded by context)
     ↓
Safety Validator (word-boundary ingredient scan, reject forbidden items, retry up to 2×)
     ↓
Schema + Logical Validator (AJV schema, calorie/macro consistency checks)
     ↓
MongoDB Persistence (MealPlan saved with full lineage)
     ↓
User Response (plan + nutrition summary + medical disclaimer if diseases present)
```

---

## 2. Project Structure

### Directory Layout

```
eat-clean-api/
├── src/
│   ├── index.js                            # Express app entry point
│   ├── config/
│   │   ├── db.js                           # MongoDB connection
│   │   └── swagger.js                      # OpenAPI 3.0 spec
│   ├── controllers/                        # Business logic layer
│   │   ├── auth.controller.js
│   │   ├── health.controller.js            # Health profile CRUD (POST = create, PUT = update — same handler)
│   │   ├── disease.controller.js           # GET /api/diseases — exposes the disease catalog
│   │   ├── mealplan.controller.js          # Meal plan generation orchestrator (purpose-aware)
│   │   └── favorite.controller.js
│   ├── routes/                             # Express routers
│   │   ├── index.js                        # Route aggregator (mounts all under /api)
│   │   ├── auth.routes.js
│   │   ├── health.routes.js
│   │   ├── disease.routes.js
│   │   └── mealplan.routes.js
│   ├── models/                             # Mongoose schemas
│   │   ├── User.js
│   │   ├── HealthProfile.js                # diseases is now [diseaseEntrySchema] (key + indicators)
│   │   ├── MealPlan.js                     # adds `purpose` enum field
│   │   ├── Favorite.js                     # targetType: ['meal-plan'] only
│   │   └── TokenBlacklist.js
│   ├── middleware/
│   │   ├── auth.js                         # JWT verification + blacklist check
│   │   ├── errorHandler.js                 # Global error handler
│   │   ├── loginLimiter.js                 # Rate limit: 5 attempts / 15 min
│   │   ├── requestLogger.js                # Winston request ID + duration logging
│   │   └── validate.js                     # Joi schema validation middleware
│   ├── validators/                         # Input schema definitions
│   │   ├── auth.validator.js
│   │   ├── healthProfile.validator.js      # Joi schema + catalog cross-check helpers
│   │   ├── mealPlanGenerate.validator.js   # Joi schema for POST /generate (purpose-aware via Joi.when)
│   │   └── mealPlan.schema.js              # AJV JSON schema for AI output
│   ├── services/
│   │   ├── nutrition/                      # Deterministic nutrition calculations
│   │   │   ├── bmrCalculator.js
│   │   │   ├── tdeeCalculator.js
│   │   │   ├── calorieTargetCalculator.js
│   │   │   ├── macroCalculator.js
│   │   │   ├── mealMacroDistributor.js
│   │   │   ├── durationCalculator.js
│   │   │   └── nutritionEngine.js          # Orchestrator
│   │   ├── disease/                        # Medical restriction engine
│   │   │   ├── diseaseRules.js             # Disease config (rules, ingredients)
│   │   │   ├── macroAdjuster.js            # Strict-cap-wins macro adjustment
│   │   │   ├── ingredientFilter.js         # Word-boundary ingredient scan
│   │   │   ├── safetyValidator.js          # Per-meal safety gate
│   │   │   └── diseaseEngine.js            # Orchestrator
│   │   ├── ai/                             # LLM integration layer
│   │   │   ├── aiClient.js                 # HTTP client for LM Studio
│   │   │   ├── promptBuilder.js            # Prompt construction + sanitizePromptInput (exported)
│   │   │   ├── mealGenerator.js            # Generation with retry + sanitization
│   │   │   └── concurrency.js              # Concurrent generation limiter
│   │   ├── rag/                            # RAG (Retrieval-Augmented Generation) layer
│   │   │   ├── embeddingClient.js          # LM Studio embedding API client
│   │   │   ├── vectorStore.js              # ChromaDB client wrapper
│   │   │   ├── retriever.js                # High-level retrieval logic
│   │   │   ├── ragContextBuilder.js        # Format + sanitize retrieved content
│   │   │   └── indexer.js                  # Index knowledge base into ChromaDB
│   │   ├── mealValidationService.js        # Post-generation logical validation
│   │   ├── mealPlanPurposeService.js       # Purpose-level rules: contraindications, weightGoal mapping, Apple Watch TDEE override
│   │   └── shoppingListService.js          # Shopping list aggregation
│   ├── data/
│   │   ├── diseaseCatalog.js               # 10 diseases (4 supported + 6 unsupported), indicators, supported flag
│   │   └── knowledgeBase/                  # Curated reference data (Vietnamese, version controlled)
│   │       ├── recipes.json                # 35 Vietnamese reference recipes
│   │       ├── diseaseGuidelines.json      # 4 disease dietary guidelines (Vietnamese)
│   │       └── ingredients.json            # 46 ingredients (Vietnamese names, disease safety flags)
│   └── utils/
│       ├── AppError.js                     # Custom error class + factory functions
│       └── logger.js                       # Winston logger
├── scripts/
│   └── indexKnowledgeBase.js               # CLI: index knowledge base into ChromaDB
├── tests/                                  # Vitest test suite
│   └── unit/
│       ├── services/
│       │   ├── nutrition/                  # Nutrition engine tests
│       │   ├── disease/                    # Disease engine tests
│       │   └── rag/                        # RAG layer tests (ragContextBuilder, retriever)
│       ├── validators/
│       │   ├── auth.validator.test.js      # Password policy, register/login/updateProfile schemas
│       │   └── mealPlan.schema.test.js     # AJV schema validation for AI output
│       └── data/
│           └── knowledgeBase.test.js       # Validates knowledge base JSON integrity
├── requirement/                            # Phase requirement docs (Phase 1–6)
├── docker-compose.rag.yml                  # ChromaDB Docker setup
├── package.json
└── CLAUDE.md
```

### Module Interaction Map

```
[HTTP Request]
     │
     ▼
[Middleware Stack: helmet → cors → rate-limiter → requestLogger → JSON parser]
     │
     ▼
[Route] → [validate middleware (Joi)] → [auth middleware (JWT)]
     │
     ▼
[mealplan.controller.js]
     │
     ├─→ [Nutrition Engine]    — pure functions, no side effects
     ├─→ [Disease Engine]      — caps macros, builds ingredient lists
     ├─→ [RAG Retriever]       — queries ChromaDB for similar meals + guidelines
     │       │
     │       ├─→ [embeddingClient] — LM Studio /v1/embeddings
     │       └─→ [vectorStore]    — ChromaDB query
     │
     ├─→ [ragContextBuilder]   — formats retrieved docs into prompt string
     ├─→ [AI Layer]            — prompts LLM with context, sanitizes response
     │       │
     │       ├─→ [promptBuilder]  — injects nutrients + restrictions + RAG context
     │       └─→ [aiClient]      — LM Studio /v1/chat/completions
     │
     ├─→ [Validators]          — AJV schema + logical consistency
     └─→ [Mongoose Models]     — persist to MongoDB
     │
     ▼
[errorHandler middleware] ← catches all thrown AppError / unexpected errors
```

**Important:** RAG failure at any point does NOT block generation. `ragContextByMealType` falls back to `{}` silently and meals are generated without retrieved context.

---

## 3. AI Model Usage

### Two AI Endpoints — One LM Studio Server

Phase 6 introduced a second AI endpoint. The system now uses LM Studio for **both** creative generation and semantic embedding:

| Purpose | Endpoint | Model | Notes |
|---------|----------|-------|-------|
| Meal generation (creative text) | `LM_STUDIO_URL` (`/v1/chat/completions`) | Any chat model | Generates name, description, ingredients, benefits |
| Embedding (semantic search) | `LM_STUDIO_EMBEDDING_URL` (`/v1/embeddings`) | `nomic-embed-text` | Converts query text to 768-dim vector for ChromaDB lookup |

Both run locally via LM Studio. No cloud AI APIs are used.

### No Training — Pure Prompt Engineering + Retrieval

The project does **not train, fine-tune, or adapt** any AI model. All intelligence comes from:
1. Structured prompt templates with constraints
2. A curated knowledge base (version-controlled JSON files in `src/data/knowledgeBase/`)
3. Semantic retrieval via embeddings + ChromaDB vector search

### What the AI Generates (Unchanged from Phase 5)

The LLM is used exclusively as a **creative text generator** for meal content:
- Meal name
- Description
- Ingredient list (names only, no quantities)
- Health benefits

All numerical nutritional values (calories, protein, carbs, fat) are **computed deterministically by the backend** and injected into the saved plan. The AI cannot output numeric nutrition data — any numeric fields in the AI response are stripped by the sanitizer before use.

### LM Studio Chat Integration

```javascript
// src/services/ai/aiClient.js
POST http://localhost:1234/v1/chat/completions
{
  model: "local-model",
  messages: [{ role: "user", content: <built prompt> }],
  temperature: 0.7,
  max_tokens: 800,
  stream: false
}
```

- **Timeout:** 30 seconds per call
- **Max response size:** 50 KB guard
- **Response parsing:** Strips markdown fences, extracts balanced JSON object

### LM Studio Embedding Integration

```javascript
// src/services/rag/embeddingClient.js
POST http://localhost:1234/v1/embeddings
{
  model: "nomic-embed-text",
  input: "lunch meal for lose-weight goal vietnamese cuisine"
}
// Response: { data: [{ embedding: [0.021, -0.192, 0.040, ...] }] }  // 768-dim vector
```

- **Timeout:** 10 seconds per call (shorter — embeddings are fast)
- **Text normalization:** trim → lowercase → collapse whitespace (before embedding)

### Why `nomic-embed-text` for Embeddings

The RAG layer requires an **embedding model** — a model that converts text into fixed-length numerical vectors (arrays of numbers) for semantic similarity search. This is fundamentally different from a **chat model** (like Llama or Mistral) that generates text responses.

**Why an embedding model is needed:**
- When indexing (`npm run rag:index`), each recipe, disease guideline, and ingredient from the knowledge base is converted into a 768-dimensional vector and stored in ChromaDB
- At query time, the user's meal request is converted into a vector using the same model, and ChromaDB finds the most semantically similar stored vectors
- A chat model cannot do this — it produces text, not vectors suitable for similarity search

**Why `nomic-embed-text` specifically:**
1. **LM Studio compatibility** — it is one of the most widely supported embedding models in LM Studio's model library, easy to download and run locally
2. **Lightweight** — approximately 274MB, small enough to run alongside a chat model on consumer hardware without competing for GPU memory
3. **Strong retrieval quality** — produces 768-dimensional vectors with competitive performance on retrieval benchmarks (MTEB), providing accurate semantic matching for recipe and guideline search
4. **Open source & local-first** — no API keys or external cloud services required, consistent with the project's design philosophy of running everything locally via LM Studio
5. **Stable API format** — follows the OpenAI-compatible `/v1/embeddings` endpoint format that LM Studio exposes, requiring no custom integration code
- **Graceful degradation:** returns `null` on failure; caller skips retrieval

---

## 4. RAG Layer (Phase 6)

### Why RAG?

Before Phase 6, the LLM generated meals purely from scratch with no grounding in real-world recipes. This led to:
- **Hallucinated ingredient combinations** (e.g., salmon with chocolate sauce)
- **Culturally inaccurate dishes** (e.g., "Vietnamese" meals with no Vietnamese ingredients)
- **Shallow disease-awareness** — the LLM would often suggest borderline ingredients even when disease conditions were mentioned

The fix: before building the AI prompt, **retrieve the 3 most semantically similar reference meals** and **relevant disease guidelines** from ChromaDB and inject them as inspiration context.

### Architecture

```
Per-MealType RAG Pipeline:

"breakfast meal for diabetes goal vietnamese cuisine"
     │
     ▼ embeddingClient.getEmbedding()
[768-dim query vector]
     │
     ▼ vectorStore.queryDocuments(RECIPES, vector, { nResults: 3, where: { mealType: 'breakfast' } })
[Top 3 similar recipes from ChromaDB]
     │
     ▼ (in parallel)
"dietary guidelines for diabetes"
     │
     ▼ vectorStore.queryDocuments(GUIDELINES, vector, { where: { disease: 'diabetes' } })
[Diabetes guideline document]
     │
     ▼ ragContextBuilder.buildMealContext(meals, guidelines)
[Sanitized, capped string ≤1500 chars]
     │
     ▼ injected into buildMealPrompt() as `retrievedContext`
[Prompt sent to LLM with grounding context]
```

### Knowledge Base Files (`src/data/knowledgeBase/`)

These are **version-controlled JSON files** — the source of truth for the knowledge base. Any update to them requires re-running `npm run rag:index` to sync ChromaDB.

#### `recipes.json` — 35 reference recipes

Each recipe has:
```json
{
  "id": "rec_001",
  "name": "Oatmeal with Mixed Berries and Chia Seeds",
  "mealType": "breakfast",            // breakfast | lunch | dinner | snack
  "cuisine": "western",               // western | vietnamese | asian | mediterranean
  "goal": ["lose-weight", "improve-health"],
  "diseaseCompatible": ["diabetes", "hypertension"],
  "ingredients": ["rolled oats", "blueberries", "chia seeds", "almond milk", "cinnamon"],
  "description": "A fiber-rich, low glycemic breakfast...",
  "tags": ["high-fiber", "low-glycemic", "dairy-free"]
}
```

Coverage: all 4 mealTypes, all 3 goals (`lose-weight`, `gain-weight`, `improve-health`), all 4 diseases, 4 cuisines (western, vietnamese, asian, mediterranean).

#### `diseaseGuidelines.json` — 4 disease guidelines

Each document:
```json
{
  "id": "guide_diabetes",
  "disease": "diabetes",
  "summary": "Focus on low glycemic index foods...",
  "recommendedFoods": ["brown rice", "quinoa", "leafy greens", "berries", ...],
  "avoidFoods": ["white bread", "sugary drinks", "candy", ...],
  "mealTips": [
    "Pair carbs with protein to slow glucose absorption",
    "Choose whole grains over refined grains",
    ...
  ]
}
```

Covers: `diabetes`, `kidney-disease`, `high-uric-acid`, `hypertension`.

#### `ingredients.json` — 46 ingredient reference entries

Each ingredient:
```json
{
  "id": "ing_001",
  "name": "quinoa",
  "category": "grains",              // produce | protein | dairy | grains | pantry | other
  "aliases": ["quinua"],
  "safeFor": ["diabetes", "hypertension", "high-uric-acid"],
  "avoidFor": [],
  "nutritionProfile": "complete protein grain, all essential amino acids, low glycemic index",
  "substitutes": ["brown rice", "buckwheat", "bulgur"]
}
```

Covers all food categories. All `safeFor`/`avoidFor` values reference the 4 supported disease names.

### RAG Service Files (`src/services/rag/`)

#### `embeddingClient.js`

Responsibility: convert text to embedding vectors via LM Studio.

```javascript
// Exports:
getEmbedding(text)           // single text → float[] | null
getEmbeddingBatch(texts)     // string[] → float[][] | null

// Behaviour:
// - Normalizes text: trim → lowercase → collapse whitespace
// - 10s AbortController timeout
// - Returns null on any failure (network error, timeout, bad response)
// - Logs warning on failure; never throws
```

#### `vectorStore.js`

Responsibility: wrap ChromaDB client for upsert and query operations.

```javascript
// Exports:
initializeCollection(name)                          // getOrCreateCollection
upsertDocuments(name, [{ id, embedding, metadata, document }])
queryDocuments(name, queryEmbedding, { nResults, where })  // returns null on failure
deleteCollection(name)
healthCheck()                                       // returns boolean

// Important implementation notes:
// - Uses host/port/ssl constructor (not deprecated 'path')
// - Passes NO_OP_EMBEDDING_FUNCTION to suppress DefaultEmbeddingFunction error
//   (we always supply our own embeddings — the no-op is never actually called)
// - ChromaDB v1.0.0 (v2 API) — deployed via docker-compose.rag.yml
// - COLLECTIONS constant: { RECIPES: 'recipes', GUIDELINES: 'guidelines', INGREDIENTS: 'ingredients' }
```

#### `retriever.js`

Responsibility: high-level retrieval — compose embeddingClient + vectorStore.

```javascript
// Exports:
retrieveRelevantMeals({ mealType, goal, diseases, cuisine, favoriteMeal, nResults })
// → builds query string from non-null params, embeds it, queries RECIPES with mealType filter
// → returns raw ChromaDB result | null

retrieveDiseaseGuidelines(diseases)
// → one query per unique disease, filtered by { disease: name }
// → returns array of raw ChromaDB results (one per disease)

retrieveIngredientInfo(ingredientNames)
// → embeds joined ingredient names, queries INGREDIENTS
// → returns raw ChromaDB result | null

// RAG_ENABLED check: if process.env.RAG_ENABLED === 'false', all functions return [] or null immediately
```

> **Note on disease filter:** ChromaDB does not support `$in` operator on string-array metadata fields. So the recipe query filters only by `mealType` (equality). Disease-compatibility post-filtering is left to the prompt ("use as inspiration"), not enforced programmatically.

#### `ragContextBuilder.js`

Responsibility: format retrieved ChromaDB results into a safe, prompt-injectable string.

```javascript
// Exports:
buildMealContext(retrievedMeals, retrievedGuidelines)
// → returns string (max 1500 chars) | empty string if nothing retrieved

// Output format example:
// "Reference meals (use as inspiration, do NOT copy exactly):
//  1. Grilled Salmon: salmon fillet, broccoli, lemon. A light protein meal.
//  2. Oatmeal Bowl: rolled oats, berries, chia seeds. High-fiber breakfast.
//  Dietary guidelines to follow:
//  - diabetes: Pair carbs with protein to slow glucose absorption.
//  - diabetes: Choose whole grains over refined grains."

// Security measures:
// - sanitizePromptInput() applied to every string field (imported from promptBuilder.js — NOT duplicated)
// - Adversarial keyword detection: strips any text containing
//   "ignore", "forget", "system", "assistant", "human", "instruction", "override" (case-insensitive)
// - Per-meal entry cap: 200 chars
// - Per-guideline tip cap: 150 chars
// - Total output hard cap: 1500 chars (truncated at last complete line)
```

#### `indexer.js`

Responsibility: one-time and incremental indexing of JSON files into ChromaDB.

```javascript
// Exports:
indexAllCollections()    // indexes all three files concurrently, returns { recipes, guidelines, ingredients, errors }
indexRecipes()           // reads recipes.json, batches of 10, upserts to RECIPES
indexGuidelines()        // reads diseaseGuidelines.json, upserts to GUIDELINES
indexIngredients()       // reads ingredients.json, batches of 10, upserts to INGREDIENTS

// Document string format (what gets embedded + stored):
// Recipe:    "{name}. {mealType} for {goal}. Ingredients: {ingredients}. {description}"
// Guideline: "{disease}: {summary}. Tips: {mealTips}"
// Ingredient: "{name} ({aliases}). {nutritionProfile}. Safe for: {safeFor}."

// Metadata stored (flat, ChromaDB requirement — no nested objects or arrays):
// Recipe:    { name, mealType, cuisine, goal: "lose-weight,improve-health", diseaseCompatible: "diabetes,hypertension", tags: "..." }
// Guideline: { disease, type: 'guideline' }
// Ingredient:{ name, category, safeFor: "diabetes,hypertension", avoidFor: "" }
```

### How RAG Context Appears in the Prompt

`promptBuilder.js` injects the RAG context **between** the user preferences block and the STRICT RULES block:

```
You are a professional nutritionist. Generate ONE creative breakfast meal...

User Preferences:
- Goal: lose-weight
- Diet: balanced
...

REFERENCE CONTEXT (inspiration only — do not copy):         ← RAG context starts here
Reference meals (use as inspiration, do NOT copy exactly):
1. Oatmeal with Mixed Berries: rolled oats, blueberries, chia seeds. Fiber-rich breakfast.
2. Tofu Scramble: firm tofu, bell pepper, spinach, turmeric. Plant-based scramble.
Dietary guidelines to follow:
- diabetes: Pair carbs with protein to slow glucose absorption.
                                                             ← RAG context ends here
STRICT RULES:
1. Return JSON ONLY — no code blocks, no markdown...
```

Context is skipped entirely if `retrievedContext` is empty or null (e.g., ChromaDB is down).

### Infrastructure

```yaml
# docker-compose.rag.yml
services:
  chromadb:
    image: chromadb/chroma:latest   # v1.0.0, uses /api/v2 endpoint
    ports: ["8000:8000"]
    volumes: [chroma_data:/chroma/chroma]
    environment:
      IS_PERSISTENT: "TRUE"         # data survives container restart
      PERSIST_DIRECTORY: /chroma/chroma
    restart: unless-stopped
```

Scripts:
```bash
npm run rag:start   # docker-compose up -d
npm run rag:stop    # docker-compose down
npm run rag:index   # node scripts/indexKnowledgeBase.js
```

---

## 5. API Layer

### 5.1 Auth APIs

#### POST `/api/auth/register`
- **Input:** `{ email, password, username?, fullName?, phone?, birthday?, gender?, height?, currentWeight? }`
- **Password policy:** min 8 characters, must contain at least one uppercase letter, one lowercase letter, and one digit
- **Action:** Creates user, hashes password with bcrypt, issues JWT access token (15 min) + refresh token (30 days). `height` and `currentWeight` are persisted on the User document and automatically pre-fill those fields when the user later creates a health profile.
- **Response:** `{ user: { id, email, username, role, height, currentWeight }, accessToken, refreshToken }`
- **JWT payload:** `{ id, email, role }` — `role` is included so route handlers can perform role-based checks without an extra DB query

#### POST `/api/auth/login`
- **Input:** `{ email, password }`
- **Action:** Verifies password with bcrypt, rotates refresh token, issues new tokens
- **Rate limited:** 5 attempts per 15 minutes via `loginLimiter`

#### POST `/api/auth/logout`
- **Input:** `{ refreshToken }` + `Authorization: Bearer <accessToken>`
- **Action:** Blacklists access token in `TokenBlacklist` (auto-expires via TTL index), removes refresh token from user record

#### GET `/api/auth/profile`
- **Response:** `{ id, email, username, fullName, phone, birthday, gender, height, currentWeight, role, createdAt }`

#### PUT `/api/auth/profile`
- **Input:** Any subset of `{ username, fullName, phone, birthday, gender }`

#### POST `/api/auth/refresh-token`
- **Input:** `{ refreshToken }`
- **Response:** `{ accessToken }`

#### POST `/api/auth/revoke-token`
- **Input:** `{ refreshToken }`
- **Action:** Removes specific refresh token from user's token list

#### DELETE `/api/auth/:id`
- **Input:** User ID in path + Bearer token (admin or own account)

---

### 5.2 Health Profile APIs

#### POST `/api/health-profile` / PUT `/api/health-profile`
- **Input:** `{ goal, triedHealthyBefore?, hungryTime?, favoriteMeal?, activityLevel?, averageDay?, workSchedule?, sleepDuration?, diseases?, dietPreference?, mealsPerDay?, cuisinePreference? }`
- **Note:** `desiredWeight` is **not** part of this resource — it is now a request-scoped field on `POST /api/meal-plans/generate` (purpose=weight_management). `gender`, `birthday`, `height`, `currentWeight` come from the User account at registration time and are not editable here.
- **`diseases` shape:** array of `{ key, diagnosedAt?, indicators: [{ key, value, unit?, measuredAt?, note? }] }`. Disease keys, indicator keys, "indicator belongs to disease", and duplicates are cross-checked against `src/data/diseaseCatalog.js` after Joi validation. Indicator units are snapshotted from the catalog at write time so historical records stay interpretable if catalog units change.
- **Action:** POST creates or upserts; PUT is the same handler — accepts partial payloads (omitted fields preserved). Arrays like `diseases` are replaced wholesale, so the frontend should send the complete array, not a delta.
- **Usage:** Profile is the foundation for all meal plan generation

#### GET `/api/health-profile`
- **Response:** Full health profile document

#### DELETE `/api/health-profile`

---

### 5.2b Disease Catalog API

#### GET `/api/diseases`
- **Response:** Full disease catalog from `src/data/diseaseCatalog.js`. Each entry: `{ key, name, supported, relatedIndicators: [{ key, name, unit, normalRange }] }`. The frontend health-profile screen calls this to populate the disease picker and indicator entry form. `key` is the stable identifier the frontend submits back in `POST /api/health-profile`.

---

### 5.3 Meal Plan APIs

#### POST `/api/meal-plans/generate` ⭐ (Core endpoint, **purpose-driven**)
- **Input:** Bearer token + JSON body with required `purpose` field. The body schema is **purpose-aware** (Joi `when()`):

| `purpose` | Required body | Behavior |
|---|---|---|
| `daily_health_based` | optional `healthSnapshot` (Apple Watch / HealthKit: `restingEnergyKcal`, `activeEnergyKcal`, `steps`, `heartRateAvg`, `sleepHours`, `measuredAt`) | Generates a **single day**. If both resting + active energy are present, they override the BMR-based TDEE calculation entirely. |
| `weight_management` | required `weightGoal` (`lose-weight \| gain-weight \| muscle-gain`), `desiredWeight` (kg), `durationWeeks` (1\|2\|4) | Generates a 1/2/4-week plan. Returns **HTTP 400 + `reason: weight_goal_contraindication`** if `weightGoal` is medically incompatible with the user's recorded conditions. `muscle-gain` maps internally to engine goal `gain-weight` (the macro calculator already biases protein high enough for muscle accrual). |
| `disease_based` | required `durationWeeks` (1\|2\|4) | Generates a 1/2/4-week plan focused on managing existing conditions. Engine goal is **forced to `improve-health`** regardless of profile goal. Requires ≥1 disease on the profile. |

- **Contraindication map** (`mealPlanPurposeService.js`):
  - `gain-weight` blocked by: `obesity`, `high-cholesterol`, `heart-disease`, `hypertension`
  - `muscle-gain` blocked by: `kidney-disease`, `high-uric-acid`
  - `lose-weight` blocked by: `anemia`
  - The check uses **all** disease keys on the profile (supported + unsupported by the macro engine) — e.g. `obesity` is unsupported by the macro engine but still blocks `gain-weight`.
- **Action:** Full generation pipeline (see Section 8 for detailed flow). Persists the request `purpose` on the resulting `MealPlan` document. For `daily_health_based`, persisted `duration` is `{ weeks: 0, totalDays: 1 }`.
- **Example request bodies:**
```json
// daily_health_based
{
  "purpose": "daily_health_based",
  "healthSnapshot": {
    "restingEnergyKcal": 1600,
    "activeEnergyKcal": 450,
    "steps": 8200,
    "sleepHours": 7
  }
}

// weight_management
{
  "purpose": "weight_management",
  "weightGoal": "muscle-gain",
  "desiredWeight": 72,
  "durationWeeks": 4
}

// disease_based
{
  "purpose": "disease_based",
  "durationWeeks": 2
}
```
- **Response:**
```json
{
  "ok": true,
  "mealPlan": {
    "_id": "...",
    "purpose": "weight_management",
    "title": "4-Week Meal Plan",
    "duration": { "weeks": 4, "totalDays": 28 },
    "days": [
      {
        "day": 1,
        "totalCalories": 1800,
        "macros": { "protein": 140, "carbs": 180, "fat": 50 },
        "meals": [
          {
            "mealType": "breakfast",
            "calories": 450,
            "macros": { "protein": 35, "carbs": 45, "fat": 12 },
            "name": "Phở gà ức nướng",
            "description": "...",
            "ingredients": ["ức gà", "bánh phở", "rau thơm"],
            "benefits": ["Giàu protein", "Carb phức"]
          }
        ]
      }
    ]
  },
  "disclaimer": "This meal plan is generated by AI..."  // only when diseases present
}
```
- **Error responses:**
  - `400` — Joi validation failed, health profile missing required fields, OR weight goal contraindicated:
    ```json
    {
      "message": "Weight goal \"gain-weight\" is medically contraindicated by your recorded conditions.",
      "reason": "weight_goal_contraindication",
      "conflicts": ["obesity", "hypertension"]
    }
    ```
  - `404` — Health profile not found
  - `500` — Generation failed (AI error, safety validation failed, or infeasible disease combination)

#### GET `/api/meal-plans/latest`
- **Action:** Returns most recently created meal plan for user

#### GET `/api/meal-plans`
- **Input:** Optional `?limit=10&skip=0`
- **Response:** `{ mealPlans: [...], total, limit, skip }`

#### POST `/api/meal-plans/:planId/swap`
- **Input:** `{ day, mealIndex }`
- **Action:** Regenerates a single meal using the same nutrition targets. Limited to 5 swaps per plan.
- **Response:** `{ ok: true, swapCount, swappedMeal }`

#### GET `/api/meal-plans/:planId/shopping-list`
- **Input:** Optional `?startDay=1&endDay=7`
- **Response:**
```json
{
  "ok": true,
  "shoppingList": {
    "totalItems": 42,
    "dayRange": { "start": 1, "end": 7 },
    "categories": {
      "Produce": ["spinach", "broccoli"],
      "Protein": ["chicken breast", "salmon"],
      "Dairy": ["greek yogurt"],
      "Grains": ["quinoa", "brown rice"],
      "Pantry": ["olive oil", "garlic"],
      "Other": [...]
    }
  }
}
```

#### DELETE `/api/meal-plans/:id`
#### DELETE `/api/meal-plans` (deletes all plans for user)

---

### 5.4 Recipe APIs — REMOVED

The orphaned `/api/recipes` resource (model, controller, routes, validator, tests) was deleted in 2026-04. It had no production data, no frontend usage, and no roadmap. The "recipes" referenced elsewhere in this document (knowledge base, RAG indexer collection, etc.) refer to `src/data/knowledgeBase/recipes.json`, which is a separate concern.

---

### 5.5 Favorites APIs

#### POST `/api/favorites` — `{ targetType: "meal-plan", targetId, note? }`
#### GET `/api/favorites` — `?targetType=&page=&limit=`
#### GET `/api/favorites/check` — `?targetType=&targetId=` → `{ isFavorited: true|false }`
#### DELETE `/api/favorites/:id`

(Note: `targetType` enum was reduced to `['meal-plan']` after the recipe removal.)

---

### 5.6 Health Check

#### GET `/api/health` → `{ status: "ok", timestamp: "..." }`

---

## 6. Data Processing

### MongoDB Storage Architecture

| Model | Key Fields | Indexes |
|-------|-----------|---------|
| `User` | email, password (bcrypt), gender, birthday, height, currentWeight, refreshTokens[] | email (unique) |
| `HealthProfile` | userId, gender (snapshot), age (derived), goal, diseases[] (subdocument array of `{ key, diagnosedAt, indicators[] }`) | userId (unique) |
| `MealPlan` | userId, **purpose** (`daily_health_based\|weight_management\|disease_based`), days[], swapHistory, swapCount, duration | userId + createdAt (compound) |
| `Favorite` | userId, targetType (`'meal-plan'` only), targetId | userId+targetType+targetId (unique compound) |
| `TokenBlacklist` | token, expiresAt | token (unique), expiresAt (TTL — auto-delete) |

### Data Transformation Pipeline for Meal Plans

1. **Input Validation (Joi):** Health profile fields validated against schema
2. **Nutrition Calculation:** Pure functions produce `{ calorieTarget, macros, mealDistribution }`
3. **Disease Adjustment:** Macros capped; ingredient restriction lists built
4. **RAG Retrieval:** Per mealType — embed query → ChromaDB lookup → format context string
5. **AI Generation:** LLM receives prompts with grounding context, returns raw text with JSON-like content
6. **Response Sanitization:** `sanitizeResponse()` strips all numeric fields from AI output
7. **Schema Validation (AJV):** Strict JSON schema confirms structure and required fields
8. **Logical Validation:** Calorie sum and macro arithmetic checked with 1% tolerance
9. **Merge:** Backend-calculated macros merged into AI-generated creative content
10. **Safety Validation:** Each meal scanned for forbidden ingredients; unsafe meals regenerated
11. **Persistence:** Assembled plan saved to MongoDB with full metadata

### Shopping List Processing

- Iterates all meals across requested day range
- Aggregates ingredient strings into a flat array
- Applies keyword-based categorization
- Deduplicates and returns structured category map

---

## 7. User Input Handling

### Input Collection Points

| Route | Validator | Schema |
|-------|-----------|--------|
| `POST /auth/register` | Joi | `registerSchema` |
| `POST /auth/login` | Joi | `loginSchema` |
| `PUT /auth/profile` | Joi | `updateProfileSchema` |
| `POST /health-profile` / `PUT /health-profile` | Joi + catalog cross-check | `healthProfileSchema` + `validateDiseasesAgainstCatalog()` |
| `POST /meal-plans/generate` | Joi (purpose-aware via `Joi.when()`) | `generateMealPlanSchema` |

### Health Profile Constraints

```
goal:          'lose-weight' | 'gain-weight' | 'improve-health'   (default: improve-health)
activityLevel: 'sedentary' | 'lightly-active' | 'moderately-active' | 'very-active' | 'extremely-active'
mealsPerDay:   1–6
sleepDuration: 0–24 (hours)
diseases:      [{ key, diagnosedAt?, indicators: [{ key, value, unit?, measuredAt?, note? }] }]
               — disease keys cross-checked against src/data/diseaseCatalog.js (10 keys total)
               — indicator keys cross-checked against the disease's relatedIndicators
               — duplicate disease keys and duplicate indicator keys rejected
cuisinePreference: array (max 10)
```

**Auto-populated from User account (not editable on health profile):** `gender`, `age` (derived from birthday), `height`, `currentWeight`.

**Removed (now request-scoped):** `desiredWeight` is supplied to `POST /api/meal-plans/generate` (purpose=weight_management), not stored on the profile.

### Meal Plan Generate Constraints

```
purpose:       'daily_health_based' | 'weight_management' | 'disease_based'   (REQUIRED)

# weight_management only — all required when purpose=weight_management, forbidden otherwise
weightGoal:    'lose-weight' | 'gain-weight' | 'muscle-gain'
desiredWeight: 20–500 (kg)
durationWeeks: 1 | 2 | 4

# disease_based only
durationWeeks: 1 | 2 | 4   (required)

# daily_health_based only — optional Apple Watch / HealthKit telemetry
healthSnapshot: {
  activeEnergyKcal:  0–8000,
  restingEnergyKcal: 0–5000,
  steps:             integer ≥0,
  heartRateAvg:      20–250,
  sleepHours:        0–24,
  measuredAt:        date
}
```

### Input Sanitization for AI Prompts

`sanitizePromptInput()` in `promptBuilder.js` (exported for reuse by `ragContextBuilder.js`):

```javascript
export function sanitizePromptInput(value, maxLen = 100) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\n\r\t]/g, ' ')   // strip newlines
    .replace(/\s+/g, ' ')         // collapse whitespace
    .slice(0, maxLen)              // length limit
    .trim();
}
```

**RAG-specific additional sanitization** in `ragContextBuilder.js`:
- Applies `sanitizePromptInput()` to every field from retrieved documents
- Strips any text containing adversarial keywords: `ignore`, `forget`, `system`, `assistant`, `human`, `instruction`, `override`
- Hard cap: 1500 characters total output

---

## 8. AI Techniques

| Technique | Used? | Details |
|-----------|-------|---------|
| **Prompt Engineering** | ✅ Yes | Primary technique. Structured templates with explicit constraints and JSON format instructions |
| **Prompt Templates** | ✅ Yes | `buildMealPrompt()` with parameterized slots for nutrition targets, restrictions, preferences, RAG context |
| **Prompt Injection Prevention** | ✅ Yes | User input sanitized before insertion; RAG content additionally checked for adversarial keywords |
| **Error-Feedback Prompting** | ✅ Yes | Failed validation reasons injected into retry prompts via `errorFeedback` param |
| **Retrieval-Augmented Generation (RAG)** | ✅ Yes | ChromaDB vector search retrieves similar reference meals + disease guidelines; injected as prompt context |
| **Embeddings** | ✅ Yes | `nomic-embed-text` via LM Studio generates 768-dim vectors for semantic similarity search |
| **Fine-tuning** | ❌ No | No model training or adaptation |
| **Few-shot Examples** | ✅ Partial | RAG effectively provides dynamic few-shot examples drawn from the knowledge base |
| **Chain-of-Thought** | ❌ No | Model told to output JSON directly, not reasoning steps |
| **Tool Use / Function Calling** | ❌ No | Raw text completion, JSON parsed manually |
| **Streaming** | ❌ No | `stream: false`, synchronous response |

### Key AI Design Constraint (Unchanged)

The system is deliberately designed so the AI **cannot affect nutrition values**. All calories and macros are calculated before the AI is called and injected post-generation:

```javascript
// src/services/ai/mealGenerator.js
const FORBIDDEN_NUMERIC_FIELDS = ['calories', 'macros', 'protein', 'carbs', 'fat', 'totalCalories']
function sanitizeResponse(parsed) {
  for (const field of FORBIDDEN_NUMERIC_FIELDS) {
    if (field in parsed) throw new Error(`AI included forbidden field: ${field}`)
  }
  return { name, description, ingredients, benefits } // only these 4
}
```

This rule also applies to the knowledge base: `recipes.json` contains **no calorie or macro numbers** — only ingredient names, descriptions, and tags. The RAG context cannot introduce numeric nutrition values into the prompt.

---

## 9. End-to-End System Flow

### Full Pipeline: User Input → Stored Meal Plan

```
Step 1: Authentication
  POST /api/auth/login
  → JWT access token issued (15 min expiry)
  → Refresh token stored in User.refreshTokens[]

Step 2: Health Profile Setup
  POST /api/health-profile  (or PUT to update)
  → Joi validation
  → Catalog cross-check (validateDiseasesAgainstCatalog): disease key exists,
    indicator key belongs to disease, no duplicates
  → Snapshot indicator units from catalog (snapshotIndicatorUnits)
  → Upserted to HealthProfile collection (one per user)

Step 3: Meal Plan Generation
  POST /api/meal-plans/generate
  → Joi validation (purpose-aware via Joi.when)

  [3a] Fetch health profile from MongoDB
       gender / age / height / currentWeight come from the User account
       (set at registration); profile is rejected if any are missing.

  [3a.1] Purpose branching (mealPlanPurposeService):
       purpose=daily_health_based →
         templateDays = 1
         requestedWeeks = 1
         tdeeOverride = restingEnergyKcal + activeEnergyKcal (if both present)
       purpose=weight_management →
         checkWeightGoalContraindications(weightGoal, allDiseaseKeys)
           → if blocked: HTTP 400 + reason: weight_goal_contraindication
         goalOverride = mapWeightGoalToEngineGoal(weightGoal)  // muscle-gain → gain-weight
         requestedWeeks = durationWeeks
       purpose=disease_based →
         require ≥1 disease on profile, else HTTP 400
         goalOverride = 'improve-health'
         requestedWeeks = durationWeeks

  [3b] Nutrition Engine (deterministic):
       generateNutritionPlan(profile, { goalOverride, tdeeOverride })
       BMR = 10×weight + 6.25×height − 5×age ± constant
       TDEE = tdeeOverride ?? BMR × activityFactor
       calorieTarget = TDEE × goalMultiplier (clamped 1200–4000)
       macros = { protein: weight×1.8g, fat: 25%, carbs: remainder }
       mealDistribution = split across mealsPerDay (30/40/30 for 3 meals)
       duration = calculatePlanDuration({ goal, currentWeight, desiredWeight, requestedWeeks })
                  → if requestedWeeks set, weeks = requestedWeeks (bypass weight-delta math)
                  → otherwise weeks = |currentWeight − desiredWeight| / weekly rate (clamped 1–52)

  [3c] Disease Engine (if diseases present):
       For each disease → load rules from diseaseRules.js
       Apply strictest cap across all diseases (e.g., protein ≤ 0.8g/kg for kidney disease)
       Redistribute excess calories to uncapped macros
       Re-clamp after redistribution
       Feasibility check: if adjusted calories drift >10% from target → throw error
       Recalculate meal distribution from adjusted macros
       Build forbiddenIngredients[], limitedIngredients[], preferredIngredients[]

  [3d] RAG Retrieval (NEW in Phase 6):
       Collect unique mealTypes from nutritionPlan.mealDistribution
       For each mealType (e.g. "breakfast", "lunch"):
         Build Vietnamese query string via internal EN→VI maps:
           "món bữa sáng cho mục tiêu lose-weight ẩm thực Việt Nam pho"
         → getEmbedding(queryString) via LM Studio /v1/embeddings (bge-m3, 1024-dim vector)
         → queryDocuments(RECIPES, vector, { nResults: 3, where: { mealType } })
         In parallel:
         → getEmbedding("dietary guidelines for diabetes")
         → queryDocuments(GUIDELINES, vector, { where: { disease } }) (one per disease)
         → buildMealContext(meals, guidelines)
           → sanitize, strip adversarial content, cap at 1500 chars
           → result: ragContextByMealType["breakfast"] = "Reference meals: ..."
       If any step throws → log warning, ragContextByMealType = {} (generation continues)

  [3e] Concurrent AI Generation (per meal, up to 3 concurrent):
       For each day (1–7) × each meal:
         Build prompt: buildMealPrompt({
           mealType, calories, protein, carbs, fat, goal,
           dietPreference, cuisinePreference, diseases,
           forbiddenIngredients, limitedIngredients, preferredIngredients,
           retrievedContext: ragContextByMealType[mealType] ?? null  ← RAG injection
         })
         Call LM Studio: POST /v1/chat/completions (30s timeout)
         Parse response: strip markdown → extract JSON
         Sanitize: reject any numeric fields

         [3e-retry] If generation fails:
           Inject errorFeedback into prompt, retry (max 2 attempts)

  [3f] Safety Validation (per meal):
       For each ingredient in AI response:
         Check against forbiddenIngredients using Unicode-aware lookaround regex
         (?<![\p{L}\p{N}])sugar(?![\p{L}\p{N}]) with iu flags
         — "đường" matches but "đường phèn" still tokenizes correctly across diacritics
         — Critical: JS \b is ASCII-only and silently breaks on Vietnamese chars,
           so the previous \b implementation was replaced with Unicode property escapes
       If unsafe: regenerate meal (up to 2 regen attempts per meal)

  [3g] Schema Validation (AJV):
       Validate assembled plan against strict mealPlan.schema.js
       Required: days[], each day has meals[], each meal has name/description/ingredients/benefits

  [3h] Logical Validation:
       Sum of meal calories ≈ day.totalCalories (±1% tolerance)
       protein×4 + carbs×4 + fat×9 ≈ totalCalories (±1% tolerance)

  [3i] Replicate template across plan duration:
       — daily_health_based: templateDays=1, replicates to 1 day total
       — weight_management / disease_based: templateDays=7, replicates to durationWeeks×7 days

  [3j] Persist to MongoDB:
       MealPlan saved with full days/meals tree, purpose, duration, swapCount: 0
       (For daily_health_based, persisted duration = { weeks: 0, totalDays: 1 })

  [3k] Response:
       Return mealPlan
       If diseases: append medicalDisclaimer
       If unsupportedDiseases: list them in response

Step 4: Meal Swap
  POST /api/meal-plans/:planId/swap { day, mealIndex }
  → Locate target meal in plan
  → Re-run AI generation for that single meal (same nutrition targets)
  → Safety validation
  → Update meal in-place
  → Increment swapCount, append to swapHistory
  → Max 5 swaps per plan enforced

Step 5: Shopping List
  GET /api/meal-plans/:planId/shopping-list?startDay=1&endDay=7
  → Aggregate all ingredient strings from selected days
  → Categorize by keyword patterns
  → Return structured { categories: { Produce, Protein, Dairy, Grains, Pantry, Other } }
```

---

## 10. Service Logic Diagrams

This section traces the exact logic inside each service layer — formulas, constants, branching decisions, and data shapes — so a developer can understand the code without opening every file.

---

### 10.1 Nutrition Engine (`src/services/nutrition/`)

`generateNutritionPlan(healthProfile, { goalOverride, tdeeOverride })`. The two options are how the meal-plan controller injects purpose-specific behavior:
- `goalOverride` — replaces `healthProfile.goal` (used by `disease_based` to force `improve-health`, and by `weight_management` to inject the request-scoped `weightGoal`).
- `tdeeOverride` — bypasses BMR/TDEE calculation entirely (used by `daily_health_based` when both Apple Watch resting + active energy are supplied).

The returned plan now includes the **effective `goal`** so downstream code can stay coherent with the macro distribution it received.

```
Input: healthProfile { currentWeight, height, age, gender, activityLevel, goal, mealsPerDay }
       options      { goalOverride?, tdeeOverride? }
                                    │
                         validateInputs()
                         • weight: 20–500 kg
                         • height: 50–300 cm
                         • age: 1–120
                         • gender: 'male' | 'female'
                         throws if any field invalid
                                    │
                        ┌───────────▼───────────┐
                        │    calculateBMR()      │  bmrCalculator.js
                        │                        │
                        │  Mifflin-St Jeor:      │
                        │  base = 10W + 6.25H    │
                        │        - 5A            │
                        │  male:   base + 5      │
                        │  female: base - 161    │
                        └───────────┬────────────┘
                                    │ bmr (float)
                        ┌───────────▼───────────┐
                        │   calculateTDEE()      │  tdeeCalculator.js
                        │                        │
                        │  TDEE = BMR × factor   │
                        │                        │
                        │  sedentary       1.200 │
                        │  lightly-active  1.375 │
                        │  moderately-act  1.550 │
                        │  very-active     1.725 │
                        │  extremely-act   1.900 │
                        └───────────┬────────────┘
                                    │ tdee (float)
                        ┌───────────▼────────────────┐
                        │  calculateCalorieTarget()   │  calorieTargetCalculator.js
                        │                             │
                        │  target = TDEE × multiplier │
                        │  lose-weight:  × 0.80       │
                        │  gain-weight:  × 1.10       │
                        │  improve-health: × 1.00     │
                        │                             │
                        │  floor: male=1500, fem=1200 │
                        │  ceiling: 4000 kcal         │
                        │  result = clamp(floor,ceil) │
                        └───────────┬─────────────────┘
                                    │ calorieTarget (integer)
                        ┌───────────▼───────────┐
                        │   calculateMacros()    │  macroCalculator.js
                        │                        │
                        │  protein (g/kg × kg):  │
                        │   lose-weight:  1.8g   │
                        │   gain-weight:  1.6g   │
                        │   improve-hlth: 1.4g   │
                        │                        │
                        │  fat (% of kcal ÷ 9):  │
                        │   lose-weight:  25%    │
                        │   gain-weight:  25%    │
                        │   improve-hlth: 30%    │
                        │                        │
                        │  carbs = (kcal         │
                        │   - protein×4          │
                        │   - fat×9) ÷ 4         │
                        │  (fills remainder)     │
                        └───────────┬────────────┘
                                    │ { protein, carbs, fat } (grams)
                        ┌───────────▼───────────┐
                        │   distributeMacros()   │  mealMacroDistributor.js
                        │                        │
                        │  mealsPerDay=3:         │
                        │   breakfast 30%        │
                        │   lunch     40%        │
                        │   dinner    30%        │
                        │                        │
                        │  mealsPerDay=4:         │
                        │   all 25% each         │
                        │   [bfst,lunch,snk,din] │
                        │                        │
                        │  mealsPerDay=5:         │
                        │   all 20% each         │
                        │   [bfst,snk,lunch,     │
                        │    snk,dinner]         │
                        │                        │
                        │  Rounding correction:  │
                        │   largest meal absorbs │
                        │   rounding diff to     │
                        │   ensure exact sums    │
                        └───────────┬────────────┘
                                    │ mealDistribution[]
                                    │ [{ mealType, calories, protein, carbs, fat }, ...]

Output: { bmr, tdee, calorieTarget, macros, mealDistribution }
```

**Duration Calculator** (`durationCalculator.js`):
```
calculatePlanDuration({ goal, currentWeight, desiredWeight, requestedWeeks })

If requestedWeeks is provided (1, 2, or 4):
  → use it directly (purpose=weight_management or disease_based)
  → output: { weeks: requestedWeeks, templateDays: 7,
              totalDays: requestedWeeks × 7 }

Otherwise fall back to weight-delta heuristic:
  goal = 'lose-weight':  weeks = ceil(|current - desired| / 0.5)
  goal = 'gain-weight':  weeks = ceil(|desired - current| / 0.25)
  goal = 'improve-health': weeks = 1 (default)
  clamp: weeks = max(1, min(52, weeks))

Note: desiredWeight is no longer stored on HealthProfile — it is
passed per-request via POST /api/meal-plans/generate when
purpose=weight_management. The daily_health_based purpose bypasses
this calculator entirely (templateDays=1, persisted as
{ weeks: 0, totalDays: 1 }).
```

---

### 10.2 Disease Engine (`src/services/disease/`)

```
Input: nutritionPlan (from NutritionEngine), healthProfile.diseases[]
                                    │
              ┌─────────────────────▼──────────────────────┐
              │         applyDiseaseAdjustments()           │  diseaseEngine.js
              │                                             │
              │  1. Detect unsupported diseases             │
              │     (not in SUPPORTED_DISEASES list)        │
              │     → log warning, surface in response      │
              │                                             │
              │  2. adjustMacrosForDiseases()               │
              │                                             │
              │  3. Feasibility check:                      │
              │     reconstructed = protein×4+carbs×4+fat×9 │
              │     drift = |reconstructed - target| / target│
              │     if drift > 10% → throw Error            │
              │     (infeasible disease combination)        │
              │                                             │
              │  4. effectiveCalories = reconstructed       │
              │  5. re-run distributeMacros()               │
              └─────────────────────┬───────────────────────┘
                                    │
              ┌─────────────────────▼──────────────────────┐
              │       adjustMacrosForDiseases()             │  macroAdjuster.js
              │                                             │
              │  Collect strictest cap per macro across     │
              │  ALL diseases (strictest-cap-wins):         │
              │                                             │
              │  diabetes:      maxCarbPct = 35%            │
              │  kidney-disease: maxProteinPerKg = 0.8g/kg  │
              │  high-uric-acid: maxProteinPct = 30%        │
              │                  maxFatPct = 25%            │
              │  hypertension:  maxFatPct = 25%             │
              │                                             │
              │  Convert to grams:                          │
              │   maxCarbGrams = (kcal × carbPct%) / 4      │
              │   maxProteinGrams = min(                    │
              │     weight × maxProteinPerKg,               │
              │     kcal × maxProteinPct% / 4)              │
              │   maxFatGrams = (kcal × fatPct%) / 9        │
              │                                             │
              │  Apply caps + track excess calories:        │
              │   if carbs > cap → excess += diff×4         │
              │   if protein > cap → excess += diff×4       │
              │   if fat > cap → excess += diff×9           │
              │                                             │
              │  Redistribute excess to uncapped macros:    │
              │   carbs uncapped? → carbs += excess/4       │
              │   fat uncapped?   → fat   += excess/9       │
              │   protein uncapped? → protein += excess/4   │
              │   all capped?     → split: half→carbs,      │
              │                            half→fat         │
              │                                             │
              │  Re-clamp after redistribution:             │
              │   (calorie deficit preferred over           │
              │    exceeding a medical cap)                 │
              └─────────────────────┬───────────────────────┘
                                    │ adjusted { protein, carbs, fat }

Ingredient Lists (built separately, no adjustment):
  getForbiddenIngredients(diseases)  → union of all disease forbidden lists
  getLimitedIngredients(diseases)    → union of all disease limited lists
  getPreferredIngredients(diseases)  → union of all disease preferred lists

  Example for ['diabetes', 'hypertension']:
  forbidden = ['white sugar','candy','soda','syrup',...,'table salt',
               'soy sauce','fish sauce','pickles',...] (deduped Set)
```

**Post-generation safety validation:**
```
validateGeneratedMeal(meal, diseases)          diseaseEngine.js
          │
          ▼
validateMealSafety(meal, diseases)             safetyValidator.js
          │
          ▼
filterIngredients(meal, diseases)              ingredientFilter.js
  │
  │  forbidden = getForbiddenIngredients(diseases)
  │  for each forbidden term:
  │    build regex: /\bterm\b/i
  │    (word-boundary prevents "ham" matching "edamame",
  │     "beer" matching "beet")
  │  scan every ingredient string
  │  collect flagged[]
  │
  └→ { safe: flagged.length === 0, flaggedIngredients, meal }

Result: { safe: bool, reasons: ["Forbidden ingredients found: X, Y"] }
```

---

### 10.3 RAG Layer (`src/services/rag/`)

```
Input: { mealType, goal, diseases[], cuisine, favoriteMeal }  per unique mealType
                                    │
         ┌──────────────────────────▼──────────────────────────┐
         │               retriever.js                          │
         │                                                     │
         │  RAG_ENABLED === 'false'?                           │
         │    → return null / [] immediately (skip all)        │
         │                                                     │
         │  retrieveRelevantMeals():                           │
         │    Build query string (omit null fields):           │
         │    "{mealType} meal for {goal} goal                 │
         │     {cuisine} cuisine {favoriteMeal}"               │
         │                                                     │
         │  retrieveDiseaseGuidelines(diseases):               │
         │    For each unique disease:                         │
         │    query = "dietary guidelines for {disease}"       │
         └──────────────────────────┬──────────────────────────┘
                                    │ query strings
         ┌──────────────────────────▼──────────────────────────┐
         │            embeddingClient.js                       │
         │                                                     │
         │  normalizeText(query):                              │
         │    trim → lowercase → collapse whitespace           │
         │                                                     │
         │  POST LM_STUDIO_EMBEDDING_URL                       │
         │  { model: EMBEDDING_MODEL, input: [query] }         │
         │  timeout: 10s AbortController                       │
         │  parse: data[0].embedding → float[768]              │
         │                                                     │
         │  On failure → return null (graceful degradation)    │
         └──────────────────────────┬──────────────────────────┘
                                    │ queryEmbedding: float[768] | null
                   null? ───────────┘ skip retrieval, return null
                                    │
         ┌──────────────────────────▼──────────────────────────┐
         │              vectorStore.js                         │
         │                                                     │
         │  queryDocuments(collection, embedding, options):    │
         │                                                     │
         │  Meals query:                                       │
         │    collection: 'recipes'                            │
         │    nResults: 3                                      │
         │    where: { mealType: 'breakfast' }                 │
         │    (equality filter only — $in not supported)       │
         │                                                     │
         │  Guideline query (per disease):                     │
         │    collection: 'guidelines'                         │
         │    nResults: 1                                      │
         │    where: { disease: 'diabetes' }                   │
         │                                                     │
         │  ChromaDB: cosine similarity search                 │
         │  Returns: { ids, documents, metadatas, distances }  │
         │  On failure → return null (graceful degradation)    │
         └──────────────────────────┬──────────────────────────┘
                                    │ raw ChromaDB results
         ┌──────────────────────────▼──────────────────────────┐
         │           ragContextBuilder.js                      │
         │                                                     │
         │  buildMealContext(retrievedMeals, retrievedGuidelines)
         │                                                     │
         │  Parse meal entries:                                │
         │    for each metadata+document pair:                 │
         │      name = sanitizePromptInput(meta.name, 80)      │
         │      doc  = sanitizePromptInput(document, 200)      │
         │      strip if adversarial keyword found:            │
         │      /\b(ignore|forget|system|assistant|            │
         │          human|instruction|override)\b/i            │
         │                                                     │
         │  Parse guideline tips:                              │
         │    for each document in results:                    │
         │      tip = sanitizePromptInput(doc, 150)            │
         │      strip if adversarial keyword found             │
         │                                                     │
         │  Assemble output:                                   │
         │  "Reference meals (use as inspiration...):\n        │
         │   1. {name}: {doc}\n                                │
         │   2. ...\n                                          │
         │   Dietary guidelines to follow:\n                   │
         │   - {tip}\n"                                        │
         │                                                     │
         │  Hard cap: truncate at last \n before 1500 chars    │
         │  Empty input → return ""                            │
         └──────────────────────────┬──────────────────────────┘
                                    │ contextString (≤1500 chars) | ""

Output: ragContextByMealType = {
  "breakfast": "Reference meals...",
  "lunch":     "Reference meals...",
  "dinner":    "Reference meals...",
}
(empty string for mealTypes with no context retrieved)
```

**Indexing flow** (`indexer.js` + `scripts/indexKnowledgeBase.js`):
```
npm run rag:index
        │
        ▼
indexAllCollections() runs these in parallel:
  ┌─────────────────┬──────────────────┬──────────────────┐
  │  indexRecipes() │ indexGuidelines()│indexIngredients()│
  │                 │                  │                  │
  │ batch size: 10  │ all at once      │ batch size: 10   │
  │                 │                  │                  │
  │ doc string:     │ doc string:      │ doc string:      │
  │ "{name}.        │ "{disease}:      │ "{name}          │
  │  {mealType}     │  {summary}.      │  ({aliases}).    │
  │  for {goal}.    │  Tips:           │  {nutritionProf} │
  │  Ingredients:   │  {tips.join}"    │  Safe for:       │
  │  {ingredients}. │                  │  {safeFor}"      │
  │  {description}" │                  │                  │
  │                 │                  │                  │
  │ metadata:       │ metadata:        │ metadata:        │
  │  name,mealType, │  disease,        │  name, category, │
  │  cuisine,       │  type:'guideline'│  safeFor,        │
  │  goal(csv),     │                  │  avoidFor        │
  │  diseaseComp(csv│                  │  (all csv)       │
  │  tags(csv)      │                  │                  │
  └─────────────────┴──────────────────┴──────────────────┘
        │                 │                   │
        └─────────────────┴───────────────────┘
        Upsert to ChromaDB (idempotent — safe to re-run)
        Returns: { recipes: 35, guidelines: 4, ingredients: 46, errors: 0 }
```

---

### 10.4 AI Layer (`src/services/ai/`)

```
Input: mealInput { mealType, calories, protein, carbs, fat, goal,
                   dietPreference, cuisinePreference, diseases,
                   favoriteMeal, forbiddenIngredients, limitedIngredients,
                   preferredIngredients, retrievedContext }
callBudget: { remaining: N }
                                    │
         ┌──────────────────────────▼──────────────────────────┐
         │               generateMeal()                        │  mealGenerator.js
         │                                                     │
         │  MAX_MEAL_RETRIES = 2  (so up to 3 total attempts)  │
         │                                                     │
         │  for attempt 0..2:                                  │
         │    callBudget.remaining-- (throws if 0)             │
         │    errorFeedback = lastError.message (or null)      │
         │    prompt = buildMealPrompt({...mealInput,          │
         │               errorFeedback, retrievedContext})     │
         │    rawText = callLMStudio(prompt)                   │
         │    parsed  = parseAIResponse(rawText)               │
         │    result  = sanitizeResponse(parsed)               │
         │    return result  ← success                         │
         │    on error → lastError = error, retry              │
         │                                                     │
         │  throw if all attempts fail                         │
         └──────────────────────────┬──────────────────────────┘
                                    │
         ┌──────────────────────────▼──────────────────────────┐
         │              buildMealPrompt()                      │  promptBuilder.js
         │                                                     │
         │  Sanitize every user input:                         │
         │   sanitizePromptInput(str, maxLen):                 │
         │   → replace [\n\r\t] with space                     │
         │   → collapse whitespace                             │
         │   → slice to maxLen (default 100)                   │
         │                                                     │
         │  Prompt sections (in order):                        │
         │  ┌─────────────────────────────────────────────┐   │
         │  │ "You are a professional nutritionist.       │   │
         │  │  Generate ONE creative {mealType} meal."    │   │
         │  ├─────────────────────────────────────────────┤   │
         │  │ Target context (context only, not output):  │   │
         │  │  calories, protein, carbs, fat              │   │
         │  ├─────────────────────────────────────────────┤   │
         │  │ User Preferences:                           │   │
         │  │  goal, diet, cuisines, favorite, diseases   │   │
         │  ├─────────────────────────────────────────────┤   │
         │  │ JSON format instruction + example           │   │
         │  ├─────────────────────────────────────────────┤   │
         │  │ [if retrievedContext non-empty]:            │   │
         │  │  REFERENCE CONTEXT (inspiration only):      │   │
         │  │  {retrievedContext}                         │   │  ← RAG injection
         │  ├─────────────────────────────────────────────┤   │
         │  │ STRICT RULES (1–5)                          │   │
         │  ├─────────────────────────────────────────────┤   │
         │  │ [if forbidden]: Do NOT use: ...             │   │
         │  │ [if limited]:   Use sparingly: ...          │   │
         │  │ [if preferred]: Prefer these: ...           │   │
         │  ├─────────────────────────────────────────────┤   │
         │  │ [if errorFeedback]:                         │   │
         │  │  IMPORTANT: previous errors to fix: ...     │   │
         │  └─────────────────────────────────────────────┘   │
         └──────────────────────────┬──────────────────────────┘
                                    │ prompt string
         ┌──────────────────────────▼──────────────────────────┐
         │               callLMStudio()                        │  aiClient.js
         │                                                     │
         │  POST LM_STUDIO_URL                                 │
         │  body: {                                            │
         │    model: 'local-model',                            │
         │    messages: [                                      │
         │      { role:'system', content: SYSTEM_MESSAGE },    │
         │      { role:'user', content: prompt }               │
         │    ],                                               │
         │    temperature: 0.2,                                │
         │    max_tokens: 2000,                                │
         │    top_p: 0.9                                       │
         │  }                                                  │
         │  timeout: 30s AbortController                       │
         │  size guard: throw if response > 50KB               │
         │  returns: data.choices[0].message.content           │
         └──────────────────────────┬──────────────────────────┘
                                    │ rawText
         ┌──────────────────────────▼──────────────────────────┐
         │              parseAIResponse()                      │  aiClient.js
         │                                                     │
         │  strip ```json ... ``` markdown fences              │
         │  if text doesn't start with '{':                    │
         │    extractBalancedJSON() — brace-counting scan      │
         │    (tracks depth, inString, escape chars)           │
         │  JSON.parse(jsonText)                               │
         │  throws if no balanced JSON found                   │
         └──────────────────────────┬──────────────────────────┘
                                    │ parsed object
         ┌──────────────────────────▼──────────────────────────┐
         │              sanitizeResponse()                     │  mealGenerator.js
         │                                                     │
         │  Reject if ANY of these keys present:               │
         │   calories, macros, protein, carbs, fat,            │
         │   totalCalories                                     │
         │                                                     │
         │  Require: name (non-empty string)                   │
         │  Require: ingredients (non-empty array of strings)  │
         │                                                     │
         │  Return ONLY: { name, description,                  │
         │                  ingredients, benefits }            │
         └──────────────────────────┬──────────────────────────┘
                                    │
Output: { name, description, ingredients[], benefits[] }
```

**Concurrency** (`concurrency.js`):
```
runWithConcurrency(tasks[], limit=3):
  Spawns min(limit, tasks.length) worker coroutines
  Each worker loops: pick next unstarted task → await it → store result
  All workers run in parallel via Promise.all()
  Results returned in original task order

Example: 21 tasks (7 days × 3 meals), limit=3
  Worker-1: task0, task3, task6, task9, task12, task15, task18
  Worker-2: task1, task4, task7, task10, task13, task16, task19
  Worker-3: task2, task5, task8, task11, task14, task17, task20
  (approximate — depends on timing)
```

---

### 10.5 Meal Validation Service (`src/services/mealValidationService.js`)

```
Input: plan { days[] }, healthProfile { mealsPerDay }
DEVIATION_THRESHOLD = 1%

For each day in plan.days:

  validateCaloriesConsistency(day):
    sum = Σ meal.calories
    if |sum - day.totalCalories| / day.totalCalories > 1%
    → error: "Day N: meal calories sum (X) deviates from totalCalories (Y)"

  validateMacroConsistency(day):
    estimated = day.macros.protein×4 + day.macros.carbs×4 + day.macros.fat×9
    if |estimated - day.totalCalories| / day.totalCalories > 1%
    → error: "Day N: macro-derived calories (X) deviates from totalCalories (Y)"

  validateMealsPerDay(day, expectedMealsPerDay):
    if day.meals.length !== mealsPerDay
    → error: "Day N: expected X meals but got Y"

Output: { valid: bool, errors: string[] | null }
Note: logical validation failure causes plan retry (not hard error),
      up to MAX_RETRIES=2 full retry attempts
```

---

### 10.6 Full Orchestration (`src/controllers/mealplan.controller.js`)

```
POST /api/meal-plans/generate
                                    │
         Fetch HealthProfile from MongoDB
         Validate required fields: [gender, age, currentWeight, height]
                                    │
         ┌──────────────────────────▼──────────────────────────┐
         │       STEP 0: Purpose dispatch (NEW)                 │
         │                                                      │
         │  purpose = req.body.purpose                          │
         │  templateDays = 7  (default)                         │
         │  goalOverride = undefined                            │
         │  tdeeOverride = undefined                            │
         │  requestedWeeks = undefined                          │
         │                                                      │
         │  if purpose === 'daily_health_based':                │
         │    templateDays = 1                                  │
         │    requestedWeeks = 1                                │
         │    tdeeOverride = restingEnergyKcal +                │
         │                   activeEnergyKcal                   │
         │      (from req.body.healthSnapshot, if both finite)  │
         │                                                      │
         │  if purpose === 'weight_management':                 │
         │    checkWeightGoalContraindications(weightGoal,      │
         │      allDiseaseKeys)                                 │
         │      → 400 if blocked (e.g. gain-weight + obesity,   │
         │        muscle-gain + kidney-disease,                 │
         │        lose-weight + anemia)                         │
         │    goalOverride =                                    │
         │      mapWeightGoalToEngineGoal(weightGoal)           │
         │      ('muscle-gain' → 'gain-weight')                 │
         │    requestedWeeks = durationWeeks (1, 2, or 4)       │
         │                                                      │
         │  if purpose === 'disease_based':                     │
         │    require allDiseaseKeys.length > 0 (else 400)      │
         │    goalOverride = 'improve-health'                   │
         │    requestedWeeks = durationWeeks (1, 2, or 4)       │
         └──────────────────────────┬──────────────────────────┘
                                    │
         ┌──────────────────────────▼──────────────────────────┐
         │            STEP 1: Nutrition Engine                  │
         │  generateNutritionPlan(healthProfile,                │
         │    { goalOverride, tdeeOverride })                   │
         │  → { bmr, tdee, calorieTarget, goal, macros,        │
         │      mealDistribution }                              │
         │  (effective goal returned — used downstream)         │
         └──────────────────────────┬──────────────────────────┘
                                    │
                         diseases.length > 0?
                         yes ──────▼──────── no
         ┌──────────────────────────▼──────────────────────────┐
         │            STEP 2: Disease Engine                    │
         │  applyDiseaseAdjustments(nutritionPlan, profile)     │
         │  → adjusted macros, new mealDistribution            │
         │  → unsupportedDiseases (surfaced in response)        │
         │  throws if feasibility drift > 10%                  │
         └──────────────────────────┬──────────────────────────┘
                                    │
         Build ingredient lists:
         getForbiddenIngredients(diseases)
         getLimitedIngredients(diseases)
         getPreferredIngredients(diseases)
                                    │
         ┌──────────────────────────▼──────────────────────────┐
         │            STEP 3: RAG Retrieval                     │
         │  uniqueMealTypes = Set of mealTypes in distribution  │
         │  try:                                                │
         │    for each mealType:                               │
         │      await Promise.all([                            │
         │        retrieveRelevantMeals({ mealType, goal,      │
         │          diseases, cuisine, favoriteMeal }),         │
         │        retrieveDiseaseGuidelines(diseases)          │
         │      ])                                             │
         │      ragContextByMealType[mealType] =               │
         │        buildMealContext(meals, guidelines)           │
         │  catch any error:                                   │
         │    log warning, ragContextByMealType = {}           │
         │    (generation continues without context)           │
         └──────────────────────────┬──────────────────────────┘
                                    │
         aiCallBudget = min(60, templateDays × mealsPerDay × 2 + 10)
         callBudget = { remaining: aiCallBudget }
         (templateDays = 1 for daily_health_based, 7 otherwise)
                                    │
         ┌─────────── RETRY LOOP (max 3 attempts) ────────────┐
         │                                                     │
         │  STEP 4: Build meal tasks                           │
         │  for dayIndex 0..(templateDays-1) × each dist:      │
         │    task = () => generateMeal({                      │
         │      mealType: dist.mealType,                       │
         │      calories, protein, carbs, fat,                 │
         │      goal: nutritionPlan.goal,  ← effective goal    │
         │      dietPreference, cuisinePreference,             │
         │      diseases, favoriteMeal,                        │
         │      forbiddenIngredients, limitedIngredients,      │
         │      preferredIngredients,                          │
         │      retrievedContext: ragContextByMealType[mealType]│
         │    }, callBudget)                                   │
         │                                                     │
         │  STEP 5: Concurrent generation                      │
         │  mealResults = runWithConcurrency(tasks, limit=3)   │
         │                                                     │
         │  STEP 6: Safety validation (per meal)               │
         │  for each mealResult:                               │
         │    if diseases present:                             │
         │      for regenAttempt 0..2:                         │
         │        result = validateGeneratedMeal(meal, diseases)│
         │        if safe → break                              │
         │        if !safe && budget > 0 → regenerate          │
         │      if still unsafe → safetyFailed = true → break  │
         │                                                     │
         │  STEP 7: Assemble template (templateDayObjs[])      │
         │  group mealResults by dayIndex                      │
         │  merge AI content + backend nutrition into each meal │
         │                                                     │
         │  STEP 8: Schema validation (AJV)                    │
         │  validateMealPlan(templatePlan)                     │
         │  if invalid → lastErrors = errors, continue retry   │
         │                                                     │
         │  STEP 9: Logical validation                         │
         │  validateFullMealPlan(templatePlan, healthProfile)  │
         │  if invalid → lastErrors = errors, continue retry   │
         │                                                     │
         │  template valid → break out of retry loop           │
         └─────────────────────────────────────────────────────┘
                                    │
         Replicate template across duration:
         - daily_health_based: skip replication; use 1-day template,
           persist as { weeks: 0, totalDays: 1 }
         - else: for week 0..(weeks-1): for each templateDayObj:
             push { ...templateDayObj, day: week×7 + day.day }
                                    │
         Save to MongoDB: MealPlan.create({
           userId, healthProfileId, title, days,
           purpose,                          ← NEW
           duration: { weeks, totalDays },
           aiModel: 'lm-studio',
           prompt: 'per-meal-generation'
         })
                                    │
         Response:
           { ok: true, mealPlan }
           + disclaimer (if diseases)
           + unsupportedDiseases (if any)
```

---

## 11. Summary

Eat Clean API is a **safety-first, RAG-augmented meal planning system** built on a clear separation of concerns:

**What the backend owns (deterministic):**
- All nutritional calculations (BMR, TDEE, calories, macros, meal distribution)
- Disease restriction rules and macro adjustments
- Ingredient safety validation
- Data schema validation
- Knowledge base curation and vector indexing

**What the RAG layer provides (grounding):**
- Semantically similar reference meals from a curated knowledge base
- Disease-specific dietary guidelines retrieved by semantic similarity
- Formatted as "inspiration context" — the LLM is told explicitly not to copy

**What the AI owns (creative):**
- Meal names and descriptions
- Ingredient suggestions (subject to safety filtering, inspired by retrieved context)
- Health benefit descriptions

This architecture ensures **medical safety is never delegated to the AI**. Even if the LLM suggests a meal with a forbidden ingredient, the safety validator catches and rejects it. All numeric nutrition values in the final plan are provably backend-computed — the LLM cannot inflate or deflate calorie counts. The knowledge base also contains no numeric nutrition data, so the RAG context cannot introduce numbers through the back door.

### Phased Development Summary

| Phase | Focus | Key Additions |
|-------|-------|---------------|
| **Phase 1** | AI output hardening | AJV schema validation, retry logic, error feedback prompting |
| **Phase 2** | Deterministic nutrition | BMR/TDEE/macro engine moved off AI; all numbers are backend-computed |
| **Phase 3** | Prompt isolation | Strict creative-only AI output; sanitized inputs; numeric stripping |
| **Phase 4** | Disease restriction engine | Macro caps, ingredient blacklists, safety validator per meal |
| **Phase 5** | Production hardening | JWT auth, rate limiting, Winston logging, favorites, swap, shopping list |
| **Phase 6** | RAG integration | ChromaDB vector store, nomic-embed-text embeddings, curated knowledge base, prompt grounding, adversarial content protection |

### Known Inconsistencies

| Requirement | Implementation Status |
|-------------|----------------------|
| Phase 1: `temperature: 0.2` | Implemented as `temperature: 0.7` in `aiClient.js` |
| Phase 4: Sodium/potassium/sugar programmatic limits | Intentionally NOT enforced (requires nutrition database); ingredient blacklists used as proxy |
| Phase 5: Morgan request logging | Morgan in dependencies but unused; custom Winston `requestLogger` is used instead |
| Phase 6: ChromaDB `$in` filter for disease arrays | Not supported by ChromaDB on string metadata; disease post-filtering left to prompt framing |

### Security Fixes Applied

| Issue | Fix | Files Changed |
|-------|-----|---------------|
| ReDoS via `$regex` with raw user input in recipe search | Escape all regex special characters with `escapeRegex()` before passing to `$regex` | `recipe.controller.js` *(file later removed in 2026-04 along with the entire `/api/recipes` resource — see §5.4)* |
| Missing ownership check on recipe update/delete | Fetch recipe first; verify `author === req.user.id`; admins bypass check; return 403 otherwise | `recipe.controller.js` *(file later removed in 2026-04 along with the entire `/api/recipes` resource — see §5.4)* |
| Internal error details leaked via `e.message` in auth responses | All catch blocks now log via `logger.error()` and return generic `'Internal server error'` | `auth.controller.js` |
| Weak password policy (min 6 chars, no complexity) | Raised to min 8 chars + requires uppercase, lowercase, and digit | `auth.validator.js`, `User.js` |
| `role` missing from JWT payload | Added `role` to `signAccessToken()` so route handlers can check admin status without a DB query | `auth.controller.js` |
