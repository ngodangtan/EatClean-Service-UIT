import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listRecipes, getRecipe, createRecipe, updateRecipe, removeRecipe } from '../controllers/recipe.controller.js';

const router = Router();

router.get('/', listRecipes);
router.get('/:id', getRecipe);

// cần token
router.post('/', requireAuth, createRecipe);
router.put('/:id', requireAuth, updateRecipe);
router.delete('/:id', requireAuth, removeRecipe);

export default router;
