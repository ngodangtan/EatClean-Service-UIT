import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }),
  username: Joi.string().trim().max(50),
  name: Joi.string().trim().max(50),
  fullName: Joi.string().trim().max(100),
  phone: Joi.string().trim().max(20),
  birthday: Joi.date().iso(),
  gender: Joi.string().valid('male', 'female', 'other'),
  height: Joi.number().min(1).max(300),
  currentWeight: Joi.number().min(1).max(500)
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const updateProfileSchema = Joi.object({
  fullName: Joi.string().trim().max(100),
  phone: Joi.string().trim().max(20),
  birthday: Joi.date().iso(),
  gender: Joi.string().valid('male', 'female', 'other'),
  username: Joi.string().trim().max(50),
  height: Joi.number().min(1).max(300),
  currentWeight: Joi.number().min(1).max(500)
}).min(1);
