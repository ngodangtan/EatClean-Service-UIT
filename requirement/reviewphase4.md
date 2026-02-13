You are a senior health-tech backend architect reviewing a
Disease Restriction & Personalization Engine for production use.

System context:

- Phase 1: Validation layer (schema + macro checks)
- Phase 2: Deterministic nutrition engine
- Phase 3: AI creative layer with guardrails
- Phase 4:
    - Disease rule configuration
    - Macro adjustment engine
    - Ingredient filtering engine
    - Safety validator
    - Disease engine wrapper
    - Multi-disease support

Your task:

Perform a deep production-level review focused on medical safety,
logic correctness, scalability, and real-world failure scenarios.

========================================
REVIEW RESULTS
========================================

## Strengths

- **Clean separation of concerns**: Disease logic fully extracted from `nutritionEngine.js` into its own `src/services/disease/` module. Nutrition engine stays purely computational — no disease coupling.
- **Strictest-cap-wins strategy**: `macroAdjuster.js:20-43` collects the minimum cap across all diseases before applying, preventing one disease from overriding another's stricter requirement.
- **Layered defense for ingredient safety**: Three layers — prompt injection (forbiddenIngredients in AI prompt), post-generation filtering (`ingredientFilter.js`), and safety validation (`safetyValidator.js`). AI is told not to use them AND the backend verifies after generation.
- **Per-meal retry with budget awareness**: Controller (lines 116-150) retries only the specific unsafe meal, not the entire plan. Respects global `callBudget` so retries can't run unbounded.
- **Prompt sanitization preserved**: `forbiddenIngredients` array goes through `sanitizePromptArray()` with a cap of 50 items — prevents overly long prompt injection.
- **Fail-safe on exhaustion**: If all retries fail, system returns a clear safety-specific error message (`"Unable to generate safe meal plan for selected health conditions"`) — no partial unsafe data is saved.
- **Extensible rule structure**: Each disease rule has consistent shape (`macroAdjustment`, `forbiddenIngredients`, `limitedIngredients`, `preferredIngredients`), making it straightforward to add new diseases.

## Critical Medical Risks (High Severity)

### 1. `maxSodiumMg`, `maxSugarGrams`, `maxPotassiumMg` are declared but never enforced

**Location**: `diseaseRules.js:10,29-30,70`
**Description**: Kidney-disease defines `maxSodiumMg: 1500` and `maxPotassiumMg: 2000`. Hypertension defines `maxSodiumMg: 1500`. Diabetes defines `maxSugarGrams: 25`. However, `macroAdjuster.js` only processes `maxCarbPct`, `maxProteinPerKg`, `maxProteinPct`, and `maxFatPct`. The sodium/sugar/potassium values are inert data — they exist in config but nothing reads or enforces them.
**Real-world consequence**: A kidney disease patient could receive a meal plan with 3000mg+ sodium. A diabetic patient could get meals with 50g+ added sugar. Both are medically dangerous and could cause acute episodes (hyperkalemia, hyperglycemia).
**Required fix**: Either (a) implement sodium/sugar/potassium enforcement in `safetyValidator.js` by estimating from ingredient profiles, or (b) remove these fields to avoid false confidence that they're being checked, and add a comment that sodium/sugar enforcement requires a nutrition database integration.

### 2. `limitedIngredients` lists are declared but never consumed

