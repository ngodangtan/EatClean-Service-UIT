import Joi from 'joi';

export const healthProfileSchema = Joi.object({
  goal: Joi.string().valid('lose-weight', 'gain-weight', 'improve-health'),
  triedHealthyBefore: Joi.boolean(),
  hungryTime: Joi.string().trim(),
  favoriteMeal: Joi.string().trim(),
  desiredWeight: Joi.number().min(1).max(500),
  activityLevel: Joi.string().valid('sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extremely-active'),
  averageDay: Joi.string().trim(),
  workSchedule: Joi.string().trim(),
  sleepDuration: Joi.number().min(0).max(24),
  diseases: Joi.array().items(
    Joi.string().valid('diabetes', 'kidney-disease', 'high-uric-acid', 'hypertension')
  ),
  dietPreference: Joi.string().trim(),
  mealsPerDay: Joi.number().integer().min(1).max(6),
  cuisinePreference: Joi.array().items(Joi.string().trim()).max(10)
});
