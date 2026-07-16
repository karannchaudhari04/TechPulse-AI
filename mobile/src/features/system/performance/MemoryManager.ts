import { Image } from 'expo-image';

/**
 * Purpose: Central manager clearing memory and disk cache pools when receiving OS warning events.
 */
export const MemoryManager = {
  async runMemoryCleanup(): Promise<void> {
    console.info('[MemoryManager] Initiating memory cleanup sweep...');
    await Image.clearMemoryCache();
    await Image.clearDiskCache();
    console.info('[MemoryManager] Memory and disk image cache pools cleared');
  }
};
