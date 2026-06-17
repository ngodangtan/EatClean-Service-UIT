const GOAL_MULTIPLIERS = {
  'lose-weight': 0.80,    // -20% deficit
  'gain-weight': 1.10,    // +10% surplus
  'improve-health': 1.00
};

const CALORIE_FLOOR = { male: 1500, female: 1200 };
const CALORIE_CEILING = 4000;

export function calculateCalorieTarget(tdee, goal, gender = 'female') {
  const multiplier = GOAL_MULTIPLIERS[goal] ?? 1.0;
  const target = tdee * multiplier;
  const floor = CALORIE_FLOOR[gender] || CALORIE_FLOOR.female;
  return Math.round(Math.max(floor, Math.min(CALORIE_CEILING, target)));
}
