import { describe, it, expect } from 'vitest';
import { distributeMacros } from '../../../../src/services/nutrition/mealMacroDistributor.js';

describe('distributeMacros', () => {
  const totalMacros = { calories: 2000, protein: 150, carbs: 200, fat: 60 };

  it('distributes to 3 meals', () => {
    const meals = distributeMacros(totalMacros, 3);
    expect(meals).toHaveLength(3);
    expect(meals.map(m => m.mealType)).toEqual(['breakfast', 'lunch', 'dinner']);
  });

  it('distributes to 4 meals', () => {
    const meals = distributeMacros(totalMacros, 4);
    expect(meals).toHaveLength(4);
    expect(meals.map(m => m.mealType)).toEqual(['breakfast', 'lunch', 'snack', 'dinner']);
  });

  it('distributes to 5 meals', () => {
    const meals = distributeMacros(totalMacros, 5);
    expect(meals).toHaveLength(5);
  });

  it('calories sum to total after rounding correction', () => {
    const meals = distributeMacros(totalMacros, 3);
    const sum = meals.reduce((s, m) => s + m.calories, 0);
    expect(sum).toBe(2000);
  });

  it('protein sums to total after rounding correction', () => {
    const meals = distributeMacros(totalMacros, 4);
    const sum = meals.reduce((s, m) => s + m.protein, 0);
    expect(sum).toBe(150);
  });

  it('fat sums to total after rounding correction', () => {
    const meals = distributeMacros(totalMacros, 3);
    const sum = meals.reduce((s, m) => s + m.fat, 0);
    expect(sum).toBe(60);
  });

  it('defaults to 3 meals when mealsPerDay is null', () => {
    const meals = distributeMacros(totalMacros, null);
    expect(meals).toHaveLength(3);
  });
});
