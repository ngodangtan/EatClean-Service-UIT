# Eat Clean API — Comprehensive Technical Summary

> Generated: 2026-03-12 | Last updated: 2026-03-22 | Based on all requirement documents (Phase 1–5) and full source code analysis

---

## 1. Project Overview

### What the Project Does

Eat Clean API is a Node.js/Express REST API that provides **AI-powered, medically-aware meal plan generation** for health-conscious users. It solves the problem of creating personalised meal plans that simultaneously satisfy:

- Individual nutritional targets (calories, protein, carbs, fat) derived from body metrics and fitness goals
- Medical dietary restrictions for chronic conditions (diabetes, kidney disease, high uric acid, hypertension)
- User food preferences (cuisine, favourite meals, diet style)
- Practical usability (shopping lists, meal swaps, recipe bookmarks)

### Main Problem Solved

Generic meal planning tools either ignore medical restrictions entirely, or rely on static templates. This system uniquely combines a **deterministic nutrition engine** (precise, repeatable medical-grade macro calculation) with a **generative AI layer** (creative meal naming and descriptions) under a **disease safety guardrail** — so that no medically forbidden ingredient can appear in a generated plan.

### Overall System Workflow

```
User Registration (optionally captures height + currentWeight) → Health Profile Setup (body metrics + diseases; height & currentWeight pre-filled from registration)
     ↓
Nutrition Engine (deterministic: BMR → TDEE → calories → macros → meal distribution)
     ↓
Disease Engine (cap macros for active diseases, build ingredient restriction lists)
     ↓
AI Prompt Builder (inject per-meal nutrition targets + restrictions into prompt)
     ↓
LM Studio / LLM (generates name, description, ingredients, benefits ONLY)
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
│   ├── index.js                        # Express app entry point
│   ├── config/
│   │   ├── db.js                       # MongoDB connection
│   │   └── swagger.js                  # OpenAPI 3.0 spec
│   ├── controllers/                    # Business logic layer
│   │   ├── auth.controller.js
│   │   ├── health.controller.js        # Health profile CRUD
│   │   ├── mealplan.controller.js      # Meal plan generation orchestrator
│   │   ├── recipe.controller.js
│   │   └── favorite.controller.js
│   ├── routes/                         # Express routers
│   │   ├── index.js                    # Route aggregator (mounts all under /api)
│   │   ├── auth.routes.js
│   │   ├── health.routes.js
│   │   ├── mealplan.routes.js
│   │   ├── recipe.routes.js
│   │   └── favorite.routes.js
│   ├── models/                         # Mongoose schemas
│   │   ├── User.js
│   │   ├── HealthProfile.js
│   │   ├── MealPlan.js
│   │   ├── Recipe.js
│   │   ├── Favorite.js
│   │   └── TokenBlacklist.js
│   ├── middleware/
│   │   ├── auth.js                     # JWT verification + blacklist check
│   │   ├── errorHandler.js             # Global error handler
│   │   ├── loginLimiter.js             # Rate limit: 5 attempts / 15 min
│   │   ├── requestLogger.js            # Winston request ID + duration logging
│   │   └── validate.js                 # Joi schema validation middleware
│   ├── validators/                     # Input schema definitions
│   │   ├── auth.validator.js
│   │   ├── healthProfile.validator.js
│   │   ├── recipe.validator.js
│   │   └── mealPlan.schema.js          # AJV JSON schema for AI output
│   ├── services/
│   │   ├── nutrition/                  # Deterministic nutrition calculations
│   │   │   ├── bmrCalculator.js
│   │   │   ├── tdeeCalculator.js
│   │   │   ├── calorieTargetCalculator.js
│   │   │   ├── macroCalculator.js
│   │   │   ├── mealMacroDistributor.js
│   │   │   ├── durationCalculator.js
│   │   │   └── nutritionEngine.js      # Orchestrator
│   │   ├── disease/                    # Medical restriction engine
│   │   │   ├── diseaseRules.js         # Disease config (rules, ingredients)
│   │   │   ├── macroAdjuster.js        # Strict-cap-wins macro adjustment
│   │   │   ├── ingredientFilter.js     # Word-boundary ingredient scan
│   │   │   ├── safetyValidator.js      # Per-meal safety gate
│   │   │   └── diseaseEngine.js        # Orchestrator
│   │   ├── ai/                         # LLM integration layer
│   │   │   ├── aiClient.js             # HTTP client for LM Studio
│   │   │   ├── promptBuilder.js        # Prompt construction
│   │   │   ├── mealGenerator.js        # Generation with retry + sanitization
│   │   │   └── concurrency.js          # Concurrent generation limiter
│   │   ├── mealValidationService.js    # Post-generation logical validation
│   │   └── shoppingListService.js      # Shopping list aggregation
│   └── utils/
│       ├── AppError.js                 # Custom error class + factory functions
│       └── logger.js                   # Winston logger
├── tests/                              # Vitest test suite
├── requirement/                        # Phase requirement docs (Phase 1–5 + reviews)
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
[Controller]
     │
     ├─→ [Nutrition Engine] — pure functions, no side effects
     ├─→ [Disease Engine]   — caps macros, builds ingredient lists
     ├─→ [AI Layer]         — prompts LLM, sanitizes response
     ├─→ [Validators]       — AJV schema + logical consistency
     └─→ [Mongoose Models]  — persist to MongoDB
     │
     ▼
[errorHandler middleware] ← catches all thrown AppError / unexpected errors
```

