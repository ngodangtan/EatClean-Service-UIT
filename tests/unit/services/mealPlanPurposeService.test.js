import { describe, it, expect } from 'vitest';
import {
  checkWeightGoalContraindications,
  mapWeightGoalToEngineGoal,
  tdeeFromHealthSnapshot
} from '../../../src/services/mealPlanPurposeService.js';

describe('checkWeightGoalContraindications', () => {
  it('returns blocked=false when no diseases', () => {
    const result = checkWeightGoalContraindications('gain-weight', []);
    expect(result).toEqual({ blocked: false, conflicts: [] });
  });

  it('returns blocked=false when no matching contraindications', () => {
    const result = checkWeightGoalContraindications('gain-weight', ['diabetes']);
    expect(result).toEqual({ blocked: false, conflicts: [] });
  });

  it('blocks gain-weight for obesity', () => {
    const result = checkWeightGoalContraindications('gain-weight', ['obesity']);
    expect(result.blocked).toBe(true);
    expect(result.conflicts).toContain('obesity');
  });

  it('blocks gain-weight for high-cholesterol, heart-disease, hypertension', () => {
    const result = checkWeightGoalContraindications('gain-weight', ['high-cholesterol', 'heart-disease', 'hypertension']);
    expect(result.blocked).toBe(true);
    expect(result.conflicts).toEqual(['high-cholesterol', 'heart-disease', 'hypertension']);
  });

  it('blocks muscle-gain for kidney-disease', () => {
    const result = checkWeightGoalContraindications('muscle-gain', ['kidney-disease']);
    expect(result.blocked).toBe(true);
    expect(result.conflicts).toContain('kidney-disease');
  });

  it('blocks muscle-gain for high-uric-acid', () => {
    const result = checkWeightGoalContraindications('muscle-gain', ['high-uric-acid']);
    expect(result.blocked).toBe(true);
    expect(result.conflicts).toContain('high-uric-acid');
  });

  it('blocks lose-weight for anemia', () => {
    const result = checkWeightGoalContraindications('lose-weight', ['anemia']);
    expect(result.blocked).toBe(true);
    expect(result.conflicts).toContain('anemia');
  });

  it('returns blocked=false for unknown weightGoal', () => {
    const result = checkWeightGoalContraindications('unknown-goal', ['obesity']);
    expect(result).toEqual({ blocked: false, conflicts: [] });
  });

  it('handles null userDiseaseKeys gracefully', () => {
    const result = checkWeightGoalContraindications('gain-weight', null);
    expect(result).toEqual({ blocked: false, conflicts: [] });
  });

  it('only returns conflicting diseases, not all user diseases', () => {
    const result = checkWeightGoalContraindications('gain-weight', ['diabetes', 'obesity', 'kidney-disease']);
    expect(result.blocked).toBe(true);
    expect(result.conflicts).toEqual(['obesity']);
  });
});

describe('mapWeightGoalToEngineGoal', () => {
  it('maps muscle-gain to gain-weight', () => {
    expect(mapWeightGoalToEngineGoal('muscle-gain')).toBe('gain-weight');
  });

  it('passes through lose-weight unchanged', () => {
    expect(mapWeightGoalToEngineGoal('lose-weight')).toBe('lose-weight');
  });

  it('passes through gain-weight unchanged', () => {
    expect(mapWeightGoalToEngineGoal('gain-weight')).toBe('gain-weight');
  });
});

describe('tdeeFromHealthSnapshot', () => {
  it('returns rounded TDEE when both resting and active energy present', () => {
    const result = tdeeFromHealthSnapshot({ restingEnergyKcal: 1500, activeEnergyKcal: 600 });
    expect(result).toBe(2100);
  });

  it('returns null when snapshot is null', () => {
    expect(tdeeFromHealthSnapshot(null)).toBeNull();
  });

  it('returns null when snapshot is not an object', () => {
    expect(tdeeFromHealthSnapshot('string')).toBeNull();
  });

  it('returns null when only activeEnergyKcal is present', () => {
    const result = tdeeFromHealthSnapshot({ activeEnergyKcal: 600 });
    expect(result).toBeNull();
  });

  it('returns null when only restingEnergyKcal is present', () => {
    const result = tdeeFromHealthSnapshot({ restingEnergyKcal: 1500 });
    expect(result).toBeNull();
  });

  it('returns null when TDEE is below 800', () => {
    const result = tdeeFromHealthSnapshot({ restingEnergyKcal: 300, activeEnergyKcal: 200 });
    expect(result).toBeNull();
  });

  it('returns null when TDEE exceeds 8000', () => {
    const result = tdeeFromHealthSnapshot({ restingEnergyKcal: 5000, activeEnergyKcal: 4000 });
    expect(result).toBeNull();
  });

  it('rounds the result', () => {
    const result = tdeeFromHealthSnapshot({ restingEnergyKcal: 1500.7, activeEnergyKcal: 600.4 });
    expect(result).toBe(2101);
  });
});
