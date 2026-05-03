import { Router } from 'express';
import { generateMealPlan, getMealPlan, deleteMealPlan, deleteAllMealPlans } from '../controllers/mealplan.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { generateMealPlanSchema } from '../validators/mealPlanGenerate.validator.js';

const router = Router();

// Generate new meal plan (calls LM Studio) — replaces any existing plan
router.post('/generate', requireAuth, validate(generateMealPlanSchema), generateMealPlan);

// Get the user's current meal plan
router.get('/', requireAuth, getMealPlan);

// Delete all meal plans for user
router.delete('/', requireAuth, deleteAllMealPlans);

// Delete a meal plan
router.delete('/:id', requireAuth, deleteMealPlan);

export default router;
