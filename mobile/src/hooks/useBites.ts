import { useInfiniteQuery } from '@tanstack/react-query';
import { Bite } from '../types';
import { apiClient } from '../api/client';

export interface CursorPageResponse<T> {
  content: T[];
  nextCursor: string | null;
  hasNext: boolean;
}

export function useBites(feedType: 'all' | 'foryou' | 'category' = 'all', categoryId?: number) {
  return useInfiniteQuery({
    queryKey: ['bites', feedType, categoryId],
    queryFn: async ({ pageParam = null as string | null }) => {
      let endpoint = '';
      const cursorParam = pageParam ? `cursor=${pageParam}&` : '';
      
      if (feedType === 'foryou') {
        endpoint = `/bites/foryou?${cursorParam}limit=10`;
      } else if (feedType === 'category' && categoryId) {
        endpoint = `/bites/category/${categoryId}?${cursorParam}limit=10`;
      } else {
        endpoint = `/bites?${cursorParam}limit=10`;
      }
      
      return apiClient.get<CursorPageResponse<Bite>>(endpoint);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNext) {
        return lastPage.nextCursor;
      }
      return undefined;
    },
    initialPageParam: null as string | null,
    staleTime: 1000 * 60 * 5, // Cache the feed for 5 minutes
    retry: 2,
  });
}
