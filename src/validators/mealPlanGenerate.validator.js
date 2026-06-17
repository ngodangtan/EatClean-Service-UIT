import Joi from 'joi';

export const PURPOSES = ['daily_health_based', 'weight_management', 'disease_based'];
export const WEIGHT_GOALS = ['lose-weight', 'gain-weight', 'muscle-gain'];
export const ALLOWED_DURATION_WEEKS = [1, 2, 4]; // 1 week / 2 weeks / 1 month

const healthSnapshotSchema = Joi.object({
  // Apple Watch — kcal burned through movement today
  activeEnergyKcal: Joi.number().min(0).max(8000),
  // Apple Watch — resting kcal estimate (HealthKit basal energy)
  restingEnergyKcal: Joi.number().min(0).max(5000),
  steps: Joi.number().integer().min(0).max(200000),
  heartRateAvg: Joi.number().min(20).max(250),
  sleepHours: Joi.number().min(0).max(24),
  measuredAt: Joi.date()
}).min(1);

/**
 * Joi validator for POST /api/meal-plans/generate.
 *
 * The schema is purpose-aware:
 *   - daily_health_based:  optional `healthSnapshot`. duration is forced to 1 day.
 *   - weight_management:   requires `weightGoal`, `desiredWeight`, `durationWeeks`.
 *   - disease_based:       requires `durationWeeks`. goal is forced to 'improve-health'.
 *
 * Cross-field rules (e.g. "weightGoal=gain-weight contraindicated by obesity")
 * live in the controller — they need the user's health profile, which Joi can't see.
 */
export const generateMealPlanSchema = Joi.object({
  purpose: Joi.string().valid(...PURPOSES).required(),

  // weight_management
  weightGoal: Joi.string().valid(...WEIGHT_GOALS).when('purpose', {
    is: 'weight_management',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  desiredWeight: Joi.number().min(20).max(500).when('purpose', {
    is: 'weight_management',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),

  // weight_management + disease_based
  durationWeeks: Joi.number()
    .valid(...ALLOWED_DURATION_WEEKS)
    .when('purpose', {
      is: Joi.valid('weight_management', 'disease_based'),
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),

  // daily_health_based
  healthSnapshot: healthSnapshotSchema.when('purpose', {
    is: 'daily_health_based',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  })
});
