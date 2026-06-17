// Protein targets in g/kg bodyweight by goal
const PROTEIN_PER_KG = {
  'lose-weight': 1.8,      // high to preserve lean mass during deficit
  'gain-weight': 1.6,
  'improve-health': 1.4
};

// Fat percentage of total calories by goal
const FAT_PCT = {
  'lose-weight': 25,
  'gain-weight': 25,
  'improve-health': 30
};

export function calculateMacros(calorieTarget, goal, weight = 70) {
  const proteinPerKg = PROTEIN_PER_KG[goal] || PROTEIN_PER_KG['improve-health'];
  const fatPct = FAT_PCT[goal] ?? FAT_PCT['improve-health'];

  const protein = Math.round(weight * proteinPerKg);
  const fat = Math.round((calorieTarget * fatPct / 100) / 9);

  // Carbs fill the remaining calories so reconstructed total matches exactly
  const remainingCalories = calorieTarget - (protein * 4) - (fat * 9);
  const carbs = Math.round(Math.max(0, remainingCalories / 4));

  return { protein, carbs, fat };
}
