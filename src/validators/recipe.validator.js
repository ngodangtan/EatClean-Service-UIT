import Joi from 'joi';

export const createRecipeSchema = Joi.object({
  title: Joi.string().trim().required(),
  description: Joi.string().trim(),
  calories: Joi.number().min(0),
  protein: Joi.number().min(0),
  carbs: Joi.number().min(0),
  fat: Joi.number().min(0),
  tags: Joi.array().items(Joi.string().trim()),
  ingredients: Joi.array().items(Joi.string().trim()),
  steps: Joi.array().items(Joi.string().trim()),
  imageUrl: Joi.string().uri()
});

export const updateRecipeSchema = Joi.object({
  title: Joi.string().trim(),
  description: Joi.string().trim(),
  calories: Joi.number().min(0),
  protein: Joi.number().min(0),
  carbs: Joi.number().min(0),
  fat: Joi.number().min(0),
  tags: Joi.array().items(Joi.string().trim()),
  ingredients: Joi.array().items(Joi.string().trim()),
  steps: Joi.array().items(Joi.string().trim()),
  imageUrl: Joi.string().uri()
}).min(1);
