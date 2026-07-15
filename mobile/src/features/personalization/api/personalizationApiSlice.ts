import { apiSlice } from '../../../api/apiSlice';
import { FeedItem } from '../../feed/api/feedApiSlice';

export interface UserCollection {
  id: string;
  name: string;
  description?: string;
  pinned: boolean;
  favorite: boolean;
  eventCount: number;
  events: string[];
}

export interface ReadingHistoryItem {
  id: string;
  eventId: string;
  headline: string;
  lastOpened: string;
  readingDurationSec: number;
  completionPercentage: number;
}

export interface LibraryStats {
  eventsReadCount: number;
  savedEventsCount: number;
  collectionsCount: number;
  technologiesFollowedCount: number;
  weeklyActivity: { day: string; count: number }[];
}

/**
 * Purpose: RTK Query endpoints for user library assets, bookmarks list, collections CRUD,
 * preference selections, and reading history trackers.
 */
export const personalizationApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBookmarks: builder.query<FeedItem[], void>({
      query: () => ({
        url: '/user/bookmarks',
        method: 'GET',
      }),
      providesTags: ['Bookmark'],
    }),
    addBookmark: builder.mutation<void, string>({
      query: (eventId) => ({
        url: '/user/bookmark',
        method: 'POST',
        data: { eventId },
      }),
      invalidatesTags: ['Bookmark', 'Recommendation'],
    }),
    removeBookmark: builder.mutation<void, string>({
      query: (id) => ({
        url: `/user/bookmark/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Bookmark', 'Recommendation'],
    }),
    getCollections: builder.query<UserCollection[], void>({
      query: () => ({
        url: '/user/collections',
        method: 'GET',
      }),
      providesTags: ['Collection'],
    }),
    createCollection: builder.mutation<UserCollection, { name: string; description?: string }>({
      query: (payload) => ({
        url: '/user/collections',
        method: 'POST',
        data: payload,
      }),
      invalidatesTags: ['Collection'],
    }),
    updateCollection: builder.mutation<UserCollection, { id: string; name: string; description?: string; pinned?: boolean; favorite?: boolean }>({
      query: ({ id, ...payload }) => ({
        url: `/user/collections/${id}`,
        method: 'PUT',
        data: payload,
      }),
      invalidatesTags: ['Collection'],
    }),
    deleteCollection: builder.mutation<void, string>({
      query: (id) => ({
        url: `/user/collections/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Collection'],
    }),
    addEventToCollection: builder.mutation<void, { collectionId: string; eventId: string }>({
      query: ({ collectionId, eventId }) => ({
        url: `/user/collections/${collectionId}/events`,
        method: 'POST',
        data: { eventId },
      }),
      invalidatesTags: ['Collection'],
    }),
    removeEventFromCollection: builder.mutation<void, { collectionId: string; eventId: string }>({
      query: ({ collectionId, eventId }) => ({
        url: `/user/collections/${collectionId}/events/${eventId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Collection'],
    }),
    getReadingHistory: builder.query<ReadingHistoryItem[], void>({
      query: () => ({
        url: '/user/history',
        method: 'GET',
      }),
      providesTags: ['History'],
    }),
    clearReadingHistory: builder.mutation<void, void>({
      query: () => ({
        url: '/user/history',
        method: 'DELETE',
      }),
      invalidatesTags: ['History'],
    }),
    getLibraryStats: builder.query<LibraryStats, void>({
      query: () => ({
        url: '/user/stats',
        method: 'GET',
      }),
      providesTags: ['User'],
    }),
  }),
});

export const {
  useGetBookmarksQuery,
  useAddBookmarkMutation,
  useRemoveBookmarkMutation,
  useGetCollectionsQuery,
  useCreateCollectionMutation,
  useUpdateCollectionMutation,
  useDeleteCollectionMutation,
  useAddEventToCollectionMutation,
  useRemoveEventFromCollectionMutation,
  useGetReadingHistoryQuery,
  useClearReadingHistoryMutation,
  useGetLibraryStatsQuery,
} = personalizationApiSlice;
