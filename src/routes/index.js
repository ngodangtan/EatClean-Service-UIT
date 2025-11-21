import { Router } from 'express';
import authRoutes from './auth.routes.js';
import recipeRoutes from './recipe.routes.js';
import healthRoutes from './health.routes.js';

const api = Router();

api.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
api.use('/auth', authRoutes);
api.use('/recipes', recipeRoutes);
api.use('/health-profile', healthRoutes);

// TODO: thêm /meals, /plans sau
export default api;
