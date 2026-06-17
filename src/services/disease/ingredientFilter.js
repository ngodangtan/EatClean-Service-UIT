import { getForbiddenIngredients } from './diseaseRules.js';

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check a meal's ingredients against forbidden lists for the given diseases.
 * Uses case-insensitive Unicode-aware word-boundary matching to avoid false
 * positives (e.g. "ham" won't match "edamame", "cá" won't match "cá hồi" — wait,
 * we DO want "cá" to match "cá hồi"). The key requirement: forbidden term must
 * appear as a whole word, not as a substring inside another word.
 *
 * Standard \b is ASCII-only in JS, so it fails on Vietnamese diacritics
 * (e.g. \bcá\b never matches "cá hồi" because "á" is not in \w). We use
 * Unicode property escapes with negative lookaround instead.
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

  const forbiddenPatterns = forbidden.map(
    f => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(f)}(?![\\p{L}\\p{N}])`, 'iu')
  );
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
