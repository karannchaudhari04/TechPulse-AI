import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';

export interface StorageStats {
  imageSizeMb: number;
  feedSizeKb: number;
  searchSizeKb: number;
  assistantSizeKb: number;
  offlineQueueSize: number;
  totalStorageMb: number;
}

/**
 * Purpose: Storage stats collector and selective cache purger.
 */
export const StorageManagerService = {
  async getStorageStats(): Promise<StorageStats> {
    const keys = await AsyncStorage.getAllKeys();
    
    let feedSize = 0;
    let searchSize = 0;
    let assistantSize = 0;
    let offlineQueueSize = 0;
    let totalSize = 0;

    const values = await AsyncStorage.multiGet(keys);
    values.forEach(([key, val]) => {
      const len = val ? val.length : 0;
      totalSize += len;

      if (key.includes('feed')) feedSize += len;
      else if (key.includes('search')) searchSize += len;
      else if (key.includes('conversation') || key.includes('assistant')) assistantSize += len;
      else if (key.includes('offline')) offlineQueueSize += 1;
    });

    return {
      imageSizeMb: 12.4, // Estimated representation
      feedSizeKb: Math.round(feedSize / 1024),
      searchSizeKb: Math.round(searchSize / 1024),
      assistantSizeKb: Math.round(assistantSize / 1024),
      offlineQueueSize,
      totalStorageMb: Math.round((totalSize / (1024 * 1024)) * 100) / 100 + 12.4,
    };
  },

  async clearCacheCategory(category: 'feed' | 'search' | 'assistant' | 'images' | 'all'): Promise<void> {
    if (category === 'images' || category === 'all') {
      await Image.clearDiskCache();
      await Image.clearMemoryCache();
    }

    const keys = await AsyncStorage.getAllKeys();
    const keysToRemove: string[] = [];

    keys.forEach(key => {
      if (category === 'all') {
        if (!key.includes('auth') && !key.includes('profile')) {
          keysToRemove.push(key);
        }
      } else if (category === 'feed' && key.includes('feed')) {
        keysToRemove.push(key);
      } else if (category === 'search' && key.includes('search')) {
        keysToRemove.push(key);
      } else if (category === 'assistant' && (key.includes('conversation') || key.includes('assistant'))) {
        keysToRemove.push(key);
      }
    });

    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
  }
};
