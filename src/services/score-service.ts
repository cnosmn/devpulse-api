import { prisma } from '../prisma/client.js';

export class ScoreService {
  async calculateUserScore(userId: number, timezone: string = 'UTC') {
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - 7);
    
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7);

    // 1. Fetch commits for the last 14 days
    const commits = await prisma.commit.findMany({
      where: {
        repository: { userId },
        date: { gte: previousWeekStart },
      },
      select: { date: true },
    });

    // 2. Split into Current and Previous weeks
    const currentWeekCommits = commits.filter(c => c.date >= currentWeekStart);
    const previousWeekCommits = commits.filter(c => c.date < currentWeekStart);

    const currentCount = currentWeekCommits.length;
    const previousCount = previousWeekCommits.length;

    // 3. Calculate Change Percentage
    let changePercentage = 0;
    if (previousCount === 0) {
      changePercentage = currentCount > 0 ? 100 : 0;
    } else {
      changePercentage = Math.round(((currentCount - previousCount) / previousCount) * 100);
    }

    // 4. Find Most Active Day (Current Week)
    const dayCounts: Record<string, number> = {};
    
    currentWeekCommits.forEach(c => {
      let dayName: string;
      try {
        dayName = new Intl.DateTimeFormat('tr-TR', { 
          weekday: 'long', 
          timeZone: timezone 
        }).format(c.date);
      } catch (e) {
        // Fallback to UTC if timezone is invalid
        dayName = new Intl.DateTimeFormat('tr-TR', { 
          weekday: 'long', 
          timeZone: 'UTC' 
        }).format(c.date);
      }
      dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
    });

    let mostActiveDay = 'No activity yet';
    let maxDayCount = 0;
    Object.entries(dayCounts).forEach(([day, count]) => {
      if (count > maxDayCount) {
        maxDayCount = count;
        mostActiveDay = day;
      }
    });

    // 5. Calculate Score (1-100)
    // Base score logic: 
    // - Points for total commits (capped)
    // - Points for consistency (number of unique days active)
    const activeDaysCount = Object.keys(dayCounts).length;
    let score = (currentCount * 2) + (activeDaysCount * 10);
    
    // Normalize and Clamp
    if (score > 100) score = 100;
    if (score === 0 && currentCount === 0) score = 0;
    else if (score < 10 && currentCount > 0) score = 15; // Minimum score if active

    return {
      score,
      changePercentage,
      mostActiveDay,
      stats: {
        currentWeekCount: currentCount,
        previousWeekCount: previousCount,
        activeDaysThisWeek: activeDaysCount,
      }
    };
  }
}

export default new ScoreService();
