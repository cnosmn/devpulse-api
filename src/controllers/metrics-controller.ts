import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import metricsService from '../services/metrics-service.js';
import scoreService from '../services/score-service.js';
import { prisma } from '../prisma/client.js';

const getOverviewSchema = z.object({
  userId: z.string(), // This is the GitHub ID sent by the frontend
  timezone: z.string().optional(),
});

export class MetricsController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId: githubId } = getOverviewSchema.parse(req.query);
      
      const user = await prisma.user.findUnique({ where: { githubId } });

      if (!user) {
        return res.status(404).json({ success: false, error: { message: 'User not found' } });
      }
      
      const metrics = await metricsService.getUserMetrics(user.id);

      // Attempt to fetch exact official contribution graph if token is provided
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.split(' ')[1];
      
      if (accessToken) {
        try {
          // Dynamic import to avoid circular dependencies if any, or just import at top
          const { default: githubService } = await import('../services/github-service.js');
          const githubGraph = await githubService.fetchContributionGraph(accessToken, user.username);
          
          metrics.summary.totalCommits = githubGraph.totalContributions;
          
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          metrics.heatmap = githubGraph.days.filter((d: any) => new Date(d.date) >= thirtyDaysAgo);
        } catch (e) {
          console.error("Failed to fetch live contribution graph, falling back to DB:", e);
        }
      }

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
      const { userId: githubId, timezone } = getOverviewSchema.parse(req.query);
      
      const user = await prisma.user.findUnique({ where: { githubId } });
      
      if (!user) {
        return res.status(404).json({ success: false, error: { message: 'User not found' } });
      }
      
      const scoreData = await scoreService.calculateUserScore(user.id, timezone);
      
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
