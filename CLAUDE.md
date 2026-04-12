# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Eat Clean API — a Node.js/Express REST API for health-focused meal planning. Features JWT authentication, MongoDB persistence via Mongoose, and AI-powered meal plan generation through LM Studio (local LLM). Includes a disease restriction engine for medically-aware meal planning and a RAG (Retrieval-Augmented Generation) layer that grounds AI output in a curated knowledge base via ChromaDB vector search.

## Commands

```bash
npm run dev    # Start dev server with nodemon (port 4000)
npm start      # Start production server
npm install    # Install dependencies
npm test       # Run tests with Vitest
npm run test:watch  # Run tests in watch mode
npm run rag:index   # Index knowledge base JSON files into ChromaDB
npm run rag:start   # Start ChromaDB via Docker Compose
npm run rag:stop    # Stop ChromaDB Docker container
```

Test framework: **Vitest** (tests in `tests/` directory). No linter is configured. Inline verification is done via `node -e` and `node --check`.

## Architecture

**Pattern:** Controller → Route → Model (standard Express MVC without views)

**Entry point:** `src/index.js` — configures middleware stack (helmet, cors, requestLogger, rate-limiter, JSON parser, errorHandler), connects to MongoDB, mounts routes under `/api`, serves Swagger docs at `/api/docs`.

**Key directories:**
- `src/controllers/` — business logic per domain (auth, health, mealplan, disease, favorite)
- `src/models/` — Mongoose schemas (User, HealthProfile, MealPlan, Favorite, TokenBlacklist)
- `src/routes/` — Express routers; `index.js` aggregates all route modules
- `src/middleware/` — auth (JWT verification), errorHandler (centralized error handling), requestLogger (Winston-based request logging), validate (Joi schema validation middleware), loginLimiter (login-specific rate limiting)
- `src/config/` — MongoDB connection (`db.js`) and Swagger setup (`swagger.js`)
- `src/validators/` — Joi schema validators (auth, healthProfile, mealPlanGenerate, mealPlan)
- `src/data/diseaseCatalog.js` — single source of truth for diseases and their related health-test indicators (`supported` flag, indicator keys/units/ranges). Read by validators and the disease engine
- `src/utils/` — AppError (custom error class), logger (Winston logger instance)
- `src/services/nutrition/` — deterministic nutrition engine (BMR, TDEE, calorie targets, macro calculation, meal distribution)
- `src/services/ai/` — AI integration layer (LM Studio client, prompt builder, meal generator, concurrency control)
- `src/services/disease/` — disease restriction & personalization engine
- `src/services/rag/` — RAG layer (embedding client, ChromaDB vector store, retriever, context builder, indexer)
- `src/services/mealPlanPurposeService.js` — request-level rules for `POST /api/meal-plans/generate`: weight-goal contraindication checks, weightGoal→engine-goal mapping, Apple Watch TDEE override
- `src/data/knowledgeBase/` — curated Vietnamese JSON knowledge base (recipes.json, diseaseGuidelines.json, ingredients.json)
- `src/services/mealValidationService.js` — post-generation logical validation (calorie consistency, macro consistency, meals-per-day)
- `src/services/shoppingListService.js` — shopping list generation from meal plans
- `scripts/` — CLI utilities (`indexKnowledgeBase.js`)

**Data flow:** User → HealthProfile → NutritionEngine (base macros) → DiseaseEngine (adjustments) → RAG Retriever (vector search for relevant meals + guidelines) → promptBuilder (inject context) → AI MealGenerator (creative content) → SafetyValidator → MealPlan (saved).

## Meal Plan Generation Pipeline

`POST /api/meal-plans/generate` is **purpose-driven**. The required body field `purpose` selects one of three flows, each with its own request validation (Joi, in `src/validators/mealPlanGenerate.validator.js`) and runtime guards (in `mealPlanPurposeService.js`):

| `purpose` | Request body | Behavior |
|---|---|---|
| `daily_health_based` | optional `healthSnapshot` (Apple Watch / HealthKit: `restingEnergyKcal`, `activeEnergyKcal`, `steps`, `heartRateAvg`, `sleepHours`) | Generates a **single day**. If both resting + active energy are present, they override the BMR-based TDEE calculation. |
| `weight_management` | required `weightGoal` (`lose-weight \| gain-weight \| muscle-gain`), `desiredWeight`, `durationWeeks` (1\|2\|4) | Generates a 1/2/4-week plan. Request is **rejected with HTTP 400 + `reason: weight_goal_contraindication`** if `weightGoal` is medically incompatible with the user's recorded conditions. `muscle-gain` maps internally to engine goal `gain-weight`. |
| `disease_based` | required `durationWeeks` (1\|2\|4) | Generates a 1/2/4-week plan. Engine goal is **forced to `improve-health`** regardless of profile goal. Requires ≥1 disease on the profile. |

