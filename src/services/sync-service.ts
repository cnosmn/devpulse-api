import { prisma } from '../prisma/client.js';
import githubService from './github-service.js';

export class SyncService {
  async syncUserGitHubData(userId: number, accessToken: string) {
    try {
      console.log(`Starting GitHub sync for user ${userId}...`);
      
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('User not found');

      // Clear old dirty commits to ensure absolute accuracy
      await prisma.commit.deleteMany({
        where: { repository: { userId } },
      });

      const repos = await githubService.fetchUserData(accessToken, user.githubId);
      
      for (const repo of repos) {
        // 1. Sync Repository
        const savedRepo = await prisma.repository.upsert({
          where: {
            githubId: repo.githubId,
          },
          update: {
            name: repo.name,
            fullName: repo.fullName,
            description: repo.description,
            url: repo.url,
            stargazerCount: repo.stargazerCount,
            languages: repo.languages as any,
            userId: userId,
          },
          create: {
            githubId: repo.githubId,
            name: repo.name,
            fullName: repo.fullName,
            description: repo.description,
            url: repo.url,
            stargazerCount: repo.stargazerCount,
            languages: repo.languages as any,
            userId: userId,
          },
        });

        // 2. Sync All Commits
        if (repo.commits && repo.commits.length > 0) {
          const commitData = repo.commits.map((commit: any) => ({
            sha: commit.oid,
            message: commit.message,
            date: new Date(commit.committedDate),
            repositoryId: savedRepo.id,
            authorName: null, // Explicitly null since it's optional
            authorEmail: null,
          }));

          await prisma.commit.createMany({
            data: commitData,
            skipDuplicates: true, // Prevents errors if commits already exist
          });
        }
      }

      console.log(`Successfully synced ${repos.length} repositories for user ${userId}.`);
    } catch (error: any) {
      console.error(`Failed to sync GitHub data for user ${userId}:`, error.message);
      throw error;
    }
  }
}

export default new SyncService();
