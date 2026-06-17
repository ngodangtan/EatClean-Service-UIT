const DEVIATION_THRESHOLD = 0.01; // 1% — tightened for deterministic nutrition engine

function withinDeviation(actual, expected) {
  if (expected === 0) return actual === 0;
  return Math.abs(actual - expected) / expected <= DEVIATION_THRESHOLD;
}

export function validateCaloriesConsistency(day) {
  const mealCaloriesSum = day.meals.reduce((sum, m) => sum + m.calories, 0);
  if (!withinDeviation(mealCaloriesSum, day.totalCalories)) {
    return `Day ${day.day}: meal calories sum (${mealCaloriesSum}) deviates from totalCalories (${day.totalCalories}) by more than 5%`;
  }
  return null;
}

export function validateMacroConsistency(day) {
  const { protein, carbs, fat } = day.macros;
  const estimatedCalories = protein * 4 + carbs * 4 + fat * 9;
  if (!withinDeviation(estimatedCalories, day.totalCalories)) {
    return `Day ${day.day}: macro-derived calories (${estimatedCalories}) deviates from totalCalories (${day.totalCalories}) by more than 5%`;
  }
  return null;
}

export function validateMealsPerDay(day, expectedMealsPerDay) {
  if (day.meals.length !== expectedMealsPerDay) {
    return `Day ${day.day}: expected ${expectedMealsPerDay} meals but got ${day.meals.length}`;
  }
  return null;
}

export function validateFullMealPlan(plan, healthProfile) {
  const errors = [];
  const expectedMealsPerDay = healthProfile?.mealsPerDay;

  for (const day of plan.days) {
    const calError = validateCaloriesConsistency(day);
    if (calError) errors.push(calError);

    const macroError = validateMacroConsistency(day);
    if (macroError) errors.push(macroError);

    if (expectedMealsPerDay != null) {
      const mealCountError = validateMealsPerDay(day, expectedMealsPerDay);
      if (mealCountError) errors.push(mealCountError);
    }
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : null };
}
