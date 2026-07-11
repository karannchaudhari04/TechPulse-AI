import * as SecureStore from 'expo-secure-store';

export const SecureStoreService = {
  /**
   * Securely saves a string value associated with a key.
   */
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`[SecureStore] Error saving key "${key}":`, error);
      throw error;
    }
  },

  /**
   * Retrieves a securely saved string value associated with a key. Returns null if key doesn't exist.
   */
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`[SecureStore] Error reading key "${key}":`, error);
      return null;
    }
  },

  /**
   * Deletes a securely saved key-value pair.
   */
  deleteItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`[SecureStore] Error deleting key "${key}":`, error);
      throw error;
    }
  },
};
