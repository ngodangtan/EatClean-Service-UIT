const ACTIVITY_FACTORS = {
  'sedentary': 1.2,
  'lightly-active': 1.375,
  'moderately-active': 1.55,
  'very-active': 1.725,
  'extremely-active': 1.9
};

export const VALID_ACTIVITY_LEVELS = Object.keys(ACTIVITY_FACTORS);

export function calculateTDEE(bmr, activityLevel) {
  const factor = ACTIVITY_FACTORS[activityLevel];
  if (!factor) {
    throw new Error(
      `Invalid activityLevel: "${activityLevel}". Must be one of: ${VALID_ACTIVITY_LEVELS.join(', ')}`
    );
  }
  return bmr * factor;
}
