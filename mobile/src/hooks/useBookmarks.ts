import { 
  useGetBookmarksQuery, 
  useAddBookmarkMutation, 
  useRemoveBookmarkMutation 
} from '../features/personalization/api/personalizationApiSlice';
import { Bite } from '../types';

export const useBookmarks = () => {
  const { data: bookmarkItems, isLoading } = useGetBookmarksQuery();
  const [addBookmark] = useAddBookmarkMutation();
  const [removeBookmark] = useRemoveBookmarkMutation();

  const bookmarks = (bookmarkItems || []) as any[];

  const isBookmarked = (biteId: number | string) => {
    return bookmarks.some((b) => String(b.id) === String(biteId) || String(b.eventId) === String(biteId));
  };

  const toggleBookmark = async (bite: Bite) => {
    const idStr = String(bite.id);
    if (isBookmarked(bite.id)) {
      await removeBookmark(idStr);
    } else {
      await addBookmark(idStr);
    }
  };

  return {
    bookmarks,
    isLoading,
    toggleBookmark,
    isBookmarked,
  };
};
