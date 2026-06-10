// Lightweight fetch-based API client.
// TanStack Query manages caching/retries on top of this.

import { auth } from '../utils/firebase';
import { networkTracker } from '../utils/network';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.38:8080/api/v1';
if (!process.env.EXPO_PUBLIC_API_URL) {
  console.warn('[API] Warning: EXPO_PUBLIC_API_URL is not defined. Falling back to local development URL.');
}

/** Gets the current user's Firebase ID token, or null if not signed in. */
async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

/** Builds headers, injecting Authorization: Bearer <token> when available and timezone details. */
async function buildHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    'Content-Type': 'application/json',
    'X-User-Timezone': timezone,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

const handleNetworkError = (error: any) => {
  if (
    error &&
    (error.message?.includes('Network request failed') ||
      error.message?.includes('Failed to fetch') ||
      error.name === 'TypeError')
  ) {
    networkTracker.setOnline(false);
  }
};

export const apiClient = {
  get: async <T>(endpoint: string): Promise<T> => {
    try {
      const headers = await buildHeaders();
      const response = await fetch(`${API_URL}${endpoint}`, { method: 'GET', headers });

      networkTracker.setOnline(true);

      if (response.status === 401) {
        await auth.signOut();
        throw new Error('Session expired. Please sign in again.');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      if (!json.success) {
        throw new Error(json.message || 'API responded with a failure status');
      }
      return json.data as T;
    } catch (error) {
      handleNetworkError(error);
      throw error;
    }
  },

  post: async <T>(endpoint: string, body: any): Promise<T> => {
    try {
      const headers = await buildHeaders();
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      networkTracker.setOnline(true);

      if (response.status === 401) {
        await auth.signOut();
        throw new Error('Session expired. Please sign in again.');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      if (!json.success) {
        throw new Error(json.message || 'API responded with a failure status');
      }
      return json.data as T;
    } catch (error) {
      handleNetworkError(error);
      throw error;
    }
  },

  delete: async <T>(endpoint: string): Promise<T> => {
    try {
      const headers = await buildHeaders();
      const response = await fetch(`${API_URL}${endpoint}`, { method: 'DELETE', headers });

      networkTracker.setOnline(true);

      if (response.status === 401) {
        await auth.signOut();
        throw new Error('Session expired. Please sign in again.');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      if (!json.success) {
        throw new Error(json.message || 'API responded with a failure status');
      }
      return json.data as T;
    } catch (error) {
      handleNetworkError(error);
      throw error;
    }
  },
};
