import { prisma } from '../prisma/client.js';

export class ActivityService {
  async getUserActivities(userId: number, limit: number = 50) {
    return await prisma.commit.findMany({
      where: {
        repository: {
          userId: userId,
        },
      },
      include: {
        repository: {
          select: {
            name: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: limit,
    });
  }
}

export default new ActivityService();
