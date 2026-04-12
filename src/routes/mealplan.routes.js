import { Router } from 'express';
import { generateMealPlan, getMealPlan, getMealPlans, deleteMealPlan, deleteAllMealPlans, swapMeal } from '../controllers/mealplan.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { generateMealPlanSchema } from '../validators/mealPlanGenerate.validator.js';

const router = Router();

// Generate new meal plan (calls LM Studio)
router.post('/generate', requireAuth, validate(generateMealPlanSchema), generateMealPlan);

// Get most recent meal plan
router.get('/latest', requireAuth, getMealPlan);

// Get all meal plans for user (with pagination)
router.get('/', requireAuth, getMealPlans);

// Swap a meal in a plan
router.post('/:planId/swap', requireAuth, swapMeal);

// Delete all meal plans for user
router.delete('/', requireAuth, deleteAllMealPlans);

// Delete a meal plan
router.delete('/:id', requireAuth, deleteMealPlan);

export default router;