---

## 3. AI Model Usage

### No Training — Pure Prompt Engineering

The project does **not train, fine-tune, or embed** any AI model. It integrates with a **locally-hosted LLM via LM Studio** (OpenAI-compatible chat completions API at `http://localhost:1234/v1/chat/completions`).

The AI is used exclusively as a **creative text generator** for meal content:
- Meal name
- Description
- Ingredient list (names only, no quantities)
- Health benefits

All numerical nutritional values (calories, protein, carbs, fat) are **computed deterministically by the backend** and injected into the saved plan. The AI is explicitly instructed **never** to output numeric nutrition data, and any numeric fields in the AI response are stripped by the sanitizer before use.

### LM Studio Integration

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

---

## 4. API Layer

### 4.1 Auth APIs

#### POST `/api/auth/register`
- **Input:** `{ email, password, username?, fullName?, phone?, birthday?, gender?, height?, currentWeight? }`
- **Action:** Creates user, hashes password with bcrypt, issues JWT access token (15 min) + refresh token (30 days). `height` and `currentWeight` are persisted on the User document and automatically pre-fill those fields when the user later creates a health profile.
- **Response:** `{ user: { id, email, username, role, height, currentWeight }, accessToken, refreshToken }`
- **Usage:** Client stores both tokens; access token used in `Authorization: Bearer` header

#### POST `/api/auth/login`
- **Input:** `{ email, password }`
- **Action:** Verifies password with bcrypt, rotates refresh token, issues new tokens
- **Response:** Same as register
- **Rate limited:** 5 attempts per 15 minutes via `loginLimiter`

#### POST `/api/auth/logout`
- **Input:** `{ refreshToken }` + `Authorization: Bearer <accessToken>`
- **Action:** Blacklists access token in `TokenBlacklist` (auto-expires via TTL index), removes refresh token from user record
- **Response:** `{ message: "Logged out successfully" }`

#### GET `/api/auth/profile`
- **Input:** `Authorization: Bearer <accessToken>`
- **Action:** Returns user document excluding password and refresh tokens
- **Response:** `{ id, email, username, fullName, phone, birthday, gender, height, currentWeight, role, createdAt }`

#### PUT `/api/auth/profile`
- **Input:** `{ username?, fullName?, phone?, birthday?, gender? }` (any subset)
- **Action:** Updates user fields; enforces username uniqueness
- **Response:** Updated user object

#### POST `/api/auth/refresh-token`
- **Input:** `{ refreshToken }`
- **Action:** Validates refresh token signature + DB existence, issues new access token
- **Response:** `{ accessToken }`

