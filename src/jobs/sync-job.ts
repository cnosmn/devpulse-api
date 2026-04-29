import { syncQueue } from './sync-queue.js';

/**
 * Trigger GitHub synchronization via BullMQ Queue.
 * This is persistent and includes retry logic.
 */
export const triggerSyncJob = async (userId: number, accessToken: string) => {
  try {
    await syncQueue.add(`sync-${userId}`, {
      userId,
      accessToken,
    });
    console.log(`Sync job queued for user ${userId}`);
  } catch (err) {
    console.error('Failed to queue sync job:', err);
  }
};
