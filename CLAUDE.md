# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Eat Clean API — a Node.js/Express REST API for health-focused meal planning. Features JWT authentication, MongoDB persistence via Mongoose, and AI-powered meal plan generation through LM Studio (local LLM). Includes a disease restriction engine for medically-aware meal planning.

## Commands

```bash
npm run dev    # Start dev server with nodemon (port 4000)
npm start      # Start production server
npm install    # Install dependencies
```

No test framework is configured. No linter is configured. Inline verification is done via `node -e` and `node --check`.

## Architecture

**Pattern:** Controller → Route → Model (standard Express MVC without views)

**Entry point:** `src/index.js` — configures middleware stack (helmet, cors, morgan, rate-limiter, JSON parser), connects to MongoDB, mounts routes under `/api`, serves Swagger docs at `/api/docs`.

**Key directories:**
- `src/controllers/` — business logic per domain (auth, health, mealplan, recipe)
- `src/models/` — Mongoose schemas (User, HealthProfile, MealPlan, Recipe)
- `src/routes/` — Express routers; `index.js` aggregates all route modules
- `src/middleware/auth.js` — JWT Bearer token verification (`requireAuth`)
- `src/config/` — MongoDB connection (`db.js`) and Swagger setup (`swagger.js`)
- `src/validators/` — Joi/schema validators (e.g. `mealPlan.schema.js`)
- `src/services/nutrition/` — deterministic nutrition engine (BMR, TDEE, calorie targets, macro calculation, meal distribution)
- `src/services/ai/` — AI integration layer (LM Studio client, prompt builder, meal generator, concurrency control)
- `src/services/disease/` — disease restriction & personalization engine
- `src/services/mealValidationService.js` — post-generation logical validation (calorie consistency, macro consistency, meals-per-day)

**Data flow:** User → HealthProfile → NutritionEngine (base macros) → DiseaseEngine (adjustments) → AI MealGenerator (creative content) → SafetyValidator → MealPlan (saved).

## Meal Plan Generation Pipeline

The generation flow in `mealplan.controller.js`:

1. **Base nutrition** — `generateNutritionPlan()` computes BMR → TDEE → calorie target → macros → meal distribution (purely deterministic, no disease logic)
2. **Disease adjustment** — if diseases present, `applyDiseaseAdjustments()` caps macros per disease rules, recalculates effective calories and meal distribution, runs feasibility check
3. **Prompt enrichment** — forbidden/limited/preferred ingredient lists injected into AI prompt
4. **AI generation** — per-meal concurrent generation via LM Studio with call budget (20 calls max)
5. **Safety validation** — each generated meal checked against forbidden ingredient lists (word-boundary regex matching). Unsafe meals regenerated (up to 2 regen attempts per meal)
6. **Schema + logical validation** — assembled plan validated for structure and macro consistency
7. **Save** — validated plan persisted to MongoDB

## Disease Engine (`src/services/disease/`)

Supports 4 diseases: `diabetes`, `kidney-disease`, `high-uric-acid`, `hypertension`.

**Files:**
- `diseaseRules.js` — rule config per disease (macro caps, forbidden/limited/preferred ingredients). Exports `SUPPORTED_DISEASES`, `getDiseaseRules()`, `getForbiddenIngredients()`, `getLimitedIngredients()`, `getPreferredIngredients()`
- `macroAdjuster.js` — `adjustMacrosForDiseases()` applies strictest cap per macro across all diseases, redistributes excess calories, re-clamps after redistribution
- `ingredientFilter.js` — `filterIngredients()` checks meal ingredients against forbidden lists using word-boundary regex (avoids false positives like "ham" matching "edamame")
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
- `nutritionEngine.js` — orchestrates all above into `generateNutritionPlan()`

## AI Layer (`src/services/ai/`)

- `aiClient.js` — HTTP client for LM Studio, response parsing
- `promptBuilder.js` — builds per-meal prompts with sanitized inputs. Supports forbidden/limited/preferred ingredient lists
- `mealGenerator.js` — `generateMeal()` with retry, sanitization (strips numeric fields from AI response)
- `concurrency.js` — `runWithConcurrency()` for parallel meal generation with configurable limit

## Key Technical Details

- **ES Modules** — uses `import/export` (`"type": "module"` in package.json)
- **Auth** — JWT tokens (7-day expiry), bcrypt password hashing, role-based (user/admin)
- **AI meal plan generation** — per-meal generation via LM Studio. AI produces only creative content (name, description, ingredients, benefits). All numeric nutrition values are backend-injected
- **Database** — MongoDB via Mongoose 8.x with `strictQuery: true`; schemas use timestamps and cross-collection references
- **Rate limiting** — 100 requests/minute on `/api` routes
- **Disease validation** — HealthProfile.diseases field has enum constraint: `['diabetes', 'kidney-disease', 'high-uric-acid', 'hypertension']`
- **Medical disclaimer** — API response includes disclaimer when diseases are present

## Environment Variables

Required in `.env` (see `.env.example`):
- `PORT` — server port (default 4000)
- `MONGODB_URI` — MongoDB connection string (Atlas or local)
- `JWT_SECRET` — secret for signing JWT tokens
- `LM_STUDIO_URL` — LM Studio chat completions endpoint

## API Routes

All routes prefixed with `/api`:
- `/api/auth` — register, login, logout, profile, delete user
- `/api/health-profile` — CRUD for user health questionnaire (one per user)
- `/api/meal-plans` — AI generation (`POST /generate`), list with pagination, delete
- `/api/recipes` — public read, authenticated write
- `/health` — health check endpoint (no `/api` prefix)

## Git Workflow

- Main branch: `master`
- Development branch: `develop`
