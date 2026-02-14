# Test Results: Dynamic Meal Plan Duration (Weekly Template Rotation)

**Date:** 2026-02-14
**Feature:** Dynamic meal plan duration with 7-day weekly template rotation
**Test Account:** tan1@yopmail.com
**Environment:** Node.js / Express / MongoDB / LM Studio (local)

---

## 1. Syntax Verification (`node --check`)

| File | Status |
|------|--------|
| `src/services/nutrition/durationCalculator.js` (NEW) | PASS |
| `src/models/MealPlan.js` (MODIFIED) | PASS |
| `src/controllers/mealplan.controller.js` (MODIFIED) | PASS |

---

## 2. Unit Tests: `calculatePlanDuration()`

| # | Test Case | Input | Expected | Actual | Status |
|---|-----------|-------|----------|--------|--------|
| 1 | Lose weight (80 to 70 kg) | `goal: 'lose-weight', currentWeight: 80, desiredWeight: 70` | `weeks: 20, totalDays: 140` | `weeks: 20, templateDays: 7, totalDays: 140` | PASS |
| 2 | Gain weight (60 to 65 kg) | `goal: 'gain-weight', currentWeight: 60, desiredWeight: 65` | `weeks: 20, totalDays: 140` | `weeks: 20, templateDays: 7, totalDays: 140` | PASS |
| 3 | Improve health (default) | `goal: 'improve-health', currentWeight: 70, desiredWeight: 65` | `weeks: 1, totalDays: 7` | `weeks: 1, templateDays: 7, totalDays: 7` | PASS |
| 4 | Missing desiredWeight | `goal: 'lose-weight', currentWeight: 80` | `weeks: 1, totalDays: 7` | `weeks: 1, templateDays: 7, totalDays: 7` | PASS |
| 5 | Zero delta (same weight) | `goal: 'lose-weight', currentWeight: 70, desiredWeight: 70` | `weeks: 1, totalDays: 7` | `weeks: 1, templateDays: 7, totalDays: 7` | PASS |
| 6 | Negative delta (lose but desired > current) | `goal: 'lose-weight', currentWeight: 60, desiredWeight: 70` | `weeks: 1, totalDays: 7` | `weeks: 1, templateDays: 7, totalDays: 7` | PASS |
| 7 | Exceed 52-week cap (120 to 80 kg) | `goal: 'lose-weight', currentWeight: 120, desiredWeight: 80` | `weeks: 52, totalDays: 364` | `weeks: 52, templateDays: 7, totalDays: 364` | PASS |
| 8 | Small weight loss (70 to 69.5 kg) | `goal: 'lose-weight', currentWeight: 70, desiredWeight: 69.5` | `weeks: 1, totalDays: 7` | `weeks: 1, templateDays: 7, totalDays: 7` | PASS |
| 9 | Large weight gain (50 to 63 kg) | `goal: 'gain-weight', currentWeight: 50, desiredWeight: 63` | `weeks: 52, totalDays: 364` | `weeks: 52, templateDays: 7, totalDays: 364` | PASS |
| 10 | Missing goal field | `currentWeight: 80, desiredWeight: 70` | `weeks: 1, totalDays: 7` | `weeks: 1, templateDays: 7, totalDays: 7` | PASS |

**Result: 10/10 PASSED**

### Duration Calculation Formula
- **lose-weight**: `weeks = ceil((currentWeight - desiredWeight) / 0.5)` (0.5 kg/week safe loss rate)
- **gain-weight**: `weeks = ceil((desiredWeight - currentWeight) / 0.25)` (0.25 kg/week safe gain rate)
- **improve-health**: default 1 week
- Clamped to [1, 52] weeks

---

## 3. API Integration Test: `POST /api/meal-plans/generate`

### 3.1 Test User Health Profile

| Field | Value |
|-------|-------|
| Email | tan1@yopmail.com |
| Gender | male |
| Age | 30 |
| Height | 165 cm |
| Current Weight | 80 kg |
| Desired Weight | 70 kg |
| Goal | lose-weight |
| Activity Level | moderately-active |
| Diseases | diabetes, hypertension |
| Diet Preference | balanced |
| Meals Per Day | 3 |
| Cuisine Preference | Vietnamese, Chinese |
| Favorite Meal | pho |

### 3.2 Expected Duration Calculation

```
delta = 80 - 70 = 10 kg
weeks = ceil(10 / 0.5) = 20 weeks
totalDays = 20 * 7 = 140 days
```

### 3.3 API Response Summary