**Contraindication map** (`mealPlanPurposeService.js → WEIGHT_GOAL_CONTRAINDICATIONS`):
- `gain-weight` blocked by: `obesity`, `high-cholesterol`, `heart-disease`, `hypertension`
- `muscle-gain` blocked by: `kidney-disease`, `high-uric-acid`
- `lose-weight` blocked by: `anemia`

The contraindication check uses **all** disease keys on the profile (supported + unsupported by the macro engine) — e.g. `obesity` is unsupported by the macro engine but still blocks `gain-weight`.

The generation flow in `mealplan.controller.js`:

1. **Joi validation** (route middleware) — purpose-aware schema with `Joi.when()` rules
2. **Purpose branching** — sets `goalOverride`, `tdeeOverride`, `templateDays` (1 for daily, 7 otherwise), `requestedWeeks`, and runs contraindication checks
3. **Base nutrition** — `generateNutritionPlan(profile, { goalOverride, tdeeOverride })` computes BMR → TDEE → calorie target → macros → meal distribution. Returns the **effective `goal`** (after override) so downstream prompts stay coherent
4. **Disease adjustment** — if supported diseases present, `applyDiseaseAdjustments()` caps macros per disease rules, recalculates effective calories and meal distribution, runs feasibility check
5. **Duration** — `calculatePlanDuration({ goal, currentWeight, desiredWeight, requestedWeeks })`. `requestedWeeks` (when present) bypasses the weight-delta calculation entirely
6. **RAG retrieval** — for each unique mealType, retrieves semantically similar reference meals and disease guidelines from ChromaDB; injects as grounding context into the prompt. Graceful degradation: if ChromaDB or embedding is unavailable, generation continues without context
7. **Prompt enrichment** — forbidden/limited/preferred ingredient lists + RAG context injected into AI prompt. The prompt receives `nutritionPlan.goal` (effective goal), not the stale profile goal
8. **AI generation** — per-meal concurrent generation via LM Studio with call budget. For `daily_health_based` the budget is sized for a single day
9. **Safety validation** — each generated meal checked against forbidden ingredient lists (Unicode-aware lookaround regex — Vietnamese diacritics safe). Unsafe meals regenerated (up to 2 regen attempts per meal)
10. **Schema + logical validation** — assembled plan validated for structure and macro consistency
11. **Save** — validated plan persisted to MongoDB along with `purpose`. For `daily_health_based` the persisted `duration` is `{ weeks: 0, totalDays: 1 }`

## Disease Engine (`src/services/disease/`)

Supports 4 diseases (macro adjustment + ingredient filtering): `diabetes`, `kidney-disease`, `high-uric-acid`, `hypertension`.

The disease **catalog** (`src/data/diseaseCatalog.js`) is broader — it lists 10 conditions total (the 4 supported above plus `fatty-liver`, `high-cholesterol`, `heart-disease`, `obesity`, `anemia`, `gastritis`) with Vietnamese display names and per-disease health-test indicators (key, name, unit, normalRange). Unsupported entries can still be recorded on the user's profile and surfaced via `GET /api/diseases`; they are ignored by the macro engine but **are still consulted by the meal-plan purpose-level contraindication checks**.

**Files:**
- `diseaseRules.js` — rule config per disease (macro caps, forbidden/limited/preferred ingredients). Exports `SUPPORTED_DISEASES`, `getDiseaseRules()`, `getForbiddenIngredients()`, `getLimitedIngredients()`, `getPreferredIngredients()`
- `macroAdjuster.js` — `adjustMacrosForDiseases()` applies strictest cap per macro across all diseases, redistributes excess calories, re-clamps after redistribution
- `ingredientFilter.js` — `filterIngredients()` checks meal ingredients against forbidden lists using **Unicode-aware lookaround regex** (`(?<![\p{L}\p{N}])…(?![\p{L}\p{N}])` with `iu` flags). Critical: JS `\b` is ASCII-only and silently breaks on Vietnamese diacritics — do not switch back to `\b`
- `safetyValidator.js` — `validateMealSafety()` runs ingredient filtering, returns `{ valid, reasons }`
- `diseaseEngine.js` — orchestrator: `applyDiseaseAdjustments()` (macro adjustment + feasibility check + distribution recalc) and `validateGeneratedMeal()` (post-AI safety)

**Key design decisions:**
- Strictest-cap-wins for multi-disease users
- Post-redistribution re-clamping (calorie deficit preferred over exceeding a medical cap)
- Feasibility check throws if adjusted macros drift >10% from calorie target
- Unsupported disease names are logged and surfaced in API response
- Sodium/potassium/sugar limits NOT enforced programmatically (would require nutrition database); high-sodium/sugar foods are covered by ingredient blacklists as proxy

