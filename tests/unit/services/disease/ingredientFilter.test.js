import { describe, it, expect } from 'vitest';
import { filterIngredients } from '../../../../src/services/disease/ingredientFilter.js';

describe('filterIngredients', () => {
  it('returns safe for meal with no forbidden ingredients', () => {
    const meal = { ingredients: ['chicken breast', 'brown rice', 'broccoli'] };
    const result = filterIngredients(meal, ['diabetes']);
    expect(result.safe).toBe(true);
    expect(result.flaggedIngredients).toEqual([]);
  });

  it('flags forbidden ingredients', () => {
    const meal = { ingredients: ['white sugar', 'oats', 'soda'] };
    const result = filterIngredients(meal, ['diabetes']);
    expect(result.safe).toBe(false);
    expect(result.flaggedIngredients).toContain('white sugar');
    expect(result.flaggedIngredients).toContain('soda');
  });

  it('avoids false positives (ham vs edamame)', () => {
    const meal = { ingredients: ['edamame', 'brown rice'] };
    const result = filterIngredients(meal, ['kidney-disease']);
    expect(result.safe).toBe(true);
  });

  it('returns safe when no diseases', () => {
    const meal = { ingredients: ['bacon', 'soda'] };
    const result = filterIngredients(meal, []);
    expect(result.safe).toBe(true);
  });

  it('handles case-insensitive matching', () => {
    const meal = { ingredients: ['White Sugar added'] };
    const result = filterIngredients(meal, ['diabetes']);
    expect(result.safe).toBe(false);
  });

  it('combines forbidden lists from multiple diseases', () => {
    const meal = { ingredients: ['bacon', 'soda'] };
    const result = filterIngredients(meal, ['diabetes', 'kidney-disease']);
    expect(result.safe).toBe(false);
    expect(result.flaggedIngredients.length).toBeGreaterThanOrEqual(2);
  });
});
