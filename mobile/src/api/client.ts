// Lightweight fetch-based API client.
// TanStack Query manages caching/retries on top of this.

import { auth } from '../utils/firebase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8080/api/v1';

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

/** Builds headers, injecting Authorization: Bearer <token> when available. */
async function buildHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export const apiClient = {
  get: async <T>(endpoint: string): Promise<T> => {
    const headers = await buildHeaders();
    const response = await fetch(`${API_URL}${endpoint}`, { method: 'GET', headers });

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
  },

  post: async <T>(endpoint: string, body: any): Promise<T> => {
    const headers = await buildHeaders();
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

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
  },

  delete: async <T>(endpoint: string): Promise<T> => {
    const headers = await buildHeaders();
    const response = await fetch(`${API_URL}${endpoint}`, { method: 'DELETE', headers });

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
  },
};
