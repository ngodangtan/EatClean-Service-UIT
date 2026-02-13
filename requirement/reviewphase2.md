You are a senior backend architect and health-tech system reviewer.

We just implemented PHASE 2 – Deterministic Nutrition Engine.

This includes:

- BMR calculation (Mifflin-St Jeor)
- TDEE calculation with activity factors
- Calorie target logic based on goal
- Macro percentage distribution
- Gram conversion
- Macro distribution per meal
- nutritionEngine wrapper
- Controller refactor so AI only generates creative content
- Backend overrides all macro & calorie values

Your task is to perform a deep production-level review.

========================================
1️⃣ MATHEMATICAL CORRECTNESS REVIEW
========================================

Check:

- BMR formula implementation
- Age calculation correctness
- Gender branching logic
- TDEE multiplier mapping accuracy
- Calorie target clamping (min 1200, max 4000)
- Macro percentage correctness
- Gram conversion (calories to grams)
- Rounding logic consistency
- Sum of distributed meal macros equals total macros
- Floating point accumulation errors

If mismatch possible:
Explain exact scenario.

========================================
2️⃣ DOMAIN VALIDITY (NUTRITION LOGIC)
========================================

Evaluate:

- Is 30/40/30 appropriate for weight loss?
- Is protein high enough for cutting?
- Should protein scale by bodyweight instead?
- Is fixed -400 kcal safe for all body sizes?
- Is 1200 kcal clamp too low for males?
- Is macro distribution realistic across meals?
- Edge case: extremely active user?
- Edge case: underweight user?

Identify domain weaknesses.

========================================
3️⃣ ARCHITECTURAL QUALITY REVIEW
========================================

Analyze:

- Separation of concerns
- Pure functions vs side effects
- Testability of each calculator
- Coupling between controller and engine
- Scalability if adding:
    - Disease restrictions
    - Personalized macro ratios
    - Dynamic carb cycling
- Reusability of nutritionEngine

========================================
4️⃣ FAILURE SCENARIOS
========================================

What happens if:

- healthProfile missing height?
- weight = 0?
- mealsPerDay = 0?
- negative values?
- invalid goal?
- extremely high activity factor?
- very young age?

Will system:
- crash?
- produce NaN?
- silently generate broken data?

Are all edge cases handled?

========================================
5️⃣ PERFORMANCE REVIEW
========================================

Check:

- Any unnecessary recalculations?
- Any repeated object cloning?
- Any blocking sync operations?
- Any hidden O(n^2) patterns?

========================================
6️⃣ SECURITY REVIEW
========================================

Check:

- Can malicious healthProfile break math?
- Any injection possibility?
- Any unsafe assumptions?
- Any potential overflow issues?

========================================
7️⃣ FUTURE SCALABILITY ANALYSIS
========================================

Evaluate readiness for:

- Disease restriction engine
- Ingredient filtering
- Macro personalization per user
- Weekly macro variation
- Adaptive calorie adjustment

========================================
8️⃣ OUTPUT FORMAT
========================================

Structure response:

## ✅ What Is Strong
- Bullet points

## ⚠ Critical Issues (High Risk)
For each:
- Description
- Why dangerous
- Fix suggestion

## ⚠ Medium Risk Issues

## ⚠ Low Risk Improvements

## 🧠 Architecture Improvement Suggestions

Be strict.
Be analytical.
Be precise.
Do not rewrite entire code.
Focus on review only.
