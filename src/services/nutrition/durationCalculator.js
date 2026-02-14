const WEIGHT_LOSS_RATE = 0.5;  // kg per week (safe rate at ~20% deficit)
const WEIGHT_GAIN_RATE = 0.25; // kg per week (safe rate at ~10% surplus)
const MAX_WEEKS = 52;
const DEFAULT_WEEKS = 1;
const TEMPLATE_DAYS = 7;

/**
 * Calculate how many weeks (and total days) a meal plan should cover
 * based on the user's goal and weight delta.
 *
 * @param {Object} healthProfile
 * @returns {{ weeks: number, templateDays: number, totalDays: number }}
 */
export function calculatePlanDuration(healthProfile) {
  const { goal, currentWeight, desiredWeight } = healthProfile;

  let weeks = DEFAULT_WEEKS;

  if (goal === 'lose-weight' && desiredWeight != null && currentWeight != null) {
    const delta = currentWeight - desiredWeight;
    if (delta > 0) {
      weeks = Math.ceil(delta / WEIGHT_LOSS_RATE);
    }
  } else if (goal === 'gain-weight' && desiredWeight != null && currentWeight != null) {
    const delta = desiredWeight - currentWeight;
    if (delta > 0) {
      weeks = Math.ceil(delta / WEIGHT_GAIN_RATE);
    }
  }
  // improve-health or any other goal → DEFAULT_WEEKS (1)

  // Clamp to [1, MAX_WEEKS]
  weeks = Math.max(1, Math.min(MAX_WEEKS, weeks));

  return {
    weeks,
    templateDays: TEMPLATE_DAYS,
    totalDays: weeks * TEMPLATE_DAYS
  };
}
