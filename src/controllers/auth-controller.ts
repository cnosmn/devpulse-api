import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import authService from '../services/auth-service.js';
import { triggerSyncJob } from '../jobs/sync-job.js';

const syncUserSchema = z.object({
  githubId: z.string().or(z.number().transform(val => val.toString())),
  username: z.string(),
  email: z.string().email().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export class AuthController {
  async syncUser(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = syncUserSchema.parse(req.body);

      const user = await authService.upsertUser(validatedData);

      // Trigger background sync job
      const token = (req.body.accessToken as string) || (req.headers['x-github-token'] as string);
      if (token) {
        console.log(`Triggering sync for user ${user.id} with token starting with ${token.substring(0, 7)}...`);
        triggerSyncJob(user.id, token);
      } else {
        console.warn(`No token provided for background sync for user ${user.id}`);
      }

      res.status(200).json({
        success: true,
        data: {
          user,
        },
        message: 'User synchronized successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
