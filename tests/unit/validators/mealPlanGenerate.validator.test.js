import { describe, it, expect } from 'vitest';
import { generateMealPlanSchema, PURPOSES, WEIGHT_GOALS, ALLOWED_DURATION_WEEKS } from '../../../src/validators/mealPlanGenerate.validator.js';

function validate(body) {
  return generateMealPlanSchema.validate(body, { abortEarly: false });
}

describe('generateMealPlanSchema', () => {
  describe('exports', () => {
    it('exports PURPOSES', () => {
      expect(PURPOSES).toEqual(['daily_health_based', 'weight_management', 'disease_based']);
    });

    it('exports WEIGHT_GOALS', () => {
      expect(WEIGHT_GOALS).toEqual(['lose-weight', 'gain-weight', 'muscle-gain']);
    });

    it('exports ALLOWED_DURATION_WEEKS', () => {
      expect(ALLOWED_DURATION_WEEKS).toEqual([1, 2, 4]);
    });
  });

  describe('purpose field', () => {
    it('requires purpose', () => {
      const { error } = validate({});
      expect(error.details.some(d => d.path.includes('purpose'))).toBe(true);
    });

    it('rejects invalid purpose', () => {
      const { error } = validate({ purpose: 'invalid' });
      expect(error).toBeDefined();
    });
  });

  describe('purpose = daily_health_based', () => {
    it('accepts with no optional fields', () => {
      const { error } = validate({ purpose: 'daily_health_based' });
      expect(error).toBeUndefined();
    });

    it('accepts with healthSnapshot', () => {
      const { error } = validate({
        purpose: 'daily_health_based',
        healthSnapshot: { activeEnergyKcal: 500, restingEnergyKcal: 1400 }
      });
      expect(error).toBeUndefined();
    });

    it('rejects weightGoal', () => {
      const { error } = validate({ purpose: 'daily_health_based', weightGoal: 'lose-weight' });
      expect(error).toBeDefined();
    });

    it('rejects durationWeeks', () => {
      const { error } = validate({ purpose: 'daily_health_based', durationWeeks: 1 });
      expect(error).toBeDefined();
    });

    it('rejects desiredWeight', () => {
      const { error } = validate({ purpose: 'daily_health_based', desiredWeight: 70 });
      expect(error).toBeDefined();
    });
  });

  describe('purpose = weight_management', () => {
    const validPayload = {
      purpose: 'weight_management',
      weightGoal: 'lose-weight',
      desiredWeight: 65,
      durationWeeks: 2
    };

    it('accepts valid payload', () => {
      const { error } = validate(validPayload);
      expect(error).toBeUndefined();
    });

    it('requires weightGoal', () => {
      const { error } = validate({ ...validPayload, weightGoal: undefined });
      expect(error).toBeDefined();
    });

    it('requires desiredWeight', () => {
      const { error } = validate({ ...validPayload, desiredWeight: undefined });
      expect(error).toBeDefined();
    });

    it('requires durationWeeks', () => {
      const { error } = validate({ ...validPayload, durationWeeks: undefined });
      expect(error).toBeDefined();
    });

    it('rejects invalid weightGoal', () => {
      const { error } = validate({ ...validPayload, weightGoal: 'invalid' });
      expect(error).toBeDefined();
    });

    it('rejects durationWeeks not in allowed list', () => {
      const { error } = validate({ ...validPayload, durationWeeks: 3 });
      expect(error).toBeDefined();
    });

    it('accepts muscle-gain as weightGoal', () => {
      const { error } = validate({ ...validPayload, weightGoal: 'muscle-gain' });
      expect(error).toBeUndefined();
    });

    it('rejects healthSnapshot', () => {
      const { error } = validate({ ...validPayload, healthSnapshot: { steps: 1000 } });
      expect(error).toBeDefined();
    });
  });

  describe('purpose = disease_based', () => {
    it('accepts valid payload', () => {
      const { error } = validate({ purpose: 'disease_based', durationWeeks: 4 });
      expect(error).toBeUndefined();
    });

    it('requires durationWeeks', () => {
      const { error } = validate({ purpose: 'disease_based' });
      expect(error).toBeDefined();
    });

    it('rejects weightGoal', () => {
      const { error } = validate({ purpose: 'disease_based', durationWeeks: 1, weightGoal: 'lose-weight' });
      expect(error).toBeDefined();
    });

    it('rejects desiredWeight', () => {
      const { error } = validate({ purpose: 'disease_based', durationWeeks: 1, desiredWeight: 70 });
      expect(error).toBeDefined();
    });

    it('rejects healthSnapshot', () => {
      const { error } = validate({ purpose: 'disease_based', durationWeeks: 1, healthSnapshot: { steps: 1000 } });
      expect(error).toBeDefined();
    });
  });

  describe('healthSnapshot validation', () => {
    it('requires at least one field', () => {
      const { error } = validate({ purpose: 'daily_health_based', healthSnapshot: {} });
      expect(error).toBeDefined();
    });

    it('rejects negative activeEnergyKcal', () => {
      const { error } = validate({ purpose: 'daily_health_based', healthSnapshot: { activeEnergyKcal: -1 } });
      expect(error).toBeDefined();
    });

    it('rejects activeEnergyKcal above 8000', () => {
      const { error } = validate({ purpose: 'daily_health_based', healthSnapshot: { activeEnergyKcal: 9000 } });
      expect(error).toBeDefined();
    });

    it('accepts valid sleepHours', () => {
      const { error } = validate({ purpose: 'daily_health_based', healthSnapshot: { sleepHours: 7.5 } });
      expect(error).toBeUndefined();
    });
  });
});
