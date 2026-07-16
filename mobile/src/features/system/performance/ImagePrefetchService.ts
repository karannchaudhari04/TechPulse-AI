import { Image } from 'expo-image';

/**
 * Purpose: Wrapper service prefetching image targets to memory using expo-image prefetch tools.
 */
export const ImagePrefetchService = {
  prefetch(uris: string[]): Promise<boolean> {
    if (!uris || uris.length === 0) return Promise.resolve(true);
    return Image.prefetch(uris);
  }
};
