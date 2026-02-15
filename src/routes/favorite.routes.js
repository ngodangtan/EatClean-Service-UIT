import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { addFavorite, getFavorites, removeFavorite, checkFavorite } from '../controllers/favorite.controller.js';

const router = Router();

router.post('/', requireAuth, addFavorite);
router.get('/', requireAuth, getFavorites);
router.get('/check', requireAuth, checkFavorite);
router.delete('/:id', requireAuth, removeFavorite);

export default router;