**Location**: `diseaseRules.js:17-20,38-41,58-61,78-81`
**Description**: Each disease defines `limitedIngredients` (e.g., `'white rice'`, `'banana'` for diabetes), but no code reads these arrays. They are not sent to the AI prompt, not checked by `ingredientFilter.js`, and not used anywhere.
**Real-world consequence**: Limited ingredients (which should trigger warnings or portion controls) are silently ignored. A diabetic user could receive a meal with white rice as the main carb source with no flag.
**Required fix**: Either (a) add limited ingredients to the AI prompt as "use sparingly" guidance, or (b) add a warning-level check in `safetyValidator.js` that flags (but doesn't reject) meals containing limited ingredients, or (c) remove the field to avoid dead config.

### 3. `preferredIngredients` not sent to AI prompt

**Location**: `diseaseRules.js:21-24,42-45,62-65,82-85` and `promptBuilder.js`
**Description**: Preferred ingredients are exported via `getPreferredIngredients()` but never called from the controller or prompt builder. The AI receives forbidden ingredients but no positive guidance toward safer alternatives.
**Real-world consequence**: Lower meal quality for disease users. The AI might avoid forbidden foods but default to generic alternatives rather than clinically preferred ones (e.g., not suggesting quinoa/berries for diabetics when they're specifically beneficial).
**Required fix**: Call `getPreferredIngredients(diseases)` in the controller and pass to `buildMealPrompt()` with a line like "Prefer these ingredients when possible: [list]".

### 4. Duplicate ingredient check in `validateGeneratedMeal`

**Location**: `diseaseEngine.js:47-51`
**Description**: `validateGeneratedMeal` calls both `filterIngredients()` and `validateMealSafety()`. But `validateMealSafety()` internally also calls `filterIngredients()`. The ingredient check runs twice for every meal validation, and the results of the first call (`ingredientResult`) are checked for `safe` but its reasons are discarded — only `safetyResult.reasons` is collected. This means the `safe` flag on line 51 could theoretically diverge from the reasons array (safe=false from ingredientResult but no matching reason in allReasons), though currently they'll always match since safetyValidator wraps the same check.
**Real-world consequence**: No immediate safety risk, but wasteful computation and confusing architecture. If `safetyValidator` is extended later with additional checks that happen to mask the ingredient failure, a meal could be flagged as unsafe with no explanation in the reasons array.
**Required fix**: Remove the redundant `filterIngredients()` call from `validateGeneratedMeal()`. Rely solely on `validateMealSafety()` which already calls it internally.

## Logical Weaknesses (Medium Risk)

### 5. Macro redistribution can exceed capped macros

**Location**: `macroAdjuster.js:82-93`
**Description**: When all three macro categories have caps, the fallback splits excess calories between carbs and fat (lines 89-92). But this addition happens AFTER the caps were applied. If carbs were capped at 35% and 100 excess calories are split, carbs get `Math.round(50/4) = 13g` added — potentially pushing carbs above the 35% cap.
**Real-world consequence**: A diabetes + hypertension + high-uric-acid patient (all macros capped) could end up with carbs above the diabetes cap after redistribution, defeating the purpose of the cap.
**Required fix**: After redistribution, re-validate that no cap is exceeded. If redistribution would violate a cap, the excess should go to the remaining uncapped macro or be accepted as a calorie deficit (which is safer than exceeding a medical cap).

### 6. No feasibility check before generating

**Location**: `macroAdjuster.js`, `diseaseEngine.js`
**Description**: For extreme combinations (e.g., kidney-disease + high-uric-acid + low calorie target), protein is capped both by `maxProteinPerKg` (0.8g/kg) AND `maxProteinPct` (30%). For a 50kg person with 1400 cal target, that's min(40g, 105g) = 40g protein, which is only 11% of calories. Combined with fat capped at 25%, carbs would need to absorb ~64% — but if the user also has diabetes (maxCarbPct: 35%), the math becomes: protein 11% + carbs 35% + fat 25% = 71%. The remaining 29% of calories (406 cal) have nowhere to go.
**Real-world consequence**: System silently produces an infeasible macro distribution that doesn't sum to the calorie target. The plan appears valid but is nutritionally incoherent.
**Required fix**: Add a feasibility check after `adjustMacrosForDiseases()` — verify that `protein*4 + carbs*4 + fat*9` is within ~5% of `calorieTarget`. If not, return a clear error: "The combination of health conditions makes it impossible to generate a safe meal plan at this calorie target. Please consult a healthcare provider."

### 7. Substring matching produces false positives

**Location**: `ingredientFilter.js:24`
**Description**: `ingredientLower.includes(f)` does substring matching. The forbidden ingredient `"ham"` (kidney-disease) will match `"edamame"`, `"hamburger bun"`, and `"chamomile tea"`. The forbidden `"beer"` will match `"beet"` (already does — "beer" is in high-uric-acid forbidden list, and beets are a preferred food for hypertension).
**Real-world consequence**: Safe ingredients get flagged as forbidden, triggering unnecessary meal regeneration. Wastes AI call budget and could cause all retries to fail for perfectly safe meals.
**Required fix**: Use word-boundary matching instead of plain substring: `new RegExp(`\\b${escapeRegex(f)}\\b`, 'i')`. Or require the forbidden term to appear as a standalone word/phrase.

### 8. `mealValidationService.js` macro consistency check may fail after disease adjustment

**Location**: `mealValidationService.js:16-23`, `mealplan.controller.js:195`
**Description**: `validateMacroConsistency()` checks that `protein*4 + carbs*4 + fat*9` is within 1% of `totalCalories`. After disease adjustment and redistribution with rounding, the reconstructed calories may drift more than 1% from the original `calorieTarget`. The controller sets `macros: { ...nutritionPlan.macros }` (the adjusted macros) and `totalCalories: nutritionPlan.calorieTarget` (the original target). If redistribution rounding causes drift, this validation will reject the plan on every attempt.
**Real-world consequence**: Plans for multi-disease users could fail validation 100% of the time, returning "logical validation failed" even though the macros are medically appropriate.
**Required fix**: Either (a) recalculate `totalCalories` from the adjusted macros after disease adjustment (`protein*4 + carbs*4 + fat*9`), or (b) widen the deviation threshold for disease-adjusted plans, or (c) store both the original calorie target and the adjusted effective calories.

## Minor Improvements

### 9. Unknown disease names silently ignored

**Location**: `diseaseRules.js:94-96`, `macroAdjuster.js:27-28`
**Description**: If `healthProfile.diseases` contains a value not in `DISEASE_RULES` (e.g., `"heart-disease"` as shown in the HealthProfile model comment), `getDiseaseRules()` returns `null` and the adjuster's `continue` silently skips it. No ingredient filtering, no macro adjustment, no warning.
**Real-world consequence**: A user with a disease the system doesn't know about gets a plan with zero disease accommodations and no indication that their condition wasn't handled.
**Required fix**: Log a warning when an unrecognized disease is encountered. Optionally, add an `UNSUPPORTED_DISEASES` response field so the API response indicates which conditions were not addressed.

### 10. `diseases` field in HealthProfile has no enum validation

**Location**: `HealthProfile.js:46`
**Description**: `diseases: [{ type: String }]` accepts any string. There's no enum constraint limiting values to the 4 supported diseases. Users (or frontend bugs) can store arbitrary disease names that the engine silently ignores.
**Required fix**: Add `enum: ['diabetes', 'kidney-disease', 'high-uric-acid', 'hypertension']` to the schema, or validate at the controller/route level before saving.

### 11. Safety retry loop off-by-one with final validation

**Location**: `mealplan.controller.js:116-150`
**Description**: The loop runs `safetyRetry` from 0 to `MAX_MEAL_SAFETY_RETRIES` (inclusive = 3 iterations). On the last iteration (`safetyRetry === 2`), the condition `safetyRetry < MAX_MEAL_SAFETY_RETRIES` (line 129) is false, so no regeneration happens — but the validate call on line 117 still runs. This means the loop does: validate → regen → validate → regen → validate (no regen). The final validate determines `mealSafe`. This is correct behavior, but the constant name `MAX_MEAL_SAFETY_RETRIES = 2` is misleading — it actually allows 2 regenerations and 3 validation attempts.
**Required fix**: Rename to `MAX_MEAL_REGEN_ATTEMPTS = 2` or add a comment clarifying the semantics.

### 12. Forbidden ingredient list could grow very large for 4-disease combo

**Location**: `diseaseRules.js:103-116`, `promptBuilder.js:82`
**Description**: A user with all 4 diseases would have ~50+ forbidden ingredients injected into every AI prompt. The `sanitizePromptArray` caps at 50 items, which is appropriate, but the resulting prompt becomes very long and may reduce AI generation quality or increase latency.
**Required fix**: Consider deduplicating overlapping entries across diseases (e.g., "bacon" appears in both kidney-disease and hypertension). The `Set` in `getForbiddenIngredients` already deduplicates, so this is partially handled. Monitor prompt token usage for 4-disease users.

## Strategic Architecture Advice

### Sodium/Potassium enforcement requires a nutrition database
The current architecture has no way to estimate sodium or potassium content from ingredient names alone. The AI returns ingredient strings like "chicken breast", not structured nutrition data. To properly enforce sodium/potassium limits, the system would need a food composition database (USDA FoodData Central or similar) to look up estimated micronutrient content per ingredient. This is a significant architectural addition. In the interim, the ingredient blacklist approach (banning high-sodium foods by name) is a reasonable proxy — but the `maxSodiumMg` config values should not exist in the codebase without enforcement, as they create false confidence.

### Consider a disease compatibility matrix
Not all disease combinations are medically coherent or handleable. Rather than silently attempting impossible macro combinations, define an explicit compatibility matrix that flags infeasible combinations upfront. For example, `kidney-disease + diabetes + high-uric-acid` produces extreme macro constraints that may be medically impossible to satisfy with food alone (these patients typically require clinical dietitian supervision).

### Ingredient matching needs a normalization layer
The current substring matching is brittle. AI models output ingredients inconsistently — "chicken breast", "boneless skinless chicken breast", "grilled chicken", "pollo" (if cuisine is Latin). A production system needs either: (a) a canonical ingredient ID system where AI maps to known ingredients, or (b) embedding-based similarity matching, or (c) a post-processing step that normalizes AI ingredient strings to canonical forms before filtering.

### Add medical disclaimer to API response
Any health-condition-aware meal plan should include a disclaimer in the API response: "This meal plan is generated by AI and is not a substitute for professional medical or dietary advice. Consult your healthcare provider before making dietary changes related to your health conditions." This is both a UX best practice and a legal requirement in most health-tech jurisdictions.

### Rule versioning for auditability
Disease rules are currently hard-coded constants. For a medical-grade system, rules should be versioned (e.g., `ruleVersion: "1.0.0"`) and the version used should be stored alongside each generated meal plan. This enables: (a) auditing which rules were active when a plan was generated, (b) rolling back rule changes if errors are discovered, (c) A/B testing different rule sets.
