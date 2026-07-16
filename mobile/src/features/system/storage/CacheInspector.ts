import { StorageManagerService, StorageStats } from './StorageManagerService';

/**
 * Purpose: Cache details reporter and validation helper.
 */
export const CacheInspector = {
  async runCacheInspection(): Promise<StorageStats> {
    console.info('[CacheInspector] Scanning cache segments...');
    const stats = await StorageManagerService.getStorageStats();
    console.info(`[CacheInspector] Scan complete. Total storage: ${stats.totalStorageMb}MB`);
    return stats;
  }
};
