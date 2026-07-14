import { apiSlice } from '../../../api/apiSlice';
import { FeedItem } from '../../feed/api/feedApiSlice';

export interface EventDetails {
  id: string;
  headline: string;
  summary: string;
  technicalImpact: string;
  developerImpact: string;
  enterpriseImpact: string;
  migrationNotes: string | null;
  breakingChanges: string | null;
  securityNotes: string | null;
  publishedTime: string;
  importanceScore: number;
  credibilityScore: number;
  category: string;
  technologies: string[];
  officialSources: { title: string; url: string }[];
  timeline: { title: string; date: string; description: string }[];
  knowledgeGraph: { subject: string; relation: string; object: string }[];
  bookmarked: boolean;
  following: boolean;
}

export interface InteractionPayload {
  eventId: string;
  type: 'VIEW' | 'CLICK' | 'BOOKMARK' | 'SHARE' | 'LIKE' | 'SEARCH' | 'READ_COMPLETE';
  value?: string;
}

export interface FollowPayload {
  technology: string;
  follow: boolean;
}

/**
 * Purpose: RTK Query endpoints for technology events, timelined AI insights,
 * user bookmarks, and technology follow actions.
 */
export const eventsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getEvents: builder.query<FeedItem[], { category?: string }>({
      query: (params) => ({
        url: '/events',
        method: 'GET',
        params,
      }),
      providesTags: ['Bite'],
    }),
    getEventDetails: builder.query<EventDetails, string>({
      query: (id) => ({
        url: `/events/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'Bite', id }],
    }),
    getRelatedEvents: builder.query<FeedItem[], string>({
      query: (id) => ({
        url: `/events/${id}/related`,
        method: 'GET',
      }),
      providesTags: ['Bite'],
    }),
    recordInteraction: builder.mutation<void, InteractionPayload>({
      query: (payload) => ({
        url: '/user/interaction',
        method: 'POST',
        data: payload,
      }),
      invalidatesTags: (result, error, { eventId }) => [
        { type: 'Bite', id: eventId },
        { type: 'Bite', id: 'LIST' },
      ],
    }),
    followTechnology: builder.mutation<void, FollowPayload>({
      query: (payload) => ({
        url: '/users/preferences',
        method: 'POST',
        data: {
          categories: [payload.technology],
          follow: payload.follow,
        },
      }),
      invalidatesTags: ['User', 'Bite'],
    }),
  }),
});

export const {
  useGetEventsQuery,
  useGetEventDetailsQuery,
  useGetRelatedEventsQuery,
  useRecordInteractionMutation,
  useFollowTechnologyMutation,
} = eventsApiSlice;
