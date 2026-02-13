You are a senior backend engineer.

Refactor the Eat Clean API to implement PHASE 1 – AI Hardening and Validation Layer.

Current context:
- Express + ES Modules architecture
- AI meal plan generation via LM Studio in mealplan.controller.js
- MealPlan structure already defined in MongoDB
- AI response is parsed and saved directly without strict validation

Your task is to implement:

========================================
1️⃣ ADD STRICT JSON SCHEMA VALIDATION
========================================

Create:
src/validators/mealPlan.schema.js

Use AJV for JSON schema validation.

The schema MUST strictly validate:

- title: string (required)
- days: array (minItems: 1, required)
- each day must include:
    - day (number)
    - title (string)
    - totalCalories (number)
    - macros (object with protein, carbs, fat numbers)
    - meals (array, minItems: 1)
- each meal must include:
    - mealType (string)
    - name (string)
    - description (string)
    - ingredients (array)
    - benefits (array)
    - calories (number)
    - macros (object with protein, carbs, fat numbers)

Reject unknown properties.

Export a function:
validateMealPlan(data)

Return:
{ valid: true } 
or 
{ valid: false, errors: [...] }

========================================
2️⃣ ADD LOGICAL VALIDATION LAYER
========================================

Create:
src/services/mealValidationService.js

Implement:

validateCaloriesConsistency(day):
- Sum meal.calories
- Compare with day.totalCalories
- Allow max 5% deviation

validateMacroConsistency(day):
- Check protein*4 + carbs*4 + fat*9 ≈ totalCalories
- Allow 5% deviation

validateMealsPerDay(dayCount, expectedMealsPerDay)

Export:
validateFullMealPlan(plan, healthProfile)

Return:
{
  valid: boolean,
  errors: string[]
}

========================================
3️⃣ ADD RETRY LOGIC IN mealplan.controller.js
========================================

Modify AI generation flow:

- MAX_RETRY = 2
- If:
   - JSON schema invalid
   - Macro mismatch
   - Calories mismatch
   - Wrong meals per day

→ Regenerate with error feedback prompt.

If still invalid after retries:
Return 500 error:
{
  message: "AI generated invalid meal plan after retries"
}

========================================
4️⃣ LOWER AI RANDOMNESS
========================================

In LM Studio request:
- Set temperature to 0.2
- Set top_p to 0.9

========================================
5️⃣ DO NOT CHANGE DATABASE STRUCTURE
========================================

Keep:
- MealPlan model unchanged
- Existing routes unchanged
- Only improve validation and generation reliability

========================================
6️⃣ ADD CLEAN CODE STRUCTURE
========================================

- Keep controller thin
- Move validation logic to services
- Use async/await
- Add meaningful error messages
- No breaking changes to API responses

========================================
7️⃣ OUTPUT REQUIREMENTS
========================================

Return:
- Full code for new files
- Updated mealplan.controller.js
- Any required npm install command
- Clear comments explaining changes
- No extra explanation outside code blocks