| Field | Expected | Actual | Status |
|-------|----------|--------|--------|
| `ok` | `true` | `true` | PASS |
| `message` | `"Meal plan generated successfully"` | `"Meal plan generated successfully"` | PASS |
| `mealPlan.title` | `"20-Week Meal Plan"` | `"20-Week Meal Plan"` | PASS |
| `mealPlan.duration.weeks` | `20` | `20` | PASS |
| `mealPlan.duration.totalDays` | `140` | `140` | PASS |
| Total days in `mealPlan.days` array | `140` | `140` | PASS |
| `disclaimer` present (diseases exist) | Yes | Yes | PASS |
| `aiModel` | `"lm-studio"` | `"lm-studio"` | PASS |

### 3.4 Template Rotation Verification

The 7-day template should repeat identically for each week. Comparing Day 1 (Week 1) with Day 8 (Week 2):

| Meal | Day 1 | Day 8 | Match |
|------|-------|-------|-------|
| Breakfast | Vietnamese-Style Quinoa Salad with Salmon and Steamed Vegetables | Vietnamese-Style Quinoa Salad with Salmon and Steamed Vegetables | YES |
| Lunch | Vietnamese-Inspired Quinoa Salad | Vietnamese-Inspired Quinoa Salad | YES |
| Dinner | Vietnamese Salmon and Sweet Potato Stir Fry | Vietnamese Salmon and Sweet Potato Stir Fry | YES |

**Template repeats correctly: TRUE**

### 3.5 Day Numbering Verification

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| First 10 days | [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] | [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] | PASS |
| Last 10 days | [131, 132, 133, 134, 135, 136, 137, 138, 139, 140] | [131, 132, 133, 134, 135, 136, 137, 138, 139, 140] | PASS |
| Sequential 1..140 | All sequential | All sequential | PASS |

### 3.6 Day 1 Detail (Sample)

| Field | Value |
|-------|-------|
| Day | 1 |
| Title | Day 1 |
| Total Calories | 2090 kcal |
| Macros | protein: 209g, carbs: 183g, fat: 58g |

**Meals:**

| Meal Type | Name | Calories | Protein | Carbs | Fat |
|-----------|------|----------|---------|-------|-----|
| Breakfast | Vietnamese-Style Quinoa Salad with Salmon and Steamed Vegetables | 627 kcal | 63g | 55g | 17g |
| Lunch | Vietnamese-Inspired Quinoa Salad | 836 kcal | 83g | 73g | 24g |
| Dinner | Vietnamese Salmon and Sweet Potato Stir Fry | 627 kcal | 63g | 55g | 17g |

**Meal calorie sum:** 627 + 836 + 627 = 2090 kcal (matches day total)

### 3.7 Disease Safety Validation

| Check | Status |
|-------|--------|
| Disclaimer included in response | PASS |
| Diseases: diabetes, hypertension | Handled |
| Forbidden ingredients filtered | PASS (no unsafe meals detected during generation) |
| Macros adjusted for disease caps | PASS |

---

## 4. Schema & Model Verification

### 4.1 MealPlan Mongoose Schema - `duration` field

```javascript
duration: {
  weeks: { type: Number },
  totalDays: { type: Number }
}
```

| Check | Status |
|-------|--------|
| `duration` field saved to MongoDB | PASS (`{ weeks: 20, totalDays: 140 }`) |
| Old plans without `duration` field | Compatible (`duration: undefined`, no migration needed) |

### 4.2 AJV Schema Validation

| Check | Status |
|-------|--------|
| 7-day template passes `validateMealPlan()` | PASS |
| `additionalProperties: false` respected (duration NOT in validated object) | PASS |
| `days` array accepts 7 items (no hardcoded max) | PASS |

---

## 5. Dynamic AI Call Budget

| Meals Per Day | Formula | Budget |
|---------------|---------|--------|
| 3 | `min(60, 7 * 3 * 2 + 10)` | 52 |
| 4 | `min(60, 7 * 4 * 2 + 10)` | 60 (capped) |
| 2 | `min(60, 7 * 2 * 2 + 10)` | 38 |

For this test (3 meals/day): **Budget = 52 calls** (previously hardcoded at 20)

---

## 6. Summary

| Test Category | Total | Passed | Failed |
|---------------|-------|--------|--------|
| Syntax checks (`node --check`) | 3 | 3 | 0 |
| Unit tests (`calculatePlanDuration`) | 10 | 10 | 0 |
| API integration (response structure) | 8 | 8 | 0 |
| Template rotation verification | 3 | 3 | 0 |
| Day numbering verification | 3 | 3 | 0 |
| Schema/model checks | 4 | 4 | 0 |
| **TOTAL** | **31** | **31** | **0** |

**Overall Result: ALL 31 TESTS PASSED**
