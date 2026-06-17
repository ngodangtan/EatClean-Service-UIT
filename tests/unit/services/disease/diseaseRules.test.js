import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_DISEASES,
  getDiseaseRules,
  getForbiddenIngredients,
  getLimitedIngredients,
  getPreferredIngredients
} from '../../../../src/services/disease/diseaseRules.js';

describe('diseaseRules', () => {
  it('supports 4 diseases', () => {
    expect(SUPPORTED_DISEASES).toHaveLength(4);
    expect(SUPPORTED_DISEASES).toContain('diabetes');
    expect(SUPPORTED_DISEASES).toContain('kidney-disease');
    expect(SUPPORTED_DISEASES).toContain('high-uric-acid');
    expect(SUPPORTED_DISEASES).toContain('hypertension');
  });

  it('getDiseaseRules returns rules for supported disease', () => {
    const rules = getDiseaseRules('diabetes');
    expect(rules).toBeTruthy();
    expect(rules.macroAdjustment).toBeDefined();
    expect(rules.forbiddenIngredients).toBeInstanceOf(Array);
  });

  it('getDiseaseRules returns null for unknown disease', () => {
    expect(getDiseaseRules('unknown')).toBeNull();
  });

  it('getForbiddenIngredients returns deduplicated list', () => {
    const forbidden = getForbiddenIngredients(['diabetes', 'hypertension']);
    expect(forbidden.length).toBeGreaterThan(0);
    const unique = new Set(forbidden);
    expect(unique.size).toBe(forbidden.length);
  });

  it('getForbiddenIngredients returns empty for empty diseases', () => {
    expect(getForbiddenIngredients([])).toEqual([]);
  });

  it('getLimitedIngredients returns array', () => {
    const limited = getLimitedIngredients(['kidney-disease']);
    expect(limited.length).toBeGreaterThan(0);
  });

  it('getPreferredIngredients returns array', () => {
    const preferred = getPreferredIngredients(['high-uric-acid']);
    expect(preferred.length).toBeGreaterThan(0);
  });

  it('getForbiddenIngredients handles non-array input', () => {
    expect(getForbiddenIngredients(null)).toEqual([]);
    expect(getForbiddenIngredients(undefined)).toEqual([]);
  });
});