#### POST `/api/auth/revoke-token`
- **Input:** `{ refreshToken }`
- **Action:** Removes specific refresh token from user's token list
- **Response:** `{ message: "Token revoked" }`

#### DELETE `/api/auth/:id`
- **Input:** User ID in path + Bearer token (admin or own account)
- **Action:** Deletes user account
- **Response:** `{ message: "User deleted" }`

---

### 4.2 Health Profile APIs

#### POST `/api/health-profile`
- **Input:** `{ gender, age, goal, desiredWeight, activityLevel, mealsPerDay, diseases?, cuisinePreference?, favoriteMeal?, dietPreference?, height?, currentWeight? }`
- **Action:** Upsert (create or update) health profile for authenticated user. One profile per user enforced by unique index on `userId`. If `height` or `currentWeight` are omitted, the controller fetches them from the User record (captured at registration) so the user never has to re-enter them.
- **Response:** Full health profile document
- **Usage:** Profile is the foundation for all meal plan generation

#### GET `/api/health-profile`
- **Input:** Bearer token
- **Action:** Retrieve user's health profile
- **Response:** Full health profile document

#### DELETE `/api/health-profile`
- **Input:** Bearer token
- **Action:** Deletes user's health profile
- **Response:** `{ message: "Health profile deleted" }`

---

### 4.3 Meal Plan APIs

#### POST `/api/meal-plans/generate` ⭐ (Core endpoint)
- **Input:** Bearer token (health profile auto-fetched)
- **Action:** Full generation pipeline (see Section 9 for detailed flow)
- **Response:**
```json
{
  "mealPlan": {
    "_id": "...",
    "title": "Your 4-Week Meal Plan",
    "duration": { "weeks": 4, "totalDays": 28 },
    "days": [
      {
        "day": 1,
        "totalCalories": 1800,
        "totalProtein": 140,
        "totalCarbs": 180,
        "totalFat": 50,
        "meals": [
          {
            "mealType": "breakfast",
            "calories": 450,
            "protein": 35,
            "carbs": 45,
            "fat": 12,
            "name": "Grilled Chicken Quinoa Bowl",
            "description": "...",
            "ingredients": ["chicken breast", "quinoa", "spinach"],
            "benefits": ["High protein", "Complex carbs"]
          }
        ]
      }
    ]
  },
  "nutritionSummary": { ... },
  "unsupportedDiseases": [],
  "medicalDisclaimer": "..."
}
```

#### GET `/api/meal-plans/latest`
- **Input:** Bearer token
- **Action:** Returns most recently created meal plan for user
- **Response:** Full MealPlan document

#### GET `/api/meal-plans`
- **Input:** Bearer token + optional `?page=1&limit=10`
- **Action:** Paginated list of user's meal plans
- **Response:** `{ plans: [...], total, page, totalPages }`

#### POST `/api/meal-plans/:planId/swap`
- **Input:** Bearer token + `{ dayIndex, mealIndex }` in body
- **Action:** Regenerates a single meal using the same nutrition targets. Limited to 5 swaps per plan (tracked in `swapHistory`).
- **Response:** Updated MealPlan with swapped meal

#### GET `/api/meal-plans/:planId/shopping-list`
- **Input:** Bearer token + optional `?startDay=1&endDay=7`
- **Action:** Aggregates all ingredient names across selected days, categorizes them
- **Response:**
```json
{
  "totalItems": 42,
  "dayRange": { "start": 1, "end": 7 },
  "categories": {
    "Produce": ["spinach", "broccoli"],
    "Protein": ["chicken breast", "salmon"],
    "Dairy": ["Greek yogurt"],
    "Grains": ["quinoa", "brown rice"],
    "Pantry": ["olive oil", "garlic"],
    "Other": [...]
  }
}
```

#### DELETE `/api/meal-plans/:id`
- **Input:** Bearer token + plan ID
- **Action:** Deletes single plan (ownership verified)
- **Response:** `{ message: "Meal plan deleted" }`

#### DELETE `/api/meal-plans`
- **Input:** Bearer token
- **Action:** Deletes all meal plans for user
- **Response:** `{ message: "All meal plans deleted", count: N }`

---

