import { describe, it, expect } from 'vitest';
import { calculateMacros } from '../../../../src/services/nutrition/macroCalculator.js';

describe('calculateMacros', () => {
  it('calculates macros for lose-weight', () => {
    const result = calculateMacros(2000, 'lose-weight', 70);
    // protein: 70 * 1.8 = 126g
    // fat: (2000 * 25/100) / 9 = 55.6 ≈ 56g
    // carbs: (2000 - 126*4 - 56*9) / 4
    expect(result.protein).toBe(126);
    expect(result.fat).toBe(56);
    expect(result.carbs).toBeGreaterThan(0);
  });

  it('calculates macros for gain-weight', () => {
    const result = calculateMacros(2500, 'gain-weight', 80);
    expect(result.protein).toBe(128); // 80 * 1.6
    expect(result.carbs).toBeGreaterThan(0);
    expect(result.fat).toBeGreaterThan(0);
  });

  it('calculates macros for improve-health', () => {
    const result = calculateMacros(2000, 'improve-health', 70);
    expect(result.protein).toBe(98); // 70 * 1.4
  });

  it('carbs never go negative', () => {
    // Very low calories, high protein/fat
    const result = calculateMacros(500, 'lose-weight', 100);
    expect(result.carbs).toBeGreaterThanOrEqual(0);
  });

  it('macros reconstruct close to calorie target', () => {
    const result = calculateMacros(2000, 'lose-weight', 70);
    const reconstructed = result.protein * 4 + result.carbs * 4 + result.fat * 9;
    expect(Math.abs(reconstructed - 2000)).toBeLessThanOrEqual(10);
  });
});