## Nutrition Engine (`src/services/nutrition/`)

Purely deterministic — no disease logic, no AI calls.

- `bmrCalculator.js` — Mifflin-St Jeor equation
- `tdeeCalculator.js` — activity multipliers (sedentary through extremely-active)
- `calorieTargetCalculator.js` — goal-based calorie adjustment
- `macroCalculator.js` — protein per kg by goal, fat %, carbs fill remainder
- `mealMacroDistributor.js` — splits macros across meals with rounding correction
- `durationCalculator.js` — `calculatePlanDuration({ goal, currentWeight, desiredWeight, requestedWeeks })`. `desiredWeight` is **request-scoped** (passed in `POST /api/meal-plans/generate`), no longer stored on `HealthProfile`. `requestedWeeks` (when provided) bypasses the weight-delta calculation
- `nutritionEngine.js` — orchestrates all above into `generateNutritionPlan(profile, { goalOverride, tdeeOverride })`. `goalOverride` lets `disease_based` force `improve-health`; `tdeeOverride` lets `daily_health_based` skip BMR/TDEE in favor of Apple Watch energy data. Returns the effective `goal` so callers can stay coherent

## AI Layer (`src/services/ai/`)

The app targets the **Vietnamese market**. Prompts instruct the model to produce all output in Vietnamese with diacritics; the knowledge base is in Vietnamese; the LM Studio embedding model is `bge-m3` (multilingual). Do not introduce English-only assumptions in prompts, retrievers, or filters.

- `aiClient.js` — HTTP client for LM Studio, response parsing
- `promptBuilder.js` — builds per-meal prompts with sanitized inputs. Supports forbidden/limited/preferred ingredient lists and `retrievedContext` (RAG). Vietnamese system prompt + JSON example. Exports `sanitizePromptInput` for reuse by RAG layer
- `mealGenerator.js` — `generateMeal()` with retry, sanitization (strips numeric fields from AI response). Accepts `retrievedContext` param and forwards it to `buildMealPrompt()`
- `concurrency.js` — `runWithConcurrency()` for parallel meal generation with configurable limit

## RAG Layer (`src/services/rag/`)

Retrieval-Augmented Generation — grounds AI meal generation in a curated knowledge base.

**Files:**
- `embeddingClient.js` — `getEmbedding(text)` / `getEmbeddingBatch(texts)` via LM Studio embedding endpoint. 10s timeout, graceful degradation (returns null on failure)
- `vectorStore.js` — ChromaDB client wrapper. `initializeCollection()`, `upsertDocuments()`, `queryDocuments()`, `healthCheck()`. Uses `host`/`port`/`ssl` (not deprecated `path`). Passes no-op embedding function to suppress DefaultEmbeddingFunction error
- `retriever.js` — `retrieveRelevantMeals(params)`, `retrieveDiseaseGuidelines(diseases)`, `retrieveIngredientInfo(names)`. Builds **Vietnamese** query strings via internal EN→VI maps (mealType, goal, cuisine, disease). Checks `RAG_ENABLED` env var — returns empty/null immediately if `"false"`
- `ragContextBuilder.js` — `buildMealContext(meals, guidelines)` formats retrieved content into a prompt-injectable string. Imports `sanitizePromptInput` from `promptBuilder.js`. Strips adversarial keywords (`ignore`, `forget`, `system`, `assistant`, `human`, `instruction`, `override`). Hard cap: 1500 chars
- `indexer.js` — `indexAllCollections()`, `indexRecipes()`, `indexGuidelines()`, `indexIngredients()`. Reads JSON from `src/data/knowledgeBase/`, generates embeddings in batches of 10, upserts to ChromaDB

**Knowledge base (`src/data/knowledgeBase/`):**

All content is **Vietnamese**. Filter metadata fields (`mealType`, `cuisine`, `goal`, `diseaseCompatible`, `tags`, `category`, `safeFor`, `avoidFor`, `disease`) remain English to keep retriever filters and the disease engine schema-stable.
- `recipes.json` — 35 curated Vietnamese recipes covering all 4 mealTypes, 3 goals, 4 diseases, 4+ cuisines
- `diseaseGuidelines.json` — Vietnamese dietary guidelines for all 4 supported diseases with recommended/avoid foods and meal tips
- `ingredients.json` — 46 ingredients (Vietnamese names) with disease safety flags (`safeFor`/`avoidFor`), nutrition profiles, substitutes

**Infrastructure:**
- `docker-compose.rag.yml` — ChromaDB persistent container on port 8000
- `scripts/indexKnowledgeBase.js` — CLI to index all knowledge base files into ChromaDB

