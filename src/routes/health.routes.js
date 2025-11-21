import { Router } from 'express';
import { createOrUpdateHealthProfile, getHealthProfile, deleteHealthProfile } from '../controllers/health.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST/PUT: Create or update health profile
router.post('/', requireAuth, createOrUpdateHealthProfile);

// GET: Retrieve health profile for authenticated user
router.get('/', requireAuth, getHealthProfile);

// DELETE: Delete health profile
router.delete('/', requireAuth, deleteHealthProfile);

export default router;
