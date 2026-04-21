import { getDiseaseByKey } from '../data/diseaseCatalog.js';

/**
 * Purpose-specific safety + planning rules for meal plan generation.
 *
 * The disease engine handles macro caps and ingredient filtering. This module
 * lives one layer above: it inspects the *intent* of the request (purpose,
 * weightGoal) and decides whether the request itself is safe to honour given
 * the user's diseases — before we spend any AI budget.
 */

const LIMIT_OPERATORS = {
  gte: (a, b) => a >= b,
  gt:  (a, b) => a > b,
  lte: (a, b) => a <= b,
  lt:  (a, b) => a < b,
  eq:  (a, b) => a === b,
  neq: (a, b) => a !== b
};

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
 * Evaluate catalog-defined `generationLimits` against the user's disease entries.
 * Returns on the first matching limit found — conditions are checked in catalog order.
 *
 * Adding a new block rule requires only a `generationLimits` entry in diseaseCatalog.js;
 * no changes to this function or the controller are needed.
 *
 * @param {Array<{key: string, [field: string]: any}>} diseaseEntries — full disease array from health profile
 * @returns {{ blocked: boolean, reason?: string, message?: string, disease?: string }}
 */
export function checkDiseaseGenerationLimits(diseaseEntries) {
  if (!Array.isArray(diseaseEntries)) return { blocked: false };

  for (const entry of diseaseEntries) {
    const catalogEntry = getDiseaseByKey(entry?.key);
    if (!catalogEntry?.generationLimits?.length) continue;

    for (const limit of catalogEntry.generationLimits) {
      let fieldValue;

      if (limit.source === 'indicator') {
        // Resolve value from entry.indicators[].value where indicator key matches
        const indicator = Array.isArray(entry.indicators)
          ? entry.indicators.find(i => i.key === limit.field)
          : null;
        fieldValue = indicator?.value;
      } else {
        // Default: direct field on the disease entry (e.g. stage)
        fieldValue = entry[limit.field];
      }

      if (fieldValue == null) continue;

      const evaluate = LIMIT_OPERATORS[limit.operator];
      if (!evaluate) continue;

      if (evaluate(fieldValue, limit.value)) {
        // Build template vars: entry fields + the resolved indicator value under its key
        const templateVars = limit.source === 'indicator'
          ? { ...entry, [limit.field]: fieldValue }
          : entry;
        const message = limit.messageVi.replace(/\{(\w+)\}/g, (_, key) => templateVars[key] ?? key);
        return { blocked: true, reason: limit.reason, message, disease: entry.key };
      }
    }
  }

  return { blocked: false };
}

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
