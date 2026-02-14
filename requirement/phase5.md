You are a senior backend engineer building production-grade features
for a health-tech meal planning API.

Context:

- Express + ES Modules
- MongoDB + Mongoose
- Phase 1: Validation layer (AJV schema + logical validation + retry)
- Phase 2: Deterministic nutrition engine (BMR/TDEE/macros/distribution)
- Phase 3: AI creative layer isolated (strict prompts, sanitization, guardrails)
- Phase 4: Disease restriction engine (macro adjustment, ingredient filtering, safety validation)
- Current state: Core generation pipeline is solid, but lacks production infrastructure and user engagement features

Goal of Phase 5:

Production Hardening & User Experience Enhancement.
Two tracks:
  A) Make the existing system production-ready (testing, validation, logging, auth)
  B) Add key user engagement features (favorites, meal swap, shopping list)

========================================
TRACK A: PRODUCTION HARDENING
========================================

========================================
1. ADD INPUT VALIDATION ON ALL ROUTES
========================================

Create:

src/validators/
  auth.validator.js
  healthProfile.validator.js
  recipe.validator.js

Use Joi for request body validation.

auth.validator.js:
- register: email (required, valid email), password (required, min 6), username (optional, alphanumeric), fullName (optional), phone (optional), birthday (optional, ISO date), gender (optional, enum: male/female/other)
- login: email (required), password (required)

healthProfile.validator.js:
- createOrUpdate: gender (required, enum: male/female), age (required, 1-120), goal (enum), height (1-300), currentWeight (1-500), desiredWeight (1-500), activityLevel (enum), mealsPerDay (1-6), diseases (array of enum: diabetes/kidney-disease/high-uric-acid/hypertension), cuisinePreference (array of strings, max 10)

recipe.validator.js:
- create/update: title (required, max 200), description (max 2000), calories (min 0), protein (min 0), carbs (min 0), fat (min 0), tags (array, max 20), ingredients (array, max 100), steps (array, max 50), imageUrl (valid URL)

Create validation middleware:

src/middleware/validate.js

Export:
validate(schema) -> Express middleware

Usage:
router.post('/register', validate(registerSchema), register);

Return 400 with clear error messages on validation failure:
{
  message: "Validation failed",
  errors: [
    { field: "email", message: "must be a valid email address" }
  ]
}

========================================
2. ADD STRUCTURED LOGGING
========================================

Replace ALL console.log/warn/error with structured logger.

Create:

src/utils/logger.js

Use Winston with:
- Levels: error, warn, info, debug
- JSON format in production
- Pretty print in development
- Timestamp on every log
- Request ID correlation

Configure transports:
- Console (always)
- File: logs/error.log (errors only)
- File: logs/combined.log (all levels)

Add request logging middleware:

src/middleware/requestLogger.js

- Generate unique requestId (uuid) per request
- Attach to req object
- Log: method, path, status, duration, userId (if auth'd)
- Replace morgan with custom middleware

Update these files to use logger:
- src/index.js (server startup, DB connection)
- src/config/db.js (connection events)
- src/controllers/mealplan.controller.js (generation flow, retries, errors)
- src/services/ai/mealGenerator.js (AI calls)
- src/services/disease/diseaseEngine.js (disease adjustments)

========================================
3. IMPROVE AUTHENTICATION
========================================

3a) Add refresh token system:

Modify User model - add:
  refreshTokens: [{ token: String, expiresAt: Date, createdAt: Date }]

New endpoints in auth.routes.js:
  POST /auth/refresh-token -> issue new access token using refresh token
  POST /auth/revoke-token -> revoke a specific refresh token

Flow:
- Login returns: { accessToken (15min), refreshToken (30 days), user }
- Client stores refreshToken securely
- When accessToken expires, call /auth/refresh-token
- Logout revokes the refresh token

3b) Add token blacklist for logout:

Create:
src/models/TokenBlacklist.js

Schema:
{
  token: String (indexed),
  expiresAt: Date (TTL index for auto-cleanup)
}

Modify auth middleware:
- Check if token is blacklisted before allowing request
- Logout adds token to blacklist

3c) Add login rate limiting:

Create:
src/middleware/loginLimiter.js

- Max 5 login attempts per email per 15 minutes
- Return 429 with retry-after header
- Use express-rate-limit with custom key generator (by email)

