import { prisma } from '../prisma/client.js';

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
}

export default new AuthService();
