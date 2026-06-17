const WEIGHT_LOSS_RATE = 0.5;  // kg per week (safe rate at ~20% deficit)
const WEIGHT_GAIN_RATE = 0.25; // kg per week (safe rate at ~10% surplus)
const MAX_WEEKS = 52;
const DEFAULT_WEEKS = 1;
const TEMPLATE_DAYS = 7;

/**
 * Calculate how many weeks (and total days) a meal plan should cover
 * based on the requested goal and (current → desired) weight delta.
 *
 * `desiredWeight` no longer lives on the HealthProfile — it is supplied
 * by the meal-plan generation request (POST /api/meal-plans/generate)
 * because it is plan-scoped, not profile-scoped.
 *
 * @param {Object} params
 * @param {string} params.goal — 'lose-weight' | 'gain-weight' | 'improve-health'
 * @param {number} [params.currentWeight]
 * @param {number} [params.desiredWeight]
 * @param {number} [params.requestedWeeks] — explicit override (1, 2, 4, …). When provided,
 *   skips the weight-delta calculation entirely. Used by purpose=disease_based and the
 *   client-driven duration on purpose=weight_management.
 * @returns {{ weeks: number, templateDays: number, totalDays: number }}
 */
export function calculatePlanDuration({ goal, currentWeight, desiredWeight, requestedWeeks } = {}) {
  let weeks = DEFAULT_WEEKS;

  if (Number.isFinite(requestedWeeks) && requestedWeeks > 0) {
    weeks = requestedWeeks;
  } else if (goal === 'lose-weight' && desiredWeight != null && currentWeight != null) {
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
