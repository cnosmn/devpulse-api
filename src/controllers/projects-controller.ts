import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import projectsService from '../services/projects-service.js';

const getProjectsSchema = z.object({
  userId: z.string().transform(val => parseInt(val, 10)),
});

export class ProjectsController {
  async getProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = getProjectsSchema.parse(req.query);
      
      const projects = await projectsService.getUserProjects(userId);

      res.status(200).json({
        success: true,
        data: projects,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ProjectsController();
