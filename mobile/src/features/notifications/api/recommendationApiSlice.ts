import { apiSlice } from '../../../api/apiSlice';
import { FeedItem } from '../../feed/api/feedApiSlice';

export interface RecommendationExplanation {
  eventId: string;
  reason: string;
  sourceType: 'TECHNOLOGY' | 'BOOKMARK' | 'TRENDING' | 'HISTORY' | 'AI';
  sourceName?: string;
}

export interface FollowedTechnologyItem {
  id: string;
  name: string;
  followDate: string;
  trendStatus: 'EXPLODING' | 'RISING' | 'STABLE' | 'COOLING';
  newEventsCount: number;
}

/**
 * Purpose: RTK Query endpoints for AI recommended articles, tag explanations, and technology follows.
 */
export const recommendationApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getRecommendations: builder.query<FeedItem[], void>({
      query: () => ({
        url: '/recommendations',
        method: 'GET',
      }),
      providesTags: ['Recommendation'],
    }),
    getRecommendationExplanations: builder.query<RecommendationExplanation[], void>({
      query: () => ({
        url: '/recommendations/explanations',
        method: 'GET',
      }),
    }),
    getFollowedTechnologies: builder.query<FollowedTechnologyItem[], void>({
      query: () => ({
        url: '/technologies/following',
        method: 'GET',
      }),
      providesTags: ['FollowedTechnology'],
    }),
    followTechnology: builder.mutation<void, { name: string }>({
      query: (payload) => ({
        url: '/technologies/follow',
        method: 'POST',
        data: payload,
      }),
      invalidatesTags: ['FollowedTechnology', 'Recommendation'],
    }),
    unfollowTechnology: builder.mutation<void, string>({
      query: (id) => ({
        url: `/technologies/follow/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FollowedTechnology', 'Recommendation'],
    }),
  }),
});

export const {
  useGetRecommendationsQuery,
  useGetRecommendationExplanationsQuery,
  useGetFollowedTechnologiesQuery,
  useFollowTechnologyMutation,
  useUnfollowTechnologyMutation,
} = recommendationApiSlice;
