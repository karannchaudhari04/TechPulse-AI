import { apiSlice } from '../../../api/apiSlice';

export interface FeedItem {
  id: string;
  eventId: string;
  headline: string;
  summary: string;
  publishedTime: string;
  sourceName: string;
  sourceUrl: string;
  importanceScore: number;
  credibilityScore: number;
  category: string;
  technology: string;
  version: string | null;
  releaseStatus: string | null;
  trendStatus: 'EXPLODING' | 'RISING' | 'STABLE' | 'COOLING' | 'DECLINING' | 'DORMANT';
  bookmarked: boolean;
  read: boolean;
  recommendationReason?: string;
}

export interface CursorPageResponse<T> {
  content: T[];
  nextCursor: string | null;
  hasNext: boolean;
}

export interface FeedParams {
  cursor?: string | null;
  limit?: number;
  category?: string;
  tech?: string;
}

export interface TechnologyTrend {
  name: string;
  trendStatus: 'EXPLODING' | 'RISING' | 'STABLE' | 'COOLING' | 'DECLINING' | 'DORMANT';
  eventCount: number;
  following: boolean;
}

/**
 * Purpose: RTK Query endpoints for the discovery feed and dashboard metrics.
 */
export const feedApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getFeed: builder.query<CursorPageResponse<FeedItem>, FeedParams>({
      query: ({ cursor, limit = 10, category, tech }) => ({
        url: '/feed',
        method: 'GET',
        params: {
          cursor: cursor || undefined,
          limit,
          category: category || undefined,
          tech: tech || undefined,
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.content.map(({ id }) => ({ type: 'Bite' as const, id })),
              { type: 'Bite', id: 'LIST' },
            ]
          : [{ type: 'Bite', id: 'LIST' }],
    }),
    getTrendingFeed: builder.query<FeedItem[], void>({
      query: () => ({
        url: '/feed/trending',
        method: 'GET',
      }),
      providesTags: ['Bite'],
    }),
    getRecommendedFeed: builder.query<FeedItem[], void>({
      query: () => ({
        url: '/feed/recommended',
        method: 'GET',
      }),
      providesTags: ['Bite'],
    }),
    getTrends: builder.query<TechnologyTrend[], void>({
      query: () => ({
        url: '/trends',
        method: 'GET',
      }),
      providesTags: ['User'],
    }),
  }),
});

export const {
  useGetFeedQuery,
  useGetTrendingFeedQuery,
  useGetRecommendedFeedQuery,
  useGetTrendsQuery,
} = feedApiSlice;
