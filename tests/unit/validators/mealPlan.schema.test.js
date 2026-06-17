import { describe, it, expect } from 'vitest';
import { validateMealPlan } from '../../../src/validators/mealPlan.schema.js';

const validMeal = {
  mealType: 'breakfast',
  name: 'Oatmeal Bowl',
  description: 'A healthy start',
  ingredients: ['oats', 'milk', 'berries'],
  benefits: ['fiber', 'energy'],
  calories: 400,
  macros: { protein: 15, carbs: 60, fat: 10 }
};

const validDay = {
  day: 1,
  title: 'Day 1',
  theme: '',
  totalCalories: 2000,
  macros: { protein: 150, carbs: 200, fat: 60 },
  meals: [validMeal],
  tips: []
};

describe('validateMealPlan', () => {
  it('accepts a valid meal plan', () => {
    const result = validateMealPlan({ title: 'Test Plan', days: [validDay] });
    expect(result.valid).toBe(true);
    expect(result.errors).toBeNull();
  });

  it('rejects missing title', () => {
    const result = validateMealPlan({ days: [validDay] });
    expect(result.valid).toBe(false);
  });

  it('rejects empty days array', () => {
    const result = validateMealPlan({ title: 'Test', days: [] });
    expect(result.valid).toBe(false);
  });

  it('rejects meal with missing name', () => {
    const badMeal = { ...validMeal, name: undefined };
    // Remove name to trigger validation
    delete badMeal.name;
    const result = validateMealPlan({
      title: 'Test',
      days: [{ ...validDay, meals: [badMeal] }]
    });
    expect(result.valid).toBe(false);
  });

  it('rejects meal with zero calories', () => {
    const result = validateMealPlan({
      title: 'Test',
      days: [{ ...validDay, meals: [{ ...validMeal, calories: 0 }] }]
    });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid mealType', () => {
    const result = validateMealPlan({
      title: 'Test',
      days: [{ ...validDay, meals: [{ ...validMeal, mealType: 'brunch' }] }]
    });
    expect(result.valid).toBe(false);
  });

  it('rejects negative macro values (protein)', () => {
    const result = validateMealPlan({
      title: 'Test',
      days: [{ ...validDay, meals: [{ ...validMeal, macros: { protein: 0, carbs: 10, fat: 5 } }] }]
    });
    expect(result.valid).toBe(false);
  });
});
