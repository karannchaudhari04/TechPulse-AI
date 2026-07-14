import { apiSlice } from '../../../api/apiSlice';
import { FeedItem, CursorPageResponse } from '../../feed/api/feedApiSlice';

export type SearchEntityType = 'EVENT' | 'TECHNOLOGY' | 'COMPANY' | 'SECURITY_ALERT' | 'RELEASE' | 'FRAMEWORK';

export interface SearchResultItem extends FeedItem {
  entityType: SearchEntityType;
  relevanceExplanation?: string;
  sourceReliabilityScore?: number;
  aiConfidenceScore?: number;
}

export interface SearchParams {
  q: string;
  mode: 'semantic' | 'keyword';
  tags?: string[];
  categories?: string[];
  minImportance?: number;
  minCredibility?: number;
  sort?: 'NEWEST' | 'OLDEST' | 'RELEVANT' | 'IMPORTANCE';
  cursor?: string | null;
  limit?: number;
}

export interface SearchHistoryItem {
  query: string;
  timestamp: string;
  searchMode: 'semantic' | 'keyword';
  filtersCount: number;
  resultCount: number;
}

/**
 * Purpose: RTK Query endpoints for semantic and traditional keyword search operations.
 */
export const searchApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    search: builder.query<CursorPageResponse<SearchResultItem>, SearchParams>({
      query: ({ q, mode, tags, categories, minImportance, minCredibility, sort, cursor, limit = 10 }) => ({
        url: '/search',
        method: 'GET',
        params: {
          q,
          mode,
          tags: tags ? tags.join(',') : undefined,
          categories: categories ? categories.join(',') : undefined,
          minImportance: minImportance || undefined,
          minCredibility: minCredibility || undefined,
          sort: sort || undefined,
          cursor: cursor || undefined,
          limit,
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.content.map(({ id }) => ({ type: 'Bite' as const, id })),
              { type: 'Bite', id: 'SEARCH_LIST' },
            ]
          : [{ type: 'Bite', id: 'SEARCH_LIST' }],
    }),
    getSearchSuggestions: builder.query<string[], string>({
      query: (q) => ({
        url: '/search/suggestions',
        method: 'GET',
        params: { q },
      }),
    }),
    getTrendingSearches: builder.query<string[], void>({
      query: () => ({
        url: '/search/trending',
        method: 'GET',
      }),
    }),
    getSearchHistory: builder.query<SearchHistoryItem[], void>({
      query: () => ({
        url: '/search/history',
        method: 'GET',
      }),
      providesTags: ['User'],
    }),
    clearSearchHistory: builder.mutation<void, void>({
      query: () => ({
        url: '/search/history',
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useSearchQuery,
  useLazyGetSearchSuggestionsQuery,
  useGetTrendingSearchesQuery,
  useGetSearchHistoryQuery,
  useClearSearchHistoryMutation,
} = searchApiSlice;
