import { prisma } from '../prisma/client.js';

export class AnalyticsService {
  async getUserAnalytics(userId: number) {
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

    // 1. Hourly Distribution
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      count: 0,
    }));

    commits.forEach(commit => {
      const hour = new Date(commit.date).getHours();
      hourlyData[hour].count += 1;
    });

    // 2. Daily Distribution
    const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    const dailyData = days.map(day => ({ day, count: 0 }));

    commits.forEach(commit => {
      // getDay() returns 0 for Sunday, 1 for Monday...
      let dayIndex = new Date(commit.date).getDay();
      // Adjust to Mon-Sun (0-6)
      dayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
      dailyData[dayIndex].count += 1;
    });

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
