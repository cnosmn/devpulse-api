import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import authService from '../services/auth-service.js';

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
      // Note: In a real scenario, the accessToken comes from the request body or session
      // For now, we assume it's provided in the sync request or we mock it if missing
      const token = (req.body.accessToken as string) || (req.headers['x-github-token'] as string);
      if (token) {
        import('../jobs/sync-job.js').then(m => m.triggerSyncJob(user.id, token));
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
