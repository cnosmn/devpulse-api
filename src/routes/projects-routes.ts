import { Router } from 'express';
import projectsController from '../controllers/projects-controller.js';

const router = Router();

router.get('/', projectsController.getProjects.bind(projectsController));

export default router;
