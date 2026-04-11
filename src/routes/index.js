import { Router } from 'express';
import authRoutes from './auth.routes.js';
import healthRoutes from './health.routes.js';
import mealplanRoutes from './mealplan.routes.js';
import diseaseRoutes from './disease.routes.js';

const api = Router();

api.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
api.use('/auth', authRoutes);
api.use('/health-profile', healthRoutes);
api.use('/meal-plans', mealplanRoutes);
api.use('/diseases', diseaseRoutes);

export default api;
