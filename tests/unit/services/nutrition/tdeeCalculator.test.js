import { describe, it, expect } from 'vitest';
import { calculateTDEE, VALID_ACTIVITY_LEVELS } from '../../../../src/services/nutrition/tdeeCalculator.js';

describe('calculateTDEE', () => {
  const bmr = 1600;

  it('calculates TDEE for sedentary', () => {
    expect(calculateTDEE(bmr, 'sedentary')).toBe(1920);
  });

  it('calculates TDEE for lightly-active', () => {
    expect(calculateTDEE(bmr, 'lightly-active')).toBe(2200);
  });

  it('calculates TDEE for moderately-active', () => {
    expect(calculateTDEE(bmr, 'moderately-active')).toBe(2480);
  });

  it('calculates TDEE for very-active', () => {
    expect(calculateTDEE(bmr, 'very-active')).toBe(2760);
  });

  it('calculates TDEE for extremely-active', () => {
    expect(calculateTDEE(bmr, 'extremely-active')).toBe(3040);
  });

  it('throws for invalid activity level', () => {
    expect(() => calculateTDEE(bmr, 'invalid')).toThrow('Invalid activityLevel');
  });

  it('exports valid activity levels', () => {
    expect(VALID_ACTIVITY_LEVELS).toContain('sedentary');
    expect(VALID_ACTIVITY_LEVELS).toHaveLength(5);
  });
});
