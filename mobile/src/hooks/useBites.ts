import { useInfiniteQuery } from '@tanstack/react-query';
import { Bite } from '../types';
import { apiClient } from '../api/client';

// The Spring Data Page<T> response structure
export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  empty: boolean;
}

export function useBites(feedType: 'all' | 'foryou' = 'all') {
  return useInfiniteQuery({
    queryKey: ['bites', feedType],
    queryFn: async ({ pageParam = 0 }) => {
      const endpoint = feedType === 'foryou' 
        ? `/bites/foryou?page=${pageParam}&size=10`
        : `/bites?page=${pageParam}&size=10`;
      
      return apiClient.get<PageResponse<Bite>>(endpoint);
    },
    getNextPageParam: (lastPage) => {
      // If there are more pages available, return the next page number
      if (lastPage.number + 1 < lastPage.totalPages) {
        return lastPage.number + 1;
      }
      return undefined; // Stops pagination
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5, // Cache the feed for 5 minutes
    retry: 2, // Simple retry logic automatically handled by React Query
  });
}
