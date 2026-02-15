import { describe, it, expect } from 'vitest';
import { adjustMacrosForDiseases } from '../../../../src/services/disease/macroAdjuster.js';

describe('adjustMacrosForDiseases', () => {
  const baseMacros = { protein: 150, carbs: 250, fat: 70 };
  const calorieTarget = 2000;

  it('returns unchanged macros when no diseases', () => {
    const result = adjustMacrosForDiseases(baseMacros, calorieTarget, [], 70);
    expect(result).toEqual(baseMacros);
  });

  it('returns unchanged macros when diseases is null', () => {
    const result = adjustMacrosForDiseases(baseMacros, calorieTarget, null, 70);
    expect(result).toEqual(baseMacros);
  });

  it('caps carbs for diabetes (35%)', () => {
    const result = adjustMacrosForDiseases(baseMacros, calorieTarget, ['diabetes'], 70);
    const maxCarbGrams = Math.round((calorieTarget * 35 / 100) / 4);
    expect(result.carbs).toBeLessThanOrEqual(maxCarbGrams);
  });

  it('caps protein for kidney-disease (0.8g/kg)', () => {
    const weight = 70;
    const result = adjustMacrosForDiseases(baseMacros, calorieTarget, ['kidney-disease'], weight);
    const maxProtein = Math.round(weight * 0.8);
    expect(result.protein).toBeLessThanOrEqual(maxProtein);
  });

  it('caps fat for hypertension (25%)', () => {
    const result = adjustMacrosForDiseases(baseMacros, calorieTarget, ['hypertension'], 70);
    const maxFatGrams = Math.round((calorieTarget * 25 / 100) / 9);
    expect(result.fat).toBeLessThanOrEqual(maxFatGrams);
  });

  it('applies strictest caps across multiple diseases', () => {
    const weight = 70;
    const result = adjustMacrosForDiseases(baseMacros, calorieTarget, ['diabetes', 'kidney-disease', 'hypertension'], weight);
    const maxProtein = Math.round(weight * 0.8);
    const maxCarbGrams = Math.round((calorieTarget * 35 / 100) / 4);
    const maxFatGrams = Math.round((calorieTarget * 25 / 100) / 9);
    expect(result.protein).toBeLessThanOrEqual(maxProtein);
    expect(result.carbs).toBeLessThanOrEqual(maxCarbGrams);
    expect(result.fat).toBeLessThanOrEqual(maxFatGrams);
  });

  it('all macro values are non-negative', () => {
    const result = adjustMacrosForDiseases(baseMacros, calorieTarget, ['diabetes', 'kidney-disease', 'high-uric-acid', 'hypertension'], 70);
    expect(result.protein).toBeGreaterThanOrEqual(0);
    expect(result.carbs).toBeGreaterThanOrEqual(0);
    expect(result.fat).toBeGreaterThanOrEqual(0);
  });
});
