You are a senior backend engineer specializing in AI-controlled generation systems.

Context:

- Express + ES Modules API
- MongoDB + Mongoose
- Phase 1: Validation Layer implemented
- Phase 2: Deterministic Nutrition Engine implemented
- Backend now calculates:
    - BMR
    - TDEE
    - Calorie target
    - Macro distribution
    - Meal macro split

Goal of Phase 3:

AI must only generate creative meal content.
AI must NOT generate:
- macros
- calories
- totalCalories
- macro percentages
- numeric nutrition values

Backend must override all macro/calorie values.

========================================
1️⃣ CREATE AI SERVICE LAYER
========================================

Create:

src/services/ai/
  aiClient.js
  mealGenerator.js
  promptBuilder.js

Responsibilities:

aiClient.js:
- Handle LM Studio calls
- Set temperature: 0.2
- top_p: 0.9
- Max tokens reasonable limit
- Timeout protection
- Safe JSON parsing

promptBuilder.js:
- Build strict prompt
- Prevent AI from generating macros
- Clearly instruct:
  "DO NOT include calories or macros in output"

mealGenerator.js:
- Generate ONE meal at a time
- Input:
    {
      mealType,
      calories,
      protein,
      carbs,
      fat,
      cuisinePreference,
      diseases
    }
- Output:
    {
      name,
      description,
      ingredients,
      benefits
    }

========================================
2️⃣ STRICT PROMPT DESIGN
========================================

Prompt must:

- Explicitly forbid numeric nutrition output
- Tell AI to return ONLY JSON
- No explanations
- No markdown
- No extra fields

Format required:

{
  "name": "...",
  "description": "...",
  "ingredients": ["..."],
  "benefits": ["..."]
}

If AI includes:
- calories
- macros
- nutrition facts

Reject and regenerate.

========================================
3️⃣ IMPLEMENT RESPONSE SANITIZATION
========================================

After AI response:

- Validate JSON shape
- Strip unknown fields
- Reject if:
    - numeric nutrition values found
    - empty ingredients
    - empty name

Retry max 2 times.

========================================
4️⃣ MODIFY mealplan.controller.js
========================================

New generation flow:

1. Call nutritionEngine (Phase 2)
2. For each meal in mealDistribution:
    - Call mealGenerator.generateMeal(...)
    - Inject:
        calories
        macros
    - Do NOT trust AI for numbers
3. Assemble full day
4. Run Phase 1 validation
5. Save to DB

========================================
5️⃣ ADD GUARDRAILS
========================================

Add protection:

- Max token limit
- Response size limit
- Timeout handling
- Catch invalid JSON
- Safe fallback error

========================================
6️⃣ ERROR STRATEGY
========================================

If AI fails 2 times:

Return:
{
  message: "Meal content generation failed",
  reason: "AI creative generation invalid"
}

Do NOT fallback to raw AI output.

========================================
7️⃣ CLEAN CODE REQUIREMENTS
========================================

- Controller must remain thin
- All AI logic isolated
- No duplicated prompt logic
- Reusable for future recipe generation
- Async/await
- Clear error handling

========================================
8️⃣ OUTPUT REQUIREMENTS
========================================

Return:

- Full code for:
    aiClient.js
    promptBuilder.js
    mealGenerator.js
- Updated mealplan.controller.js
- Comments explaining architectural decisions
- No explanation outside code blocks
