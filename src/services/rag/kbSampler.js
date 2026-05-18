import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KB_RECIPES_PATH = join(__dirname, '../../data/knowledgeBase/recipes');

const _cache = {};

function loadRecipes(mealType) {
  if (!_cache[mealType]) {
    try {
      _cache[mealType] = JSON.parse(
        readFileSync(join(KB_RECIPES_PATH, `${mealType}.json`), 'utf8')
      );
    } catch {
      _cache[mealType] = [];
    }
  }
  return _cache[mealType];
}

/**
 * Return a KB recipe for day-specific inspiration.
 * Cycles through disease-compatible recipes so each day gets a different reference.
 * Falls back to the full mealType pool if no disease-tagged match exists.
 *
 * @param {{ mealType: string, diseases: string[], dayIndex: number }} params
 * @returns {{ name: string, ingredients: string[] } | null}
 */
export function sampleKBRecipe({ mealType, diseases = [], dayIndex }) {
  const all = loadRecipes(mealType);
  if (!all.length) return null;

  let pool = diseases.length > 0
    ? all.filter(r =>
        Array.isArray(r.diseaseCompatible) &&
        diseases.some(d => r.diseaseCompatible.includes(d))
      )
    : all;

  if (!pool.length) pool = all;

  const recipe = pool[dayIndex % pool.length];
  return {
    name: recipe.name,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.slice(0, 4) : []
  };
}
