import { getDiseaseRules } from './diseaseRules.js';

/**
 * Adjust macros based on disease constraints.
 * Applies the strictest cap per macro across all diseases,
 * then redistributes excess calories to maintain the calorie target.
 * After redistribution, re-validates that no cap is exceeded —
 * any remaining excess is accepted as a calorie deficit (safer than exceeding a medical cap).
 *
 * @param {{ protein: number, carbs: number, fat: number }} baseMacros
 * @param {number} calorieTarget
 * @param {string[]} diseases
 * @param {number} weight - body weight in kg
 * @returns {{ protein: number, carbs: number, fat: number }}
 */
export function adjustMacrosForDiseases(baseMacros, calorieTarget, diseases, weight) {
  if (!Array.isArray(diseases) || diseases.length === 0) return { ...baseMacros };

  let { protein, carbs, fat } = baseMacros;

  // Collect strictest caps across all diseases
  let minCarbPct = Infinity;
  let minProteinPerKg = Infinity;
  let minProteinPct = Infinity;
  let minFatPct = Infinity;

  for (const disease of diseases) {
    const rules = getDiseaseRules(disease);
    if (!rules) continue;
    const adj = rules.macroAdjustment;

    if (adj.maxCarbPct !== undefined && adj.maxCarbPct < minCarbPct) {
      minCarbPct = adj.maxCarbPct;
    }
    if (adj.maxProteinPerKg !== undefined && adj.maxProteinPerKg < minProteinPerKg) {
      minProteinPerKg = adj.maxProteinPerKg;
    }
    if (adj.maxProteinPct !== undefined && adj.maxProteinPct < minProteinPct) {
      minProteinPct = adj.maxProteinPct;
    }
    if (adj.maxFatPct !== undefined && adj.maxFatPct < minFatPct) {
      minFatPct = adj.maxFatPct;
    }
  }

  // Compute gram caps once for reuse
  const maxCarbGrams = minCarbPct < Infinity ? Math.round((calorieTarget * minCarbPct / 100) / 4) : Infinity;
  const maxProteinPerKgGrams = minProteinPerKg < Infinity ? Math.round(weight * minProteinPerKg) : Infinity;
  const maxProteinPctGrams = minProteinPct < Infinity ? Math.round((calorieTarget * minProteinPct / 100) / 4) : Infinity;
  const maxProteinGrams = Math.min(maxProteinPerKgGrams, maxProteinPctGrams);
  const maxFatGrams = minFatPct < Infinity ? Math.round((calorieTarget * minFatPct / 100) / 9) : Infinity;

  let excessCalories = 0;

  // Apply carb cap
  if (carbs > maxCarbGrams) {
    excessCalories += (carbs - maxCarbGrams) * 4;
    carbs = maxCarbGrams;
  }

  // Apply protein cap (stricter of per-kg and percentage)
  if (protein > maxProteinGrams) {
    excessCalories += (protein - maxProteinGrams) * 4;
    protein = maxProteinGrams;
  }

  // Apply fat cap
  if (fat > maxFatGrams) {
    excessCalories += (fat - maxFatGrams) * 9;
    fat = maxFatGrams;
  }

  // Redistribute excess calories to uncapped macros
  if (excessCalories > 0) {
    const carbsUncapped = maxCarbGrams === Infinity;
    const fatUncapped = maxFatGrams === Infinity;
    const proteinUncapped = maxProteinGrams === Infinity;

    if (carbsUncapped) {
      carbs += Math.round(excessCalories / 4);
    } else if (fatUncapped) {
      fat += Math.round(excessCalories / 9);
    } else if (proteinUncapped) {
      protein += Math.round(excessCalories / 4);
    } else {
      // All macros capped — split between carbs and fat, then re-clamp
      const halfCalories = excessCalories / 2;
      carbs += Math.round(halfCalories / 4);
      fat += Math.round(halfCalories / 9);
    }
  }

  // Re-validate caps after redistribution — clamp any overflows.
  // Remaining excess is accepted as a calorie deficit (safer than exceeding a medical cap).
  if (carbs > maxCarbGrams) carbs = maxCarbGrams;
  if (protein > maxProteinGrams) protein = maxProteinGrams;
  if (fat > maxFatGrams) fat = maxFatGrams;

  return { protein, carbs, fat };
}
