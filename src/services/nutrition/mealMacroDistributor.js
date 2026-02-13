const MEAL_TYPES_MAP = {
  3: ['breakfast', 'lunch', 'dinner'],
  4: ['breakfast', 'lunch', 'snack', 'dinner'],
  5: ['breakfast', 'snack', 'lunch', 'snack', 'dinner']
};

const SPLIT_MAP = {
  3: [30, 40, 30],
  4: [25, 25, 25, 25],
  5: [20, 20, 20, 20, 20]
};

export function distributeMacros(totalMacros, mealsPerDay) {
  const { calories, protein, carbs, fat } = totalMacros;
  const count = mealsPerDay || 3;
  const percentages = SPLIT_MAP[count] || evenSplit(count);
  const mealTypes = MEAL_TYPES_MAP[count] || buildMealTypes(count);

  const meals = percentages.map((pct, i) => ({
    mealType: mealTypes[i],
    calories: Math.round(calories * pct / 100),
    protein: Math.round(protein * pct / 100),
    carbs: Math.round(carbs * pct / 100),
    fat: Math.round(fat * pct / 100)
  }));

  // Adjust the largest meal to eliminate rounding drift so sums match exactly
  adjustForRounding(meals, 'calories', calories);
  adjustForRounding(meals, 'protein', protein);
  adjustForRounding(meals, 'carbs', carbs);
  adjustForRounding(meals, 'fat', fat);

  return meals;
}

function adjustForRounding(meals, field, target) {
  const sum = meals.reduce((s, m) => s + m[field], 0);
  if (sum !== target) {
    // Find the meal with the largest value to absorb the difference
    let maxIdx = 0;
    for (let i = 1; i < meals.length; i++) {
      if (meals[i][field] > meals[maxIdx][field]) maxIdx = i;
    }
    meals[maxIdx][field] += target - sum;
  }
}

function evenSplit(n) {
  const base = Math.floor(100 / n);
  const remainder = 100 - base * n;
  // Distribute the remainder across the first `remainder` meals (1 extra each)
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

function buildMealTypes(n) {
  if (n <= 0) return [];
  // Anchor main meals, distribute snacks evenly between them
  const mains = ['breakfast', 'lunch', 'dinner'];
  if (n <= 3) return mains.slice(0, n);
  const snackCount = n - 3;
  const result = ['breakfast'];
  // Spread snacks across the 2 gaps (breakfast→lunch, lunch→dinner)
  const gaps = 2;
  for (let g = 0; g < gaps; g++) {
    const snacksInGap = Math.floor(snackCount / gaps) + (g < snackCount % gaps ? 1 : 0);
    for (let s = 0; s < snacksInGap; s++) result.push('snack');
    result.push(mains[g + 1]); // lunch, then dinner
  }
  return result;
}
