import { getForbiddenIngredients } from './diseaseRules.js';

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check a meal's ingredients against forbidden lists for the given diseases.
 * Uses case-insensitive word-boundary matching to avoid false positives
 * (e.g. "ham" won't match "edamame", "beer" won't match "beet").
 *
 * @param {{ ingredients: string[] }} meal
 * @param {string[]} diseases
 * @returns {{ safe: boolean, flaggedIngredients: string[], meal: object }}
 */
export function filterIngredients(meal, diseases) {
  const forbidden = getForbiddenIngredients(diseases);
  if (forbidden.length === 0) {
    return { safe: true, flaggedIngredients: [], meal };
  }

  const forbiddenPatterns = forbidden.map(f => new RegExp(`\\b${escapeRegex(f)}\\b`, 'i'));
  const flagged = [];

  for (const ingredient of meal.ingredients) {
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(ingredient)) {
        flagged.push(ingredient);
        break;
      }
    }
  }

  return {
    safe: flagged.length === 0,
    flaggedIngredients: flagged,
    meal
  };
}