### 4.4 Recipe APIs

#### GET `/api/recipes`
- **Input:** Optional `?search=&tags=&page=&limit=`
- **Action:** Full-text search on title, filter by tags, paginated
- **Response:** `{ recipes: [...], total, page, totalPages }`

#### GET `/api/recipes/:id`
- **Input:** Recipe ID in path
- **Response:** Full recipe document with author populated

#### POST `/api/recipes`
- **Input:** Bearer token + `{ title, description, calories, macros, tags, ingredients, steps, imageUrl? }`
- **Action:** Creates recipe, sets author to current user
- **Response:** Created recipe document

#### PUT `/api/recipes/:id`
- **Input:** Bearer token + partial update body
- **Action:** Updates recipe (ownership or admin required)
- **Response:** Updated recipe document

#### DELETE `/api/recipes/:id`
- **Input:** Bearer token + recipe ID
- **Action:** Deletes recipe (ownership or admin required)
- **Response:** `{ message: "Recipe deleted" }`

---

### 4.5 Favorites APIs

#### POST `/api/favorites`
- **Input:** Bearer token + `{ targetType: "meal-plan"|"recipe", targetId, note? }`
- **Action:** Adds item to favorites. Unique compound index prevents duplicates.
- **Response:** Created favorite document

#### GET `/api/favorites`
- **Input:** Bearer token + optional `?targetType=&page=&limit=`
- **Action:** Lists user's favorites with pagination
- **Response:** `{ favorites: [...], total, page, totalPages }`

#### GET `/api/favorites/check`
- **Input:** Bearer token + `?targetType=&targetId=`
- **Action:** Quick boolean check
- **Response:** `{ isFavorited: true|false }`

#### DELETE `/api/favorites/:id`
- **Input:** Bearer token + favorite document ID
- **Action:** Removes from favorites
- **Response:** `{ message: "Removed from favorites" }`

---

### 4.6 Health Check API

#### GET `/api/health`
- **Input:** None
- **Action:** Returns server status
- **Response:** `{ status: "ok", timestamp: "..." }`

---

## 5. Data Processing

### MongoDB Storage Architecture

| Model | Key Fields | Indexes |
|-------|-----------|---------|
| `User` | email, password (bcrypt), height, currentWeight, refreshTokens[] | email (unique) |
| `HealthProfile` | userId, age, weight, diseases[], goals | userId (unique) |
| `MealPlan` | userId, days[], swapHistory, duration | userId + createdAt (compound) |
| `Recipe` | title, macros, tags, ingredients | title (text), tags, author |
| `Favorite` | userId, targetType, targetId | userId+targetType+targetId (unique compound) |
| `TokenBlacklist` | token, expiresAt | token (unique), expiresAt (TTL — auto-delete) |

### Data Transformation Pipeline for Meal Plans

1. **Input Validation (Joi):** Health profile fields validated against schema before any computation
2. **Nutrition Calculation:** Pure mathematical functions produce `{ calorieTarget, macros, mealDistribution }`
3. **Disease Adjustment:** Macros potentially modified; ingredient restriction lists built
4. **AI Generation:** LLM receives prompts, returns raw text with JSON-like content
5. **Response Sanitization:** `sanitizeResponse()` strips all numeric fields from AI output
6. **Schema Validation (AJV):** Strict JSON schema confirms structure and required fields
7. **Logical Validation:** Calorie sum and macro arithmetic checked with 1% tolerance
8. **Merge:** Backend-calculated macros merged into AI-generated creative content
9. **Safety Validation:** Each meal scanned for forbidden ingredients; unsafe meals regenerated
10. **Persistence:** Assembled plan saved to MongoDB with `aiModel`, `prompt`, `swapCount` metadata

### Shopping List Processing

- Iterates all meals across requested day range
- Aggregates ingredient strings into a flat array
- Applies keyword-based categorization (15 patterns for Produce, 12 for Protein, etc.)
- Deduplicates and returns structured category map

---

## 6. User Input Handling

### Input Collection Points

