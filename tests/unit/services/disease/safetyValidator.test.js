import { describe, it, expect } from 'vitest';
import { validateMealSafety } from '../../../../src/services/disease/safetyValidator.js';

describe('validateMealSafety', () => {
  it('returns valid for safe meal', () => {
    const meal = { name: 'Healthy Bowl', ingredients: ['quinoa', 'chicken breast', 'greens'] };
    const result = validateMealSafety(meal, ['diabetes']);
    expect(result.valid).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('returns invalid with reasons for unsafe meal', () => {
    const meal = { name: 'Sweet Treat', ingredients: ['white sugar', 'candy', 'flour'] };
    const result = validateMealSafety(meal, ['diabetes']);
    expect(result.valid).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons[0]).toContain('Forbidden ingredients found');
  });

  it('returns valid for empty diseases', () => {
    const meal = { name: 'Anything', ingredients: ['white sugar', 'bacon'] };
    const result = validateMealSafety(meal, []);
    expect(result.valid).toBe(true);
  });

  it('validates across multiple diseases', () => {
    const meal = { name: 'Bad Meal', ingredients: ['bacon', 'soda', 'liver'] };
    const result = validateMealSafety(meal, ['diabetes', 'kidney-disease', 'high-uric-acid']);
    expect(result.valid).toBe(false);
  });
});
