import { Worker } from 'bullmq';
import syncService from '../services/sync-service.js';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

console.log('Initializing GitHub Sync Worker...');

const worker = new Worker(
  'github-sync',
  async (job) => {
    const { userId, accessToken } = job.data;
    console.log(`Processing sync job for user ${userId} (Job ID: ${job.id})`);
    await syncService.syncUserGitHubData(userId, accessToken);
  },
  {
    connection: {
      url: REDIS_URL,
    },
  }
);

worker.on('completed', (job) => {
  console.log(`Sync job ${job.id} completed successfully for user ${job.data.userId}`);
});

worker.on('failed', (job, err) => {
  console.error(`Sync job ${job?.id} failed for user ${job?.data?.userId}:`, err.message);
});

export default worker;
