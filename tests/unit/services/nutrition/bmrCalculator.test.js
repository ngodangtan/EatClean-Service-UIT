import { describe, it, expect } from 'vitest';
import { calculateBMR } from '../../../../src/services/nutrition/bmrCalculator.js';

describe('calculateBMR', () => {
  it('calculates BMR for male', () => {
    // 10*70 + 6.25*175 - 5*30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75
    const result = calculateBMR({ weight: 70, height: 175, age: 30, gender: 'male' });
    expect(result).toBe(1648.75);
  });

  it('calculates BMR for female', () => {
    // 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    const result = calculateBMR({ weight: 60, height: 165, age: 25, gender: 'female' });
    expect(result).toBe(1345.25);
  });

  it('returns higher BMR for heavier weight', () => {
    const light = calculateBMR({ weight: 50, height: 170, age: 30, gender: 'male' });
    const heavy = calculateBMR({ weight: 90, height: 170, age: 30, gender: 'male' });
    expect(heavy).toBeGreaterThan(light);
  });

  it('returns lower BMR for older age', () => {
    const young = calculateBMR({ weight: 70, height: 175, age: 20, gender: 'male' });
    const old = calculateBMR({ weight: 70, height: 175, age: 50, gender: 'male' });
    expect(young).toBeGreaterThan(old);
  });
});
