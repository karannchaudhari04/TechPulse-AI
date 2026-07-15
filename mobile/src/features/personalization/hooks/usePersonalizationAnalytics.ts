import { useRecordInteractionMutation } from '../../events/api/eventsApiSlice';

/**
 * Purpose: Custom hook providing user personalization activities analytics trackers.
 */
export function usePersonalizationAnalytics() {
  const [recordInteraction] = useRecordInteractionMutation();

  const trackLibraryOpened = () => {
    console.info('[Analytics] Library Dashboard Opened');
  };

  const trackBookmarkToggle = (eventId: string, bookmarked: boolean) => {
    const action = bookmarked ? 'bookmark_added' : 'bookmark_removed';
    console.info(`[Analytics] Bookmark Action: ${action} for ${eventId}`);
    recordInteraction({ eventId, type: 'BOOKMARK' }).catch(err => {
      console.warn('[Analytics] Failed to track bookmark change:', err);
    });
  };

  const trackCollectionCreated = (name: string) => {
    console.info(`[Analytics] Collection Created: "${name}"`);
  };

  const trackCollectionDeleted = (id: string) => {
    console.info(`[Analytics] Collection Deleted: ${id}`);
  };

  const trackEventSavedToCollection = (collectionId: string, eventId: string) => {
    console.info(`[Analytics] Event ${eventId} saved to collection ${collectionId}`);
  };

  const trackTechnologyPreferenceChanged = (techName: string, followed: boolean) => {
    const action = followed ? 'follow_technology' : 'unfollow_technology';
    console.info(`[Analytics] Technology Action: ${action} for ${techName}`);
  };

  const trackResumeReading = (eventId: string) => {
    console.info(`[Analytics] Resume Reading: ${eventId}`);
    recordInteraction({ eventId, type: 'CLICK', value: 'continue_reading' }).catch(err => {
      console.warn('[Analytics] Failed to track resume reading:', err);
    });
  };

  const trackRecommendationClicked = (eventId: string) => {
    console.info(`[Analytics] Recommendation Clicked: ${eventId}`);
    recordInteraction({ eventId, type: 'CLICK', value: 'recommendation_click' }).catch(err => {
      console.warn('[Analytics] Failed to track recommendation click:', err);
    });
  };

  return {
    trackLibraryOpened,
    trackBookmarkToggle,
    trackCollectionCreated,
    trackCollectionDeleted,
    trackEventSavedToCollection,
    trackTechnologyPreferenceChanged,
    trackResumeReading,
    trackRecommendationClicked,
  };
}