**Key design decisions:**
- RAG is purely additive — zero changes to NutritionEngine, DiseaseEngine, or MealValidationService
- Graceful degradation is mandatory: any failure (Chroma down, embedding timeout, network error) logs a warning and falls back to generation without context
- Prompt injection prevention: `ragContextBuilder` sanitizes every field, strips adversarial keywords, enforces 1500-char hard cap
- Retrieved context is marked "inspiration only" in the prompt to prevent LLM from treating it as authoritative
- All numeric nutrition values remain backend-injected; knowledge base contains no calorie/macro numbers
- `RAG_ENABLED=false` disables all retrieval without code changes

## Key Technical Details

- **ES Modules** — uses `import/export` (`"type": "module"` in package.json)
- **Auth** — JWT access tokens (15-minute expiry) + refresh tokens (30-day expiry, stored in DB). Token rotation via `/api/auth/refresh-token`; revocation via `/api/auth/revoke-token`. bcrypt password hashing, role-based (user/admin)
- **AI meal plan generation** — per-meal generation via LM Studio. AI produces only creative content (name, description, ingredients, benefits) **in Vietnamese**. All numeric nutrition values are backend-injected
- **Database** — MongoDB via Mongoose 8.x with `strictQuery: true`; schemas use timestamps and cross-collection references
- **Rate limiting** — 100 requests/minute on `/api` routes
- **Disease validation** — `HealthProfile.diseases` is **not** a Mongoose enum. It is `[diseaseEntrySchema]` where each entry is `{ key, diagnosedAt, indicators: [{ key, value, unit, measuredAt, note }] }`. Disease keys, indicator keys, duplicates, and indicator-belongs-to-disease are cross-checked against `src/data/diseaseCatalog.js` in the controller after Joi validation. Indicator units are snapshotted from the catalog at write time so historical records stay interpretable if catalog units change
- **Health profile fields** — `desiredWeight` is **not** stored on the profile. It is request-scoped and supplied to `POST /api/meal-plans/generate` (purpose=weight_management). `gender`, `birthday`, `height`, `currentWeight` come from the user account at registration time
- **Medical disclaimer** — API response includes disclaimer when diseases are present

## Environment Variables

Required in `.env`:
- `PORT` — server port (default 4000)
- `MONGODB_URI` — MongoDB connection string (Atlas or local)
- `JWT_SECRET` — secret for signing access tokens
- `JWT_REFRESH_SECRET` — secret for signing refresh tokens
- `LM_STUDIO_URL` — LM Studio chat completions endpoint

RAG-specific:
- `LM_STUDIO_EMBEDDING_URL` — LM Studio embedding endpoint (e.g. `http://localhost:1234/v1/embeddings`)
- `EMBEDDING_MODEL` — embedding model name. Use a **multilingual** model — current default is `bge-m3` because the knowledge base and queries are Vietnamese
- `CHROMA_URL` — ChromaDB URL (default `http://localhost:8000`)
- `RAG_ENABLED` — set to `false` to disable RAG entirely without code changes (default `true`)

## API Routes

All routes prefixed with `/api`:
- `/api/auth` — register, login, logout, get profile, update profile, refresh token, revoke token, delete user
- `/api/health-profile` — create (POST), update (PUT, same handler — accepts partial payloads, arrays like `diseases` are replaced as a whole), get (GET), delete (DELETE) — one profile per user. **`desiredWeight` is not part of this resource — it lives on the meal-plan generate request.**
- `/api/diseases` — `GET` returns the disease catalog (`src/data/diseaseCatalog.js`) used by the create/update health-profile screen and indicator entry
- `/api/meal-plans` — AI generation (`POST /generate` — **requires `purpose` body field**, see Meal Plan Generation Pipeline above), list with pagination, get one, get latest (`GET /latest`), swap a meal (`POST /:planId/swap`), delete one, delete all
- `/api/health` — health check endpoint

**Removed:** `/api/recipes` (orphaned dead code, deleted along with its model/controller/routes/validator)

## Logging

Uses **Winston** for structured logging (`src/utils/logger.js`). Request logging via custom `requestLogger` middleware (morgan is listed in dependencies but unused).

## RAG Setup (first-time)

1. Start ChromaDB: `npm run rag:start`
2. Load a **multilingual** embedding model in LM Studio (current default: `bge-m3`) and start the server on port 1234
3. Index the knowledge base: `npm run rag:index`
4. ChromaDB data is persisted in a Docker volume (`chroma_data`) — re-index when knowledge base JSON files change **or when the embedding model changes** (the vector space is model-specific)

## Git Workflow

- Main branch: `master`
- Development branch: `develop`
