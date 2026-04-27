import { prisma } from '../prisma/client.js';
import githubService from './github-service.js';

export class SyncService {
  async syncUserGitHubData(userId: number, accessToken: string) {
    try {
      console.log(`Starting GitHub sync for user ${userId}...`);
      
      const repos = await githubService.fetchUserData(accessToken);
      
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

        // 2. Sync Last Commit if exists
        if (repo.lastCommit) {
          await prisma.commit.upsert({
            where: {
              sha: repo.lastCommit.oid,
            },
            update: {
              message: repo.lastCommit.message,
              date: new Date(repo.lastCommit.committedDate),
            },
            create: {
              sha: repo.lastCommit.oid,
              message: repo.lastCommit.message,
              date: new Date(repo.lastCommit.committedDate),
              repositoryId: savedRepo.id,
              authorName: null, // Explicitly null since it's optional
              authorEmail: null,
            },
          });
        }
      }

      console.log(`Successfully synced ${repos.length} repositories for user ${userId}.`);
    } catch (error: any) {
      console.error(`Failed to sync GitHub data for user ${userId}:`, error.message);
    }
  }
}

export default new SyncService();
