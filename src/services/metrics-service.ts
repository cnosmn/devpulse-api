import { prisma } from '../prisma/client.js';

export class MetricsService {
  async getUserMetrics(userId: number) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Commit Heatmap (Group by date)
    // We use $queryRaw because Prisma doesn't have a built-in date truncation group by for PG yet
    const heatmap: { date: string; count: number }[] = await prisma.$queryRaw`
      SELECT TO_CHAR(date, 'YYYY-MM-DD') as date, COUNT(*)::int as count
      FROM "Commit" c
      JOIN "Repository" r ON c."repositoryId" = r.id
      WHERE r."userId" = ${userId} AND c.date >= ${thirtyDaysAgo}
      GROUP BY TO_CHAR(date, 'YYYY-MM-DD')
      ORDER BY date ASC
    `;

    // 2. Language Distribution
    const repos = await prisma.repository.findMany({
      where: { userId },
    });

    const languageCounts: Record<string, { name: string; color: string; count: number }> = {};
    
    repos.forEach((repo: any) => {
      const languages = repo.languages;
      if (languages && Array.isArray(languages)) {
        languages.forEach((lang: any) => {
          if (languageCounts[lang.name]) {
            languageCounts[lang.name].count += 1;
          } else {
            languageCounts[lang.name] = { ...lang, count: 1 };
          }
        });
      }
    });

    const topLanguages = Object.values(languageCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 3. Summary Stats
    const totalRepos = await prisma.repository.count({ where: { userId } });
    const totalCommits = await prisma.commit.count({
      where: { repository: { userId } },
    });

    return {
      heatmap,
      topLanguages,
      summary: {
        totalRepos,
        totalCommits,
      },
    };
  }
}

export default new MetricsService();
