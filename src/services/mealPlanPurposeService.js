/**
 * Purpose-specific safety + planning rules for meal plan generation.
 *
 * The disease engine handles macro caps and ingredient filtering. This module
 * lives one layer above: it inspects the *intent* of the request (purpose,
 * weightGoal) and decides whether the request itself is safe to honour given
 * the user's diseases — before we spend any AI budget.
 */

/**
 * Conditions that medically contraindicate certain weight-management goals.
 * Includes both engine-supported diseases (e.g. hypertension, kidney-disease)
 * and unsupported ones (e.g. obesity, heart-disease) — the request-level guard
 * still cares about them even though the macro engine ignores them.
 */
const WEIGHT_GOAL_CONTRAINDICATIONS = {
  // Aggressive weight gain is unsafe for these conditions
  'gain-weight': ['obesity', 'high-cholesterol', 'heart-disease', 'hypertension'],
  // High-protein muscle-gain is hard on kidneys and gout
  'muscle-gain': ['kidney-disease', 'high-uric-acid'],
  // Aggressive deficit is risky when the user is already nutritionally compromised
  'lose-weight': ['anemia']
};

/**
 * @param {string} weightGoal
 * @param {string[]} userDiseaseKeys — disease keys present on the health profile
 * @returns {{ blocked: boolean, conflicts: string[] }}
 */
export function checkWeightGoalContraindications(weightGoal, userDiseaseKeys) {
  const banned = WEIGHT_GOAL_CONTRAINDICATIONS[weightGoal] ?? [];
  if (banned.length === 0 || !Array.isArray(userDiseaseKeys) || userDiseaseKeys.length === 0) {
    return { blocked: false, conflicts: [] };
  }
  const conflicts = userDiseaseKeys.filter(k => banned.includes(k));
  return { blocked: conflicts.length > 0, conflicts };
}

/**
 * Map the request-level `weightGoal` (which understands `muscle-gain`) onto
 * the nutrition engine's internal goal vocabulary (`lose-weight | gain-weight
 * | improve-health`). `muscle-gain` is treated as `gain-weight` — the macro
 * calculator already biases protein high enough for muscle accrual.
 */
export function mapWeightGoalToEngineGoal(weightGoal) {
  if (weightGoal === 'muscle-gain') return 'gain-weight';
  return weightGoal;
}

/**
 * Compute an effective TDEE from a HealthKit / Apple Watch snapshot.
 * Returns null if the snapshot doesn't carry enough data to override the
 * standard BMR-based calculation — the controller will fall back to the
 * default activity-multiplier path in that case.
 *
 * Preferred shape: restingEnergyKcal + activeEnergyKcal (HealthKit native).
 * Fallback: just activeEnergyKcal — added on top of BMR by the engine via
 * the goal-multiplier (we still return null here so the engine path runs).
 */
export function tdeeFromHealthSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const { activeEnergyKcal, restingEnergyKcal } = snapshot;
  if (Number.isFinite(restingEnergyKcal) && Number.isFinite(activeEnergyKcal)) {
    const tdee = restingEnergyKcal + activeEnergyKcal;
    if (tdee >= 800 && tdee <= 8000) return Math.round(tdee);
  }
  return null;
}
