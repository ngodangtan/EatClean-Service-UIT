import { filterIngredients } from './ingredientFilter.js';

/**
 * Validate that a generated meal is safe for the given diseases.
 * Checks:
 *  1. No forbidden ingredients remain
 *  2. (Extensible: macro constraint checks can be added here)
 *
 * @param {{ name: string, ingredients: string[] }} meal
 * @param {string[]} diseases
 * @returns {{ valid: boolean, reasons: string[] }}
 */
export function validateMealSafety(meal, diseases) {
  const reasons = [];

  // Check forbidden ingredients
  const { safe, flaggedIngredients } = filterIngredients(meal, diseases);
  if (!safe) {
    reasons.push(
      `Forbidden ingredients found: ${flaggedIngredients.join(', ')}`
    );
  }

  return {
    valid: reasons.length === 0,
    reasons
  };
}
