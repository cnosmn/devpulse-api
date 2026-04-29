import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import analyticsService from '../services/analytics-service.js';
import { prisma } from '../prisma/client.js';

const getAnalyticsSchema = z.object({
  userId: z.string(), // GitHub ID
});

export class AnalyticsController {
  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId: githubId } = getAnalyticsSchema.parse(req.query);
      
      const user = await prisma.user.findUnique({ where: { githubId } });
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: { message: 'User not found' } 
        });
      }
      
      const analytics = await analyticsService.getUserAnalytics(user.id);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AnalyticsController();