========================================
4. ADD DATABASE INDEXES
========================================

Add indexes to models:

User.js:
- email: unique index (already implicit from unique: true)
- username: unique sparse index (already implicit)

HealthProfile.js:
- userId: unique index (already implicit)

MealPlan.js:
- userId + createdAt: compound index (for listing with sort)
- userId: index (for count queries)

Recipe.js:
- title: text index (for search)
- tags: index (for tag filtering)
- author: index (for user's recipes)

TokenBlacklist.js:
- token: unique index
- expiresAt: TTL index (auto-delete expired tokens)

========================================
5. STANDARDIZE ERROR HANDLING
========================================

Create:

src/utils/AppError.js

Custom error class:
class AppError extends Error {
  constructor(message, statusCode, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

Export named factories:
- badRequest(message, errors)    -> 400
- unauthorized(message)          -> 401
- forbidden(message)             -> 403
- notFound(message)              -> 404
- conflict(message)              -> 409
- tooManyRequests(message)       -> 429
- internal(message)              -> 500

Create global error handler:

src/middleware/errorHandler.js

- Catch AppError -> return structured response
- Catch Mongoose ValidationError -> return 400
- Catch Mongoose CastError -> return 400 (invalid ObjectId)
- Catch JWT errors -> return 401
- Catch unknown -> return 500 (hide details in production)

Response format:
{
  message: "Human readable message",
  statusCode: 400,
  errors: []  // optional field-level errors
}

Update all controllers to use AppError instead of manual res.status().json().

========================================
6. ADD UNIT TESTS (CORE SERVICES)
========================================

Install: vitest

Create test structure:

tests/
  unit/
    services/
      nutrition/
        bmrCalculator.test.js
        tdeeCalculator.test.js
        calorieTargetCalculator.test.js
        macroCalculator.test.js
        mealMacroDistributor.test.js
        nutritionEngine.test.js
        durationCalculator.test.js
      disease/
        diseaseRules.test.js
        macroAdjuster.test.js
        ingredientFilter.test.js
        safetyValidator.test.js
        diseaseEngine.test.js
    validators/
      mealPlan.schema.test.js
    services/
      mealValidationService.test.js
  integration/
    auth.test.js
    healthProfile.test.js
    mealplan.test.js
    recipe.test.js

Test requirements:

Nutrition engine tests:
- BMR male/female calculation correctness
- TDEE with all activity levels
- Calorie target clamping (min 1200, max 4000)
- Macro distribution per goal
- Meal distribution for 3/4/5/6 meals
- Edge cases: extreme weights, ages, heights
- Rounding consistency (sum of meals = total)

Disease engine tests:
- Single disease macro adjustment
- Multi-disease strictest-cap-wins
- Forbidden ingredient detection (word-boundary matching)
- False positive prevention (ham vs edamame)
- Safety validation pass/fail
- Feasibility check for extreme combos

Validator tests:
- Valid meal plan passes
- Missing required fields rejected
- Invalid types rejected
- Edge cases (empty arrays, null values)

Add to package.json:
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}

========================================
TRACK B: USER EXPERIENCE FEATURES
========================================

========================================
7. ADD FAVORITES / BOOKMARKS SYSTEM
========================================

Create model:

src/models/Favorite.js

Schema:
{
  userId: ObjectId (ref: User, required),
  targetType: String (enum: ['meal-plan', 'recipe'], required),
  targetId: ObjectId (required),
  note: String (optional, max 500),
  createdAt: Date
}

Compound unique index: userId + targetType + targetId

Create:
src/controllers/favorite.controller.js
src/routes/favorite.routes.js

Endpoints:

POST   /api/favorites
  Body: { targetType, targetId, note? }
  Response: { ok: true, favorite }

GET    /api/favorites?type=meal-plan&limit=10&skip=0
  Query: type (optional filter), limit, skip
  Response: { favorites: [...], total, limit, skip }
  Populate target document (meal plan or recipe)

DELETE /api/favorites/:id
  Response: { ok: true }

GET    /api/favorites/check?targetType=recipe&targetId=xxx
  Quick check if user has favorited a specific item
  Response: { favorited: true/false, favoriteId?: "..." }

All endpoints require authentication.

========================================
8. ADD MEAL SWAP / SUBSTITUTION
========================================

Allow users to replace a single meal in a generated plan
without regenerating the entire plan.

New endpoint:

POST /api/meal-plans/:planId/swap

Body:
{
  dayIndex: 0,       // which day (0-based)
  mealIndex: 0,      // which meal in that day (0-based)
  reason?: "string"  // optional: "don't like fish", "allergic to nuts"
}

Flow:
1. Find meal plan by ID (must belong to user)
2. Get the target meal's macros (calories, protein, carbs, fat)
3. Get user's health profile for preferences
4. Call AI to generate ONE replacement meal with same macros
5. Run disease safety validation if applicable
6. Replace the meal in the plan document
7. Save updated plan
8. Return updated meal plan

Constraints:
- Max 5 swaps per plan (prevent abuse)
- Track swap count on MealPlan model:
    swapCount: { type: Number, default: 0 }
- Original meal preserved in swap history

Add to MealPlan model:
  swapHistory: [{
    dayIndex: Number,
    mealIndex: Number,
    originalMeal: Object,
    reason: String,
    swappedAt: Date
  }]

========================================
9. ADD SHOPPING LIST GENERATION
========================================

Generate aggregated shopping list from a meal plan.

New endpoint:

GET /api/meal-plans/:planId/shopping-list?days=1-7

Flow:
1. Find meal plan by ID
2. Extract all ingredients from specified day range
3. Aggregate and deduplicate ingredients
4. Group by category (produce, protein, dairy, grains, pantry)
5. Return structured list

Create:
src/services/shoppingListService.js

Function:
generateShoppingList(mealPlan, startDay, endDay)

Return:
{
  planId: "...",
  dayRange: { start: 1, end: 7 },
  categories: [
    {
      name: "Produce",
      items: [
        { name: "tomatoes", mentionCount: 5 },
        { name: "spinach", mentionCount: 3 }
      ]
    },
    {
      name: "Protein",
      items: [...]
    }
  ],
  totalItems: 25
}

Category classification:
- Use keyword matching for basic categorization
- Produce: fruits, vegetables, herbs
- Protein: meat, fish, poultry, tofu, tempeh, legumes
- Dairy: milk, cheese, yogurt, butter
- Grains: bread, rice, pasta, oats, quinoa
- Pantry: oil, spices, sauces, canned goods
- Other: anything not classified

Response format should be frontend-friendly for rendering a checklist.

========================================
10. ADD USER PROFILE UPDATE
========================================

Currently users cannot update their profile info after registration.

New endpoint:

PUT /api/auth/profile

Body (all optional):
{
  fullName: "New Name",
  phone: "+1234567890",
  birthday: "1990-01-01",
  gender: "male",
  username: "newusername"
}

Constraints:
- Cannot change email (immutable after registration)
- Cannot change password via this endpoint (separate flow)
- Username uniqueness check before update
- Validate input with Joi

Response:
{
  ok: true,
  user: { id, email, username, fullName, phone, birthday, gender, role }
}

========================================
STRICT RULES
========================================

- Do NOT break existing API responses
- Do NOT modify existing database documents structure (only ADD new fields/indexes)
- Do NOT remove any existing endpoints
- Keep controllers thin — logic in services
- All new code must use async/await
- All new code must use ES Modules (import/export)
- Reuse existing patterns (middleware, model, controller, route)
- Add clear JSDoc comments for new public functions
- Follow existing code style (no semicolons if project doesn't use them, etc.)

========================================
IMPLEMENTATION ORDER
========================================

Recommended order (dependencies):

1. AppError + error handler (foundation for everything)
2. Logger (needed by all subsequent work)
3. Input validators + validate middleware
4. Database indexes
5. Auth improvements (refresh token, blacklist, rate limit)
6. Unit tests (validate existing + new code)
7. Favorites system
8. User profile update
9. Meal swap
10. Shopping list

========================================
OUTPUT REQUIREMENTS
========================================

Return:

- Full code for all new files
- Updated existing files (models, controllers, routes, index.js)
- Required npm install commands
- Clear comments explaining design decisions
- No extra explanation outside code blocks

========================================
NPM PACKAGES NEEDED
========================================

npm install joi winston uuid
npm install -D vitest @vitest/coverage-v8
