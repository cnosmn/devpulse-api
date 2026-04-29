import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import metricsService from '../services/metrics-service.js';
import scoreService from '../services/score-service.js';

const getOverviewSchema = z.object({
  userId: z.string().transform(val => parseInt(val, 10)),
  timezone: z.string().optional(),
});

export class MetricsController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = getOverviewSchema.parse(req.query);
      
      const metrics = await metricsService.getUserMetrics(userId);

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  async getScore(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, timezone } = getOverviewSchema.parse(req.query);
      
      const scoreData = await scoreService.calculateUserScore(userId, timezone);

      res.status(200).json({
        success: true,
        data: scoreData,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new MetricsController();
