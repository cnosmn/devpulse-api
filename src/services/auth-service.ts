import { prisma } from '../prisma/client.js';
import githubService from './github-service.js';
import { AppError } from '../utils/app-error.js';

export interface UpsertUserData {
  githubId: string;
  username: string;
  email?: string | null;
  avatarUrl?: string | null;
}

export class AuthService {
  async upsertUser(userData: UpsertUserData) {
    return await prisma.user.upsert({
      where: { githubId: userData.githubId },
      update: {
        username: userData.username,
        email: userData.email,
        avatarUrl: userData.avatarUrl,
      },
      create: {
        githubId: userData.githubId,
        username: userData.username,
        email: userData.email,
        avatarUrl: userData.avatarUrl,
      },
    });
  }

  async verifyAndSyncUser(accessToken: string, providedGithubId: string, fallbackData: Partial<UpsertUserData>) {
    const githubProfile = await githubService.getProfile(accessToken);
    const realGithubId = githubProfile.id.toString();

    if (providedGithubId !== realGithubId) {
      throw new AppError(
        'GitHub ID mismatch. Provided payload does not match token owner.',
        401,
        'UNAUTHORIZED'
      );
    }

    return await this.upsertUser({
      githubId: realGithubId,
      username: githubProfile.login,
      email: githubProfile.email || fallbackData.email || null,
      avatarUrl: githubProfile.avatar_url || fallbackData.avatarUrl || null,
    });
  }
}

export default new AuthService();