| Route | Validator | Schema |
|-------|-----------|--------|
| `POST /auth/register` | Joi | `registerSchema` |
| `POST /auth/login` | Joi | `loginSchema` |
| `PUT /auth/profile` | Joi | `updateProfileSchema` |
| `POST /health-profile` | Joi | `healthProfileSchema` |
| `POST /recipes` | Joi | `createRecipeSchema` |
| `PUT /recipes/:id` | Joi | `updateRecipeSchema` |

### Validation Middleware Flow

```javascript
// src/middleware/validate.js
router.post('/register', validate(registerSchema), authController.register)

// validate() wraps Joi.validateAsync()
// On failure: throws AppError(400, validationError.details[0].message)
// On success: req.body is stripped to validated fields only (stripUnknown: true)
```

### Health Profile Constraints

```
gender: 'male' | 'female'
age: 10–120
goal: 'lose-weight' | 'gain-weight' | 'improve-health'
height: 50–300 (cm)
currentWeight: 20–500 (kg)
desiredWeight: 20–500 (kg)
activityLevel: 'sedentary' | 'lightly-active' | 'moderately-active' | 'very-active' | 'extremely-active'
mealsPerDay: 3 | 4 | 5
diseases: array of ['diabetes', 'kidney-disease', 'high-uric-acid', 'hypertension']
```

### Input Sanitization for AI Prompts

In `promptBuilder.js`, user-provided strings (cuisine preference, favourite meal, diet preference) are sanitized before injection into prompts:

```javascript
function sanitize(str) {
  return str?.replace(/[`'"\\{}[\]<>]/g, '').trim().slice(0, 100) ?? ''
}
```

This prevents prompt injection by stripping control characters and limiting length to 100 characters.

---

## 7. AI Context Preparation

### Prompt Architecture

Each meal gets an **individual prompt** with full nutrition targets and restriction lists. There is no shared conversation context across meals — each is a stateless call.

### Prompt Template Structure (`promptBuilder.js`)

```
You are a professional nutritionist and chef. Create a healthy meal plan entry.

MEAL DETAILS:
- Meal type: {mealType}
- Target calories: {calories} kcal
- Protein: {protein}g | Carbs: {carbs}g | Fat: {fat}g
- Goal: {goal}
- Diet preference: {dietPreference}
- Cuisine preference: {cuisinePreference}
[if diseases]:
- Medical conditions: {diseases.join(', ')}

[if forbiddenIngredients]:
STRICTLY FORBIDDEN INGREDIENTS (never use):
{forbiddenIngredients list}

[if limitedIngredients]:
LIMIT THESE INGREDIENTS (use sparingly or avoid):
{limitedIngredients list}

[if preferredIngredients]:
PREFERRED INGREDIENTS for these conditions:
{preferredIngredients list}

[if favoriteMeal]:
Consider incorporating elements similar to: {favoriteMeal}

[if errorFeedback]:
IMPORTANT - Previous attempt failed: {errorFeedback}
Please fix these issues.

CRITICAL RULES:
- Return ONLY valid JSON — no markdown, no explanation
- DO NOT include any calorie counts, macro numbers, or nutritional data
- Required fields: name, description, ingredients (array), benefits (array)

