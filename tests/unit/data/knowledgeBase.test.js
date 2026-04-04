import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KB_DIR = join(__dirname, '../../../src/data/knowledgeBase');

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const VALID_GOALS = ['lose-weight', 'gain-weight', 'improve-health'];
const VALID_DISEASES = ['diabetes', 'kidney-disease', 'high-uric-acid', 'hypertension'];

function readJson(filename) {
  return JSON.parse(readFileSync(join(KB_DIR, filename), 'utf-8'));
}

describe('recipes.json', () => {
  const recipes = readJson('recipes.json');

  it('has at least 30 recipes', () => {
    expect(recipes.length).toBeGreaterThanOrEqual(30);
  });

  it('every recipe has all required fields', () => {
    for (const r of recipes) {
      expect(r.id, `${r.id} missing id`).toBeTruthy();
      expect(r.name, `${r.id} missing name`).toBeTruthy();
      expect(r.mealType, `${r.id} missing mealType`).toBeTruthy();
      expect(r.cuisine, `${r.id} missing cuisine`).toBeTruthy();
      expect(Array.isArray(r.goal), `${r.id} goal not array`).toBe(true);
      expect(Array.isArray(r.diseaseCompatible), `${r.id} diseaseCompatible not array`).toBe(true);
      expect(Array.isArray(r.ingredients), `${r.id} ingredients not array`).toBe(true);
      expect(r.description, `${r.id} missing description`).toBeTruthy();
      expect(Array.isArray(r.tags), `${r.id} tags not array`).toBe(true);
    }
  });

  it('all mealType values are valid enum', () => {
    for (const r of recipes) {
      expect(VALID_MEAL_TYPES, `${r.id} has invalid mealType: ${r.mealType}`).toContain(r.mealType);
    }
  });

  it('all diseases in diseaseCompatible are valid enum', () => {
    for (const r of recipes) {
      for (const d of r.diseaseCompatible) {
        expect(VALID_DISEASES, `${r.id} has invalid disease: ${d}`).toContain(d);
      }
    }
  });

  it('all goal values are valid enum', () => {
    for (const r of recipes) {
      for (const g of r.goal) {
        expect(VALID_GOALS, `${r.id} has invalid goal: ${g}`).toContain(g);
      }
    }
  });

  it('covers all 4 mealTypes', () => {
    const mealTypes = new Set(recipes.map(r => r.mealType));
    for (const mt of VALID_MEAL_TYPES) {
      expect(mealTypes, `Missing mealType: ${mt}`).toContain(mt);
    }
  });

  it('covers all 3 goals', () => {
    const goals = new Set(recipes.flatMap(r => r.goal));
    for (const g of VALID_GOALS) {
      expect(goals, `Missing goal: ${g}`).toContain(g);
    }
  });

  it('covers all 4 diseases in diseaseCompatible', () => {
    const diseases = new Set(recipes.flatMap(r => r.diseaseCompatible));
    for (const d of VALID_DISEASES) {
      expect(diseases, `Missing disease coverage: ${d}`).toContain(d);
    }
  });

  it('covers at least 4 cuisines', () => {
    const cuisines = new Set(recipes.map(r => r.cuisine));
    expect(cuisines.size).toBeGreaterThanOrEqual(4);
  });

  it('all ids are unique', () => {
    const ids = recipes.map(r => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe('diseaseGuidelines.json', () => {
  const guidelines = readJson('diseaseGuidelines.json');

  it('covers all 4 diseases', () => {
    const diseases = new Set(guidelines.map(g => g.disease));
    for (const d of VALID_DISEASES) {
      expect(diseases, `Missing disease guideline: ${d}`).toContain(d);
    }
  });

  it('every guideline has required fields', () => {
    for (const g of guidelines) {
      expect(g.id, `${g.id} missing id`).toBeTruthy();
      expect(g.disease, `${g.id} missing disease`).toBeTruthy();
      expect(g.summary, `${g.id} missing summary`).toBeTruthy();
      expect(Array.isArray(g.recommendedFoods), `${g.id} recommendedFoods not array`).toBe(true);
      expect(Array.isArray(g.avoidFoods), `${g.id} avoidFoods not array`).toBe(true);
      expect(Array.isArray(g.mealTips), `${g.id} mealTips not array`).toBe(true);
      expect(g.mealTips.length, `${g.id} has no mealTips`).toBeGreaterThan(0);
    }
  });

  it('disease field matches valid enum values', () => {
    for (const g of guidelines) {
      expect(VALID_DISEASES, `Invalid disease: ${g.disease}`).toContain(g.disease);
    }
  });
});

describe('ingredients.json', () => {
  const ingredients = readJson('ingredients.json');

  const VALID_CATEGORIES = ['produce', 'protein', 'dairy', 'grains', 'pantry', 'other'];

  it('has at least 40 ingredients', () => {
    expect(ingredients.length).toBeGreaterThanOrEqual(40);
  });

  it('every ingredient has required fields', () => {
    for (const ing of ingredients) {
      expect(ing.id, `${ing.id} missing id`).toBeTruthy();
      expect(ing.name, `${ing.id} missing name`).toBeTruthy();
      expect(VALID_CATEGORIES, `${ing.id} invalid category: ${ing.category}`).toContain(ing.category);
      expect(Array.isArray(ing.aliases), `${ing.id} aliases not array`).toBe(true);
      expect(Array.isArray(ing.safeFor), `${ing.id} safeFor not array`).toBe(true);
      expect(Array.isArray(ing.avoidFor), `${ing.id} avoidFor not array`).toBe(true);
      expect(ing.nutritionProfile, `${ing.id} missing nutritionProfile`).toBeTruthy();
      expect(Array.isArray(ing.substitutes), `${ing.id} substitutes not array`).toBe(true);
    }
  });

  it('safeFor references valid disease names', () => {
    for (const ing of ingredients) {
      for (const d of ing.safeFor) {
        expect(VALID_DISEASES, `${ing.id} safeFor has invalid disease: ${d}`).toContain(d);
      }
    }
  });

  it('avoidFor references valid disease names', () => {
    for (const ing of ingredients) {
      for (const d of ing.avoidFor) {
        expect(VALID_DISEASES, `${ing.id} avoidFor has invalid disease: ${d}`).toContain(d);
      }
    }
  });

  it('all ids are unique', () => {
    const ids = ingredients.map(i => i.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('covers all ingredient categories', () => {
    const categories = new Set(ingredients.map(i => i.category));
    const required = ['produce', 'protein', 'dairy', 'grains', 'pantry'];
    for (const cat of required) {
      expect(categories, `Missing category: ${cat}`).toContain(cat);
    }
  });
});
