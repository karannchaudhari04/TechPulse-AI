import { useRecordInteractionMutation } from '../../events/api/eventsApiSlice';

/**
 * Purpose: Custom hook providing user behavioral analytics triggers (views, clicks, scrolls, bookmarks).
 */
export function useFeedAnalytics() {
  const [recordInteraction] = useRecordInteractionMutation();

  const trackFeedOpen = (feedName: string) => {
    console.info(`[Analytics] Feed Open: ${feedName}`);
  };

  const trackCardViewed = (eventId: string) => {
    recordInteraction({ eventId, type: 'VIEW' }).catch(err => {
      console.warn('[Analytics] Failed to track card view:', err);
    });
  };

  const trackCardClicked = (eventId: string) => {
    recordInteraction({ eventId, type: 'CLICK' }).catch(err => {
      console.warn('[Analytics] Failed to track card click:', err);
    });
  };

  const trackBookmark = (eventId: string) => {
    recordInteraction({ eventId, type: 'BOOKMARK' }).catch(err => {
      console.warn('[Analytics] Failed to track bookmark:', err);
    });
  };

  const trackShare = (eventId: string, destination: string) => {
    recordInteraction({ eventId, type: 'SHARE', value: destination }).catch(err => {
      console.warn('[Analytics] Failed to track share:', err);
    });
  };

  const trackScrollDepth = (depthPercentage: number) => {
    console.info(`[Analytics] Scroll Depth: ${depthPercentage}%`);
  };

  return {
    trackFeedOpen,
    trackCardViewed,
    trackCardClicked,
    trackBookmark,
    trackShare,
    trackScrollDepth,
  };
}
