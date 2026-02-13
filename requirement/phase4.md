You are a senior backend architect designing a production-grade 
Disease Restriction & Personalization Engine for a health-tech API.

Context:

- Express + ES Modules
- MongoDB + Mongoose
- Phase 1: Validation layer implemented
- Phase 2: Deterministic nutrition engine implemented
- Phase 3: AI creative layer isolated and controlled
- Backend controls all macros & calories
- AI only generates creative meal content

Goal of Phase 4:

Introduce:
1) Disease-aware macro adjustment
2) Ingredient restriction engine
3) Blacklist / whitelist filtering
4) Safety rules enforcement
5) Adaptive personalization extension-ready architecture

========================================
1️⃣ CREATE DISEASE ENGINE STRUCTURE
========================================

Create:

src/services/disease/
  diseaseRules.js
  macroAdjuster.js
  ingredientFilter.js
  safetyValidator.js
  diseaseEngine.js

All logic must be deterministic.
No AI logic inside disease engine.

========================================
2️⃣ IMPLEMENT DISEASE RULES CONFIG
========================================

In diseaseRules.js define rule-based configurations.

Example diseases to support:

- high-uric-acid
- kidney-disease
- diabetes
- hypertension

Each disease rule must define:

{
  macroAdjustment: {
     proteinMaxPercent?,
     carbMaxPercent?,
     fatMaxPercent?,
     sodiumMaxMg?,
     sugarMaxG?
  },
  forbiddenIngredients: [],
  limitedIngredients: [],
  preferredIngredients: []
}

Rules must be easy to extend.

========================================
3️⃣ MACRO ADJUSTMENT ENGINE
========================================

macroAdjuster.js:

Input:
{
  baseMacros,
  diseases
}

Logic:

- Apply strictest rule if multiple diseases
- Clamp protein if kidney disease
- Reduce purine-rich protein if high-uric-acid
- Reduce carbs if diabetes
- Reduce sodium-sensitive foods if hypertension

Return adjusted macro distribution.

========================================
4️⃣ INGREDIENT FILTER ENGINE
========================================

ingredientFilter.js:

After AI generates meal:

- Remove forbidden ingredients
- Replace with safe alternatives
- If unsafe meal:
    regenerate via AI

Must not silently allow unsafe food.

========================================
5️⃣ SAFETY VALIDATION
========================================

safetyValidator.js:

Check:

- No forbidden ingredient present
- Macros do not exceed disease constraints
- Calories within safe limit
- Sugar limit respected if diabetes
- Protein cap respected if kidney disease

Return:
{
  valid: boolean,
  reason?: string
}

========================================
6️⃣ DISEASE ENGINE WRAPPER
========================================

diseaseEngine.js:

Input:
{
  healthProfile,
  baseNutritionPlan
}

Flow:

1. Adjust macros via macroAdjuster
2. Update mealDistribution
3. After AI creative generation:
   - Run ingredientFilter
   - Run safetyValidator
4. If invalid:
   - Regenerate creative meal
   - Max retry 2

Return safe final meal plan.

========================================
7️⃣ MODIFY mealplan.controller.js
========================================

New flow:

1. Generate base plan via nutritionEngine
2. Apply diseaseEngine adjustments
3. Generate creative meals via AI
4. Validate via Phase 1 validation
5. Save

========================================
8️⃣ STRICT SAFETY RULES
========================================

- Never ignore disease restrictions
- If safety validation fails twice:
    abort generation
- Return error:
  {
    message: "Unable to generate safe meal plan for selected health conditions"
  }

========================================
9️⃣ ARCHITECTURE REQUIREMENTS
========================================

- Clean separation of domain layers
- Deterministic logic only
- Easy to add new disease rules
- No hard-coded disease logic in controller
- No duplication of macro calculation logic
- Extendable for future personalization

========================================
🔟 OUTPUT REQUIREMENTS
========================================

Return:

- Full code for all new disease engine files
- Updated mealplan.controller.js
- Comments explaining disease rule design
- No explanation outside code blocks
