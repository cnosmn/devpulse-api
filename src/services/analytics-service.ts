import githubService from './github-service.js';
import { prisma } from '../prisma/client.js';
import { User } from '@prisma/client';

export class AnalyticsService {
  async getUserAnalytics(user: User, accessToken?: string) {
    const userId = user.id;
    const commits = await prisma.commit.findMany({
      where: {
        repository: {
          userId: userId,
        },
      },
      select: {
        date: true,
      },
    });

    // 1. Hourly Distribution (From DB Commits)
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      count: 0,
    }));

    commits.forEach(commit => {
      const hour = new Date(commit.date).getHours();
      hourlyData[hour].count += 1;
    });

    // 2. Daily Distribution (From Live GitHub Contribution Graph if available)
    const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    let dailyData = days.map(day => ({ day, count: 0 }));

    if (accessToken) {
      try {
        const githubGraph = await githubService.fetchContributionGraph(accessToken, user.username);
        
        // Aggregate 1-year contribution graph into Day of Week distribution
        githubGraph.days.forEach(day => {
          let dayIndex = new Date(day.date).getDay();
          // Adjust to Mon-Sun (0-6)
          dayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
          dailyData[dayIndex].count += day.count;
        });
      } catch (e) {
        console.error("Failed to fetch live contribution graph for analytics:", e);
        // Fallback to DB commits for the last 90 days if GitHub fails
        commits.forEach(commit => {
          let dayIndex = new Date(commit.date).getDay();
          dayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
          dailyData[dayIndex].count += 1;
        });
      }
    } else {
      // Fallback if no accessToken
      commits.forEach(commit => {
        let dayIndex = new Date(commit.date).getDay();
        dayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
        dailyData[dayIndex].count += 1;
      });
    }

    // 3. Language Distribution (Aggregated)
    const repos = await prisma.repository.findMany({
      where: { userId },
      select: { languages: true },
    });

    const languageMap: Record<string, { name: string, color: string, value: number }> = {};
    
    repos.forEach(repo => {
      const languages = repo.languages as any[];
      if (languages && Array.isArray(languages)) {
        languages.forEach(lang => {
          if (languageMap[lang.name]) {
            languageMap[lang.name].value += 1;
          } else {
            languageMap[lang.name] = { 
              name: lang.name, 
              color: lang.color || '#cccccc', 
              value: 1 
            };
          }
        });
      }
    });

    const languageData = Object.values(languageMap).sort((a, b) => b.value - a.value);

    return {
      hourlyData,
      dailyData,
      languageData,
    };
  }
}

export default new AnalyticsService();
