import { Router } from 'express';
import { getDiseases } from '../controllers/disease.controller.js';

const router = Router();

router.get('/', getDiseases);

export default router;
