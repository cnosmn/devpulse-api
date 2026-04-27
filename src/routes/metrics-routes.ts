import { Router } from 'express';
import metricsController from '../controllers/metrics-controller.js';

const router = Router();

router.get('/overview', metricsController.getOverview.bind(metricsController));

export default router;
