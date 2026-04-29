import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import activityService from '../services/activity-service.js';
import { prisma } from '../prisma/client.js';

const getActivitiesSchema = z.object({
  userId: z.string(), // GitHub ID sent by the frontend
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 50),
});

export class ActivityController {
  async getActivities(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId: githubId, limit } = getActivitiesSchema.parse(req.query);
      
      const user = await prisma.user.findUnique({ where: { githubId } });
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: { message: 'User not found' } 
        });
      }
      
      const activities = await activityService.getUserActivities(user.id, limit);

      res.status(200).json({
        success: true,
        data: activities,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ActivityController();