Return format:
{
  "name": "...",
  "description": "...",
  "ingredients": ["ingredient1", "ingredient2"],
  "benefits": ["benefit1", "benefit2"]
}
```

### System Prompt Strategy

The project uses **user-role messages only** (no system role message). The full instruction context is embedded directly in the user turn. LM Studio is called with `messages: [{ role: "user", content: fullPrompt }]`.

### Error Feedback Loop

If a meal fails validation (wrong schema, forbidden ingredient, numeric field found), the **next retry injects the failure reason** back into the prompt via the `errorFeedback` parameter, guiding the model to avoid the same mistake.

---

## 8. AI Techniques

| Technique | Used? | Details |
|-----------|-------|---------|
| **Prompt Engineering** | ✅ Yes | Primary technique. Structured templates with explicit constraints and JSON format instructions |
| **Prompt Templates** | ✅ Yes | `buildMealPrompt()` with parameterized slots for nutrition targets, restrictions, preferences |
| **Prompt Injection Prevention** | ✅ Yes | User input sanitized before prompt insertion |
| **Error-Feedback Prompting** | ✅ Yes | Failed validation reasons injected into retry prompts |
| **Retrieval-Augmented Generation (RAG)** | ❌ No | No vector database, no document retrieval |
| **Fine-tuning** | ❌ No | No model training or adaptation |
| **Embeddings** | ❌ No | No semantic similarity or vector operations |
| **Few-shot Examples** | ❌ No | No example meals in the prompt |
| **Chain-of-Thought** | ❌ No | Model told to output JSON directly, not reasoning steps |
| **Tool Use / Function Calling** | ❌ No | Raw text completion, JSON parsed manually |
| **Streaming** | ❌ No | `stream: false`, synchronous response |

### Key AI Design Constraint

The system is deliberately designed so the AI **cannot affect nutrition values**. All calories and macros are calculated before the AI is called and injected post-generation. The AI is given the target values as context (so it can describe the meal appropriately) but its numerical output is stripped by `sanitizeResponse()`:

```javascript
// src/services/ai/mealGenerator.js
const FORBIDDEN_NUMERIC_FIELDS = [
  'calories', 'macros', 'protein', 'carbs', 'fat',
  'totalCalories', 'nutritionInfo', 'nutrients'
]
function sanitizeResponse(parsed) {
  for (const field of FORBIDDEN_NUMERIC_FIELDS) {
    if (field in parsed) throw new Error(`AI included forbidden field: ${field}`)
  }
  return { name, description, ingredients, benefits } // only these 4
}
```

---

## 9. End-to-End System Flow

### Full Pipeline: User Input → Stored Meal Plan

```
Step 1: Authentication
  POST /api/auth/login
  → JWT access token issued (15 min expiry)
  → Refresh token stored in User.refreshTokens[]

Step 2: Health Profile Setup
  POST /api/health-profile
  → Joi validation (age, weight, diseases enum, etc.)
  → Upserted to HealthProfile collection (one per user)

Step 3: Meal Plan Generation
  POST /api/meal-plans/generate

  [3a] Fetch health profile from MongoDB
       If height or currentWeight are missing from the profile, they are
       pre-filled from the User document (captured at registration)

  [3b] Nutrition Engine (deterministic):
       BMR = 10×weight + 6.25×height − 5×age ± constant
       TDEE = BMR × activityFactor
       calorieTarget = TDEE × goalMultiplier (clamped 1200–4000)
       macros = { protein: weight×1.8g, fat: 25%, carbs: remainder }
       mealDistribution = split across mealsPerDay (30/40/30 for 3 meals)
       duration = |currentWeight − desiredWeight| / 0.5kg/week (clamped 1–52 weeks)

  [3c] Disease Engine (if diseases present):
       For each disease → load rules from diseaseRules.js
       Apply strictest cap across all diseases (e.g., protein ≤ 0.8g/kg for kidney disease)
       Redistribute excess calories to uncapped macros
       Re-clamp after redistribution
       Feasibility check: if adjusted calories drift >10% from target → throw error
       Recalculate meal distribution from adjusted macros
       Build forbiddenIngredients[], limitedIngredients[], preferredIngredients[]

  [3d] Concurrent AI Generation (per meal, up to 3 concurrent, max 20 calls budget):
       For each day × each meal:
         Build prompt: buildMealPrompt({ mealType, calories, protein, carbs, fat,
                         goal, dietPreference, cuisinePreference, diseases,
                         forbiddenIngredients, limitedIngredients, preferredIngredients })
         Call LM Studio: POST /v1/chat/completions (30s timeout)
         Parse response: strip markdown → extract JSON
         Sanitize: reject any numeric fields

         [3d-retry] If generation fails (parse error, forbidden field):
           Inject errorFeedback into prompt, retry (max 2 attempts)

  [3e] Safety Validation (per meal):
       For each ingredient in AI response:
         Check against forbiddenIngredients using word-boundary regex
         e.g., /\bsugar\b/i — "sugar" matches, "sugarcane" does not (if "sugarcane" not forbidden)
       If unsafe: regenerate meal (up to 2 regen attempts per meal)
       If all retries fail: use fallback safe meal

  [3f] Schema Validation (AJV):
       Validate assembled plan JSON against strict mealPlan.schema.js
       Required: days[], each day has meals[], each meal has name/description/ingredients/benefits
       Reject unknown properties (additionalProperties: false)

  [3g] Logical Validation:
       For each day:
         Sum meal calories == day.totalCalories (±1% tolerance)
         protein×4 + carbs×4 + fat×9 ≈ totalCalories (±1% tolerance)
       For each meal:
         Individual macro arithmetic check
       On failure: log warning (plan saved with caveat, not rejected)

  [3h] Backend Nutrition Injection:
       Merge AI output (name, description, ingredients, benefits)
       with backend-computed (calories, protein, carbs, fat)
       into final meal object

  [3i] Persist to MongoDB:
       MealPlan saved with:
         - Full days/meals tree
         - duration { weeks, totalDays }
         - aiModel (from LM Studio response)
         - swapCount: 0
         - swapHistory: []

  [3j] Response:
       Return mealPlan + nutritionSummary
       If diseases: append medicalDisclaimer
       If unsupportedDiseases: list them in response

