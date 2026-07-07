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

async function handleResponse<T>(response: Response): Promise<T> {
  const correlationId = response.headers.get('X-Correlation-ID');

  if (response.status === 401) {
    await auth.signOut();
    throw new Error('Session expired. Please sign in again.');
  }

  let json: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      json = await response.json();
    } catch (e) {
      // Empty or invalid JSON
    }
  }

  if (!response.ok) {
    const traceInfo = correlationId ? ` [Trace ID: ${correlationId}]` : '';
    if (json) {
      const msg = json.message || 'An unknown server error occurred';
      const details = json.details && Array.isArray(json.details) && json.details.length > 0
        ? ` (Details: ${json.details.join(', ')})`
        : '';
      throw new Error(`${msg}${details}${traceInfo}`);
    }
    throw new Error(`HTTP error! status: ${response.status}${traceInfo}`);
  }

  if (json && json.success === false) {
    throw new Error(json.message || 'API responded with a failure status');
  }

  return (json ? json.data : null) as T;
}

export const apiClient = {
  get: async <T>(endpoint: string): Promise<T> => {
    try {
      const headers = await buildHeaders();
      const response = await fetch(`${API_URL}${endpoint}`, { method: 'GET', headers });

      networkTracker.setOnline(true);
      return await handleResponse<T>(response);
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
      return await handleResponse<T>(response);
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
      return await handleResponse<T>(response);
    } catch (error) {
      handleNetworkError(error);
      throw error;
    }
  },
};
