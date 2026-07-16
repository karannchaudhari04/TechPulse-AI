import { createApi, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import { AxiosRequestConfig, AxiosError } from 'axios';
import { axiosClient } from './axiosClient';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Advanced retry analyzer with exponential backoff matching backend availability:
 * - Network failures: up to 2 retries (500ms -> 1000ms delay).
 * - Service Unavailable (503): up to 1 retry (500ms delay).
 * - Auth/Client errors (401/403): 0 retries.
 */
const shouldRetry = (error: AxiosError, attempt: number): { retry: boolean; delayMs: number } => {
  const status = error.response?.status;

  if (status === 401 || status === 403) {
    return { retry: false, delayMs: 0 };
  }

  if (status === 503) {
    return { retry: attempt < 1, delayMs: attempt === 0 ? 500 : 1000 };
  }

  const isNetworkError = !status || error.message === 'Network Error' || error.code === 'ECONNABORTED';
  if (isNetworkError) {
    return { retry: attempt < 2, delayMs: attempt === 0 ? 500 : 1000 };
  }

  return { retry: false, delayMs: 0 };
};

/**
 * Custom base query wrapper linking Axios Client interceptors to RTK Query lifecycle.
 * Unwraps the standard success/data/message backend envelope transparently.
 */
const customAxiosBaseQuery = (): BaseQueryFn<
  {
    url: string;
    method: AxiosRequestConfig['method'];
    data?: AxiosRequestConfig['data'];
    params?: AxiosRequestConfig['params'];
    headers?: AxiosRequestConfig['headers'];
  },
  unknown,
  unknown
> => async ({ url, method, data, params, headers }) => {
  let attempt = 0;
  while (true) {
    try {
      const result = await axiosClient({
        url,
        method,
        data,
        params,
        headers,
      });

      const responseData = result.data && typeof result.data === 'object' && 'data' in result.data
        ? result.data.data
        : result.data;

      return { data: responseData };
    } catch (axiosError) {
      const err = axiosError as AxiosError;
      const { retry, delayMs } = shouldRetry(err, attempt);
      if (retry) {
        attempt++;
        console.warn(`[RTKQuery] Request to ${url} failed. Retrying attempt ${attempt} in ${delayMs}ms...`);
        await delay(delayMs);
        continue;
      }
      return {
        error: {
          status: err.response?.status,
          data: err.response?.data || err.message,
        },
      };
    }
  }
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: customAxiosBaseQuery(),
  tagTypes: ['Bite', 'User', 'Collection', 'Notification', 'Bookmark', 'History', 'Recommendation', 'FollowedTechnology', 'Preferences', 'Assistant', 'Conversation', 'Intelligence', 'Graph', 'Workspace'],
  endpoints: () => ({}),
});
