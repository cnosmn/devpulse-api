import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import authService from '../services/auth-service.js';
import { triggerSyncJob } from '../jobs/sync-job.js';
import { AppError } from '../utils/app-error.js';

const syncUserSchema = z.object({
  githubId: z.string().or(z.number().transform(val => val.toString())),
  username: z.string(),
  email: z.string().email().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  accessToken: z.string(),
});

export class AuthController {
  async syncUser(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = syncUserSchema.parse(req.body);
      const { accessToken, githubId } = validatedData;

      // Use AuthService to verify and sync (Business Logic in Service Layer)
      const user = await authService.verifyAndSyncUser(accessToken, githubId, validatedData);

      // Trigger background sync job
      console.log(`Triggering sync for user ${user.id} with token starting with ${accessToken.substring(0, 7)}...`);
      triggerSyncJob(user.id, accessToken);

      res.status(200).json({
        success: true,
        data: {
          user,
        },
        message: 'User synchronized successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.issues[0].message,
          },
        });
      }
      next(error);
    }
  }
}

export default new AuthController();
