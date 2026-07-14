import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchHistoryItem, SearchResultItem } from '../api/searchApiSlice';

const CACHE_PREFIX = 'techpulse_search_cache_';
const HISTORY_KEY = 'techpulse_search_history_items';
const CACHE_EXPIRATION_TIME = 1000 * 60 * 15; // 15 minutes cache TTL

export interface CachedSearchResults {
  results: SearchResultItem[];
  timestamp: number;
}

/**
 * Purpose: Local search caching utility storing results for offline usage and persisting search queries history.
 */
export class SearchCacheService {
  static async cacheSearchResults(query: string, mode: 'semantic' | 'keyword', results: SearchResultItem[]): Promise<void> {
    try {
      const key = `${CACHE_PREFIX}${mode}_${query.toLowerCase().trim()}`;
      const payload: CachedSearchResults = {
        results,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(payload));
    } catch (err) {
      console.warn('[SearchCache] Failed to write cache:', err);
    }
  }

  static async getCachedSearchResults(query: string, mode: 'semantic' | 'keyword'): Promise<SearchResultItem[] | null> {
    try {
      const key = `${CACHE_PREFIX}${mode}_${query.toLowerCase().trim()}`;
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const payload: CachedSearchResults = JSON.parse(cached);
      const isExpired = Date.now() - payload.timestamp > CACHE_EXPIRATION_TIME;
      
      if (isExpired) {
        await AsyncStorage.removeItem(key);
        return null;
      }
      return payload.results;
    } catch (err) {
      console.warn('[SearchCache] Failed to load cache:', err);
      return null;
    }
  }

  static async saveRecentSearches(history: SearchHistoryItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (err) {
      console.warn('[SearchCache] Failed to save search history:', err);
    }
  }

  static async getRecentSearches(): Promise<SearchHistoryItem[]> {
    try {
      const history = await AsyncStorage.getItem(HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (err) {
      console.warn('[SearchCache] Failed to load search history:', err);
      return [];
    }
  }

  static async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const searchKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove([...searchKeys, HISTORY_KEY]);
    } catch (err) {
      console.warn('[SearchCache] Failed to clear search cache:', err);
    }
  }
}
