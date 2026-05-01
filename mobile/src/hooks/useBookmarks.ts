import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { auth } from '../utils/firebase';
import { Bite } from '../types';
import { PageResponse } from './useBites';

export const useBookmarks = () => {
  const queryClient = useQueryClient();
  const isSignedIn = !!auth.currentUser;

  // ── Load bookmarks from backend (only when signed in) ─────────────────────
  const { data: bookmarkPage, isLoading } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => apiClient.get<PageResponse<Bite>>('/bookmarks?page=0&size=100'),
    enabled: isSignedIn,
    staleTime: 1000 * 60 * 2, // 2 min cache
  });

  const bookmarks: Bite[] = bookmarkPage?.content ?? [];

  // ── Toggle (add / remove) bookmark ────────────────────────────────────────
  const toggleBookmark = useMutation({
    mutationFn: async (bite: Bite) => {
      const alreadyBookmarked = bookmarks.some(b => b.id === bite.id);
      if (alreadyBookmarked) {
        await apiClient.delete(`/bookmarks/${bite.id}`);
      } else {
        await apiClient.post(`/bookmarks/${bite.id}`, {});
      }
      return bite;
    },
    // Optimistic update — instant UI response
    onMutate: async (bite: Bite) => {
      await queryClient.cancelQueries({ queryKey: ['bookmarks'] });
      const previous = queryClient.getQueryData<PageResponse<Bite>>(['bookmarks']);

      queryClient.setQueryData<PageResponse<Bite>>(['bookmarks'], (old) => {
        if (!old) return { content: [bite], totalPages: 1, totalElements: 1, number: 0, size: 100, empty: false };
        const isBookmarked = old.content.some(b => b.id === bite.id);
        const newContent = isBookmarked
          ? old.content.filter(b => b.id !== bite.id)
          : [bite, ...old.content];
        return { ...old, content: newContent, totalElements: newContent.length };
      });

      return { previous };
    },
    onError: (_err, _bite, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['bookmarks'], context.previous);
      }
    },
  });

  const isBookmarked = (biteId: number) => bookmarks.some(b => b.id === biteId);

  return {
    bookmarks,
    isLoading,
    toggleBookmark: toggleBookmark.mutate,
    isBookmarked,
  };
};
