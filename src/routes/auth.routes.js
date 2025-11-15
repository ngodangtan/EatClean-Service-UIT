import { Router } from 'express';
import { login, register, removeUser } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.post('/register', register);
router.post('/login',    login);

// Delete user (self or admin)
router.delete('/:id', requireAuth, removeUser);

export default router;
