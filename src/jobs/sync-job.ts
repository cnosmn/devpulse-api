import syncService from '../services/sync-service.js';

/**
 * Trigger GitHub synchronization in the background.
 * This is non-blocking and will not hold the HTTP response.
 */
export const triggerSyncJob = (userId: number, accessToken: string) => {
  // Fire and forget - do not await here
  syncService.syncUserGitHubData(userId, accessToken)
    .catch(err => console.error('Background Sync Job Error:', err));
};
