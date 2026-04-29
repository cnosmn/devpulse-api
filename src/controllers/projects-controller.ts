import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import projectsService from '../services/projects-service.js';

import { prisma } from '../prisma/client.js';

const getProjectsSchema = z.object({
  userId: z.string(), // This is the GitHub ID sent by the frontend
});

export class ProjectsController {
  async getProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId: githubId } = getProjectsSchema.parse(req.query);
      
      const user = await prisma.user.findUnique({ where: { githubId } });
      if (!user) {
        return res.status(404).json({ success: false, error: { message: 'User not found' } });
      }
      
      const projects = await projectsService.getUserProjects(user.id);

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
