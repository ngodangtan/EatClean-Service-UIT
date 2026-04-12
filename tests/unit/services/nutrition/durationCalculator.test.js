import { describe, it, expect } from 'vitest';
import { calculatePlanDuration } from '../../../../src/services/nutrition/durationCalculator.js';

describe('calculatePlanDuration', () => {
  it('returns 1 week for improve-health', () => {
    const result = calculatePlanDuration({ goal: 'improve-health', currentWeight: 70, desiredWeight: 70 });
    expect(result.weeks).toBe(1);
    expect(result.totalDays).toBe(7);
  });

  it('calculates weeks for lose-weight', () => {
    // 80 → 75 = 5kg at 0.5kg/week = 10 weeks
    const result = calculatePlanDuration({ goal: 'lose-weight', currentWeight: 80, desiredWeight: 75 });
    expect(result.weeks).toBe(10);
    expect(result.totalDays).toBe(70);
  });

  it('calculates weeks for gain-weight', () => {
    // 60 → 65 = 5kg at 0.25kg/week = 20 weeks
    const result = calculatePlanDuration({ goal: 'gain-weight', currentWeight: 60, desiredWeight: 65 });
    expect(result.weeks).toBe(20);
  });

  it('returns 1 week when weight delta is zero or negative for lose-weight', () => {
    const result = calculatePlanDuration({ goal: 'lose-weight', currentWeight: 70, desiredWeight: 75 });
    expect(result.weeks).toBe(1);
  });

  it('caps at 52 weeks', () => {
    const result = calculatePlanDuration({ goal: 'lose-weight', currentWeight: 150, desiredWeight: 70 });
    expect(result.weeks).toBe(52);
  });

  it('returns 1 week when desiredWeight is null', () => {
    const result = calculatePlanDuration({ goal: 'lose-weight', currentWeight: 80 });
    expect(result.weeks).toBe(1);
  });

  it('always returns templateDays as 7', () => {
    const result = calculatePlanDuration({ goal: 'improve-health' });
    expect(result.templateDays).toBe(7);
  });

  it('uses requestedWeeks when provided, bypassing weight-delta calculation', () => {
    const result = calculatePlanDuration({ goal: 'lose-weight', currentWeight: 80, desiredWeight: 75, requestedWeeks: 2 });
    expect(result.weeks).toBe(2);
    expect(result.totalDays).toBe(14);
  });

  it('ignores requestedWeeks when zero or negative', () => {
    const result = calculatePlanDuration({ goal: 'lose-weight', currentWeight: 80, desiredWeight: 75, requestedWeeks: 0 });
    expect(result.weeks).toBe(10); // falls back to weight-delta calc
  });

  it('clamps requestedWeeks to MAX_WEEKS (52)', () => {
    const result = calculatePlanDuration({ goal: 'improve-health', requestedWeeks: 100 });
    expect(result.weeks).toBe(52);
  });
});
