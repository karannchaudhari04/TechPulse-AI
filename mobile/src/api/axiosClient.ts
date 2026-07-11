import axios from 'axios';
import { auth } from '../utils/firebase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.38:8080/api/v1';

if (!process.env.EXPO_PUBLIC_API_URL) {
  console.warn('[API] Warning: EXPO_PUBLIC_API_URL is not defined. Falling back to local development URL.');
}

/**
 * Standard UUID generator for correlation tracking in React Native (avoids crypto polyfill errors).
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const axiosClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inject credentials, timezone, and correlation headers
axiosClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.warn('[axiosClient] Failed to retrieve Firebase ID token:', error);
      }
    }

    config.headers['X-User-Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone;
    config.headers['X-Correlation-ID'] = generateUUID();

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle standardized envelopes, 401s, and observability trace context
axiosClient.interceptors.response.use(
  (response) => {
    // If the backend wraps responses in an envelope but success flag indicates failure
    if (response.data && response.data.success === false) {
      const msg = response.data.message || 'API responded with a failure status';
      return Promise.reject(new Error(msg));
    }
    return response;
  },
  async (error) => {
    const response = error.response;

    // Handle 401 Unauthorized Session Expiration
    if (response && response.status === 401) {
      console.warn('[axiosClient] Received 401 Unauthorized. Signing out of session...');
      try {
        await auth.signOut();
      } catch (signOutError) {
        console.error('[axiosClient] Failed to sign out user:', signOutError);
      }
      return Promise.reject(new Error('Session expired. Please sign in again.'));
    }

    // Handle Standardized Backend Error Schema (ApiErrorResponse)
    if (response && response.data) {
      const correlationId = response.headers['x-correlation-id'] || response.headers['X-Correlation-ID'];
      const traceInfo = correlationId ? ` [Trace ID: ${correlationId}]` : '';
      const errorResponse = response.data;
      const msg = errorResponse.message || 'An unknown server error occurred';
      const details = errorResponse.details && Array.isArray(errorResponse.details) && errorResponse.details.length > 0
        ? ` (Details: ${errorResponse.details.join(', ')})`
        : '';
      return Promise.reject(new Error(`${msg}${details}${traceInfo}`));
    }

    return Promise.reject(error);
  }
);
