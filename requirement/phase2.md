You are a senior backend engineer designing a deterministic nutrition engine 
for a production health-tech API.

Context:

- Express + ES Modules project
- MongoDB + Mongoose
- HealthProfile model already exists
- MealPlan schema already exists
- Phase 1 validation layer already implemented
- AI generation currently produces full meal plans

Your task:

Implement PHASE 2 – Deterministic Nutrition Engine.

The goal is:
AI must NOT calculate calories or macros anymore.
Backend must calculate:
- BMR
- TDEE
- Target calories
- Macro distribution
- Macro split per meal

========================================
1️⃣ CREATE SERVICE STRUCTURE
========================================

Create:

src/services/nutrition/
  bmrCalculator.js
  tdeeCalculator.js
  macroCalculator.js
  calorieTargetCalculator.js
  mealMacroDistributor.js
  nutritionEngine.js

Keep functions pure.
No DB calls inside calculators.

========================================
2️⃣ IMPLEMENT BMR CALCULATION
========================================

Use Mifflin-St Jeor formula:

Male:
BMR = 10W + 6.25H - 5A + 5

Female:
BMR = 10W + 6.25H - 5A - 161

W = weight (kg)
H = height (cm)
A = age

Export:
calculateBMR({ weight, height, age, gender })

Return number.

========================================
3️⃣ IMPLEMENT TDEE CALCULATION
========================================

Map activityLevel:

sedentary → 1.2
lightly-active → 1.375
moderately-active → 1.55
very-active → 1.725
extremely-active → 1.9

Export:
calculateTDEE(bmr, activityLevel)

========================================
4️⃣ IMPLEMENT CALORIE TARGET LOGIC
========================================

If goal:
- lose-weight → TDEE - 400
- gain-weight → TDEE + 300
- improve-health → TDEE

Clamp:
- Never below 1200 calories
- Never above 4000 calories

Export:
calculateCalorieTarget(tdee, goal)

========================================
5️⃣ IMPLEMENT MACRO DISTRIBUTION
========================================

Use macro percentage by goal:

lose-weight:
- protein 30%
- carbs 40%
- fat 30%

gain-weight:
- protein 25%
- carbs 50%
- fat 25%

improve-health:
- protein 25%
- carbs 45%
- fat 30%

Convert to grams:
protein = (calories * protein%) / 4
carbs = (calories * carbs%) / 4
fat = (calories * fat%) / 9

Round to nearest integer.

Export:
calculateMacros(calorieTarget, goal)

========================================
6️⃣ DISTRIBUTE MACROS PER MEAL
========================================

Use mealsPerDay from healthProfile.

Distribution rule:

If 3 meals:
Breakfast → 30%
Lunch → 40%
Dinner → 30%

If 4 meals:
25% each

If 5 meals:
20% each

Return array:
[
 { mealType, calories, protein, carbs, fat }
]

Export:
distributeMacros(totalMacros, mealsPerDay)

========================================
7️⃣ CREATE NUTRITION ENGINE WRAPPER
========================================

nutritionEngine.js

Export:
generateNutritionPlan(healthProfile)

Return:

{
  calorieTarget,
  macros,
  mealDistribution: [...]
}

========================================
8️⃣ MODIFY mealplan.controller.js
========================================

New flow:

1. Fetch healthProfile
2. Call generateNutritionPlan(healthProfile)
3. For each meal in mealDistribution:
    Call AI with strict prompt:

    "Generate ONE meal that must match exactly:
     Calories: X
     Protein: Xg
     Carbs: Xg
     Fat: Xg
     Cuisine: healthProfile.cuisinePreference
     Disease restriction: healthProfile.diseases"

AI should only generate:
- name
- description
- ingredients
- benefits

Backend must:
- Inject calculated calories
- Inject calculated macros
- Not trust AI macros

4. Assemble full MealPlan object
5. Run Phase 1 validation
6. Save to DB

========================================
9️⃣ STRICT RULES
========================================

- AI must NOT decide macros
- Backend overrides all macro values
- Keep controller clean
- Use async/await
- No breaking API changes
- Do not modify database schema
- Add clear comments

========================================
🔟 OUTPUT REQUIREMENTS
========================================

Return:

- Full code for all new files
- Updated mealplan.controller.js
- Clear explanation comments
- No extra explanation outside code blocks
