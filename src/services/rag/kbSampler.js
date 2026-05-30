import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KB_RECIPES_PATH = join(__dirname, '../../data/knowledgeBase/recipes');
const KB_GUIDELINES_PATH = join(__dirname, '../../data/knowledgeBase/diseaseGuidelines.json');

const _cache = {};
let _guidelinesCache = null;

function loadGuidelines() {
  if (!_guidelinesCache) {
    try {
      _guidelinesCache = JSON.parse(readFileSync(KB_GUIDELINES_PATH, 'utf8'));
    } catch {
      _guidelinesCache = [];
    }
  }
  return _guidelinesCache;
}

/**
 * Return disease guideline entries for the given disease keys.
 * Used to inject nutritional context into the AI prompt so benefits are medically grounded.
 *
 * @param {string[]} diseases
 * @returns {Array<{ disease: string, summary: string, mealTips: string[] }>}
 */
export function getDiseaseGuidelines(diseases = []) {
  if (!diseases.length) return [];
  return loadGuidelines().filter(g => diseases.includes(g.disease));
}

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
 * Filters by disease compatibility first, then by cuisine preference.
 * Falls back progressively: cuisine-filtered → disease-filtered → all.
 *
 * @param {{ mealType: string, diseases: string[], cuisines: string[], dayIndex: number }} params
 * @returns {{ name: string, ingredients: string[] } | null}
 */
export function sampleKBRecipe({ mealType, diseases = [], cuisines = [], dayIndex }) {
  const all = loadRecipes(mealType);
  if (!all.length) return null;

  // Step 1: filter by disease compatibility
  let diseasePool = diseases.length > 0
    ? all.filter(r =>
        Array.isArray(r.diseaseCompatible) &&
        diseases.some(d => r.diseaseCompatible.includes(d))
      )
    : all;

  if (!diseasePool.length) diseasePool = all;

  // Step 2: further filter by cuisine preference (best-effort — fallback if no match)
  let pool = diseasePool;
  if (cuisines.length > 0) {
    const cuisineFiltered = diseasePool.filter(r => cuisines.includes(r.cuisine));
    if (cuisineFiltered.length > 0) pool = cuisineFiltered;
    // else keep diseasePool — cuisine preference cannot be satisfied, skip silently
  }

  const recipe = pool[dayIndex % pool.length];
  return {
    name: recipe.name,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.slice(0, 4) : []
  };
}

/**
 * Return all eligible recipes for a mealType, filtered by disease, goal, and cuisine,
 * excluding already-used recipe IDs. Used to build the approved pool passed to the AI.
 *
 * @param {{ mealType: string, diseases: string[], cuisines: string[], goal: string|null, excludeIds: Set<string> }} params
 * @returns {Array<{ id: string, name: string, ingredients: string[], description: string }>}
 */
export function getEligibleRecipes({ mealType, diseases = [], cuisines = [], goal = null, excludeIds = new Set() }) {
  const all = loadRecipes(mealType);
  if (!all.length) return [];

  // disease filter with fallback to all
  let pool = diseases.length > 0
    ? all.filter(r => Array.isArray(r.diseaseCompatible) && diseases.some(d => r.diseaseCompatible.includes(d)))
    : all;
  if (!pool.length) pool = all;

  // goal filter with fallback
  if (goal) {
    const goalFiltered = pool.filter(r => Array.isArray(r.goal) && r.goal.includes(goal));
    if (goalFiltered.length) pool = goalFiltered;
  }

  // cuisine filter with fallback
  if (cuisines.length > 0) {
    const cuisineFiltered = pool.filter(r => cuisines.includes(r.cuisine));
    if (cuisineFiltered.length) pool = cuisineFiltered;
  }

  return pool.filter(r => !excludeIds.has(r.id));
}