Step 4: Meal Swap
  POST /api/meal-plans/:planId/swap { dayIndex, mealIndex }
  → Locate target meal in plan
  → Re-run AI generation for that single meal (same nutrition targets)
  → Safety validation
  → Update meal in-place
  → Increment swapCount, append to swapHistory
  → Max 5 swaps per plan enforced

Step 5: Shopping List
  GET /api/meal-plans/:planId/shopping-list?startDay=1&endDay=7
  → Aggregate all ingredient strings from days 1–7
  → Categorize by keyword patterns
  → Return structured { categories: { Produce, Protein, Dairy, Grains, Pantry, Other } }
```

---

## 10. Summary

Eat Clean API is a **safety-first, AI-augmented meal planning system** built on a clear separation of concerns:

**What the backend owns (deterministic):**
- All nutritional calculations (BMR, TDEE, calories, macros, meal distribution)
- Disease restriction rules and macro adjustments
- Ingredient safety validation
- Data schema validation

**What the AI owns (creative):**
- Meal names and descriptions
- Ingredient suggestions (subject to safety filtering)
- Health benefit descriptions

This architecture ensures **medical safety is never delegated to the AI**. Even if the LLM suggests a meal with a forbidden ingredient (e.g., red meat for high-uric-acid patients), the safety validator catches and rejects it before the plan is saved. All numeric nutrition values in the final plan are provably backend-computed — the LLM cannot inflate or deflate calorie counts.

The development followed a **phased maturity model**:
- **Phase 1:** Hardened AI output with schema validation and retry logic
- **Phase 2:** Moved all nutrition calculation off the AI into deterministic pure functions
- **Phase 3:** Tightened prompt engineering to enforce creative-only AI output
- **Phase 4:** Added the disease restriction engine for medical-grade dietary compliance
- **Phase 5:** Production hardening (auth security, rate limiting, logging, UX features)

The project uses **no RAG, no embeddings, no fine-tuning** — it relies entirely on structured prompt engineering with strict output validation, making it portable across any OpenAI-compatible LLM endpoint without retraining.

### Inconsistencies Between Requirements and Implementation

| Requirement | Implementation Status |
|-------------|----------------------|
| Phase 1: `temperature: 0.2, top_p: 0.9` | Implemented as `temperature: 0.7` in `aiClient.js` — temperature is higher than specified |
| Phase 5: Unit test coverage for all services | Tests directory exists but coverage is partial; not all service modules have test files |
| Phase 3: MAX_RETRY=2 | Implemented correctly in `mealGenerator.js` |
| Phase 4: Sodium/potassium/sugar programmatic limits | Documented as intentionally NOT enforced (would require nutrition database); ingredient blacklists used as proxy |
| Phase 5: Morgan request logging | Morgan listed in dependencies but Winston-based custom `requestLogger` is used instead; Morgan is unused |
