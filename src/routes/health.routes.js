import { Router } from 'express';
import { createOrUpdateHealthProfile, getHealthProfile, deleteHealthProfile } from '../controllers/health.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { healthProfileSchema } from '../validators/healthProfile.validator.js';

const router = Router();

// POST: Create health profile (also upserts if one already exists, for backward compat)
router.post('/', requireAuth, validate(healthProfileSchema), createOrUpdateHealthProfile);

// PUT: Update existing health profile. Same handler as POST — accepts partial payloads
// (omitted fields are preserved). Arrays like `diseases` are replaced as a whole, so the
// frontend should send the complete array, not a delta.
router.put('/', requireAuth, validate(healthProfileSchema), createOrUpdateHealthProfile);

// GET: Retrieve health profile for authenticated user
router.get('/', requireAuth, getHealthProfile);

// DELETE: Delete health profile
router.delete('/', requireAuth, deleteHealthProfile);

export default router;
