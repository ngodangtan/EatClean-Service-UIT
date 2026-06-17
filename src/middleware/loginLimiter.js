import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { message: 'Too many login attempts, please try again after 15 minutes', statusCode: 429 },
  standardHeaders: true,
  legacyHeaders: false
});
