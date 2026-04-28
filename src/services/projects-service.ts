import { prisma } from '../prisma/client.js';

export class ProjectsService {
  async getUserProjects(userId: number) {
    const repos = await prisma.repository.findMany({
      where: { userId },
      include: {
        _count: {
          select: { commits: true }
        },
        commits: {
          orderBy: { date: 'desc' },
          take: 1,
          select: { date: true }
        }
      }
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get commit counts for last 30 days for each repo to calculate score
    const projects = await Promise.all(repos.map(async (repo) => {
      const recentCommitsCount = await prisma.commit.count({
        where: {
          repositoryId: repo.id,
          date: { gte: thirtyDaysAgo }
        }
      });

      // Simple score calculation: 
      // 0-10: Low activity
      // 10-50: Active
      // 50+: Very active
      const score = Math.min(100, recentCommitsCount * 5);
      
      return {
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        description: repo.description,
        url: repo.url,
        languages: repo.languages,
        stargazerCount: repo.stargazerCount,
        totalCommits: repo._count.commits,
        lastCommitAt: repo.commits[0]?.date || null,
        score,
        status: score > 10 ? 'active' : 'idle'
      };
    }));

    // Sort by last commit date descending
    return projects.sort((a, b) => {
      if (!a.lastCommitAt) return 1;
      if (!b.lastCommitAt) return -1;
      return new Date(b.lastCommitAt).getTime() - new Date(a.lastCommitAt).getTime();
    });
  }
}

export default new ProjectsService();
