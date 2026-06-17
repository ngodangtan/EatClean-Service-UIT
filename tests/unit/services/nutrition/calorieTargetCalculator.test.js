import { describe, it, expect } from 'vitest';
import { calculateCalorieTarget } from '../../../../src/services/nutrition/calorieTargetCalculator.js';

describe('calculateCalorieTarget', () => {
  it('applies 20% deficit for lose-weight', () => {
    expect(calculateCalorieTarget(2000, 'lose-weight', 'male')).toBe(1600);
  });

  it('applies 10% surplus for gain-weight', () => {
    expect(calculateCalorieTarget(2000, 'gain-weight', 'male')).toBe(2200);
  });

  it('keeps maintenance for improve-health', () => {
    expect(calculateCalorieTarget(2000, 'improve-health', 'male')).toBe(2000);
  });

  it('enforces floor for male (1500)', () => {
    expect(calculateCalorieTarget(1000, 'lose-weight', 'male')).toBe(1500);
  });

  it('enforces floor for female (1200)', () => {
    expect(calculateCalorieTarget(1000, 'lose-weight', 'female')).toBe(1200);
  });

  it('enforces ceiling (4000)', () => {
    expect(calculateCalorieTarget(5000, 'gain-weight', 'male')).toBe(4000);
  });

  it('defaults to multiplier 1.0 for unknown goal', () => {
    expect(calculateCalorieTarget(2000, 'unknown', 'male')).toBe(2000);
  });
});
