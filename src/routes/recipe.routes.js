import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listRecipes, getRecipe, createRecipe, updateRecipe, removeRecipe } from '../controllers/recipe.controller.js';
import { validate } from '../middleware/validate.js';
import { createRecipeSchema, updateRecipeSchema } from '../validators/recipe.validator.js';

const router = Router();

router.get('/', listRecipes);
router.get('/:id', getRecipe);

router.post('/', requireAuth, validate(createRecipeSchema), createRecipe);
router.put('/:id', requireAuth, validate(updateRecipeSchema), updateRecipe);
router.delete('/:id', requireAuth, removeRecipe);

export default router;
