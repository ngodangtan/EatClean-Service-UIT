import { Router } from 'express';
import { login, register, logout, getProfile, removeUser, refreshToken, revokeToken, updateProfile } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, updateProfileSchema } from '../validators/auth.validator.js';
import { loginLimiter } from '../middleware/loginLimiter.js';

const router = Router();
router.post('/register', validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/logout', requireAuth, logout);
router.get('/profile', requireAuth, getProfile);
router.put('/profile', requireAuth, validate(updateProfileSchema), updateProfile);
router.post('/refresh-token', refreshToken);
router.post('/revoke-token', requireAuth, revokeToken);

// Delete user (self or admin)
router.delete('/:id', requireAuth, removeUser);

export default router;
