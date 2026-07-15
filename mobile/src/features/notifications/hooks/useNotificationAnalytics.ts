import { useRecordInteractionMutation } from '../../events/api/eventsApiSlice';

/**
 * Purpose: Custom hook providing user notifications and user engagement analytics trackers.
 */
export function useNotificationAnalytics() {
  const [recordInteraction] = useRecordInteractionMutation();

  const trackNotificationOpened = (id: string, type: string) => {
    console.info(`[Analytics] Notification Opened: ${id} | Type: ${type}`);
  };

  const trackNotificationActionClicked = (id: string, actionName: string) => {
    console.info(`[Analytics] Notification Action Clicked: ${id} | Action: ${actionName}`);
  };

  const trackTechnologyFollowChanged = (techName: string, followed: boolean) => {
    const action = followed ? 'technology_followed' : 'technology_unfollowed';
    console.info(`[Analytics] Technology Preference Action: ${action} for ${techName}`);
  };

  const trackDigestOpened = (digestType: string) => {
    console.info(`[Analytics] Digest Opened: ${digestType}`);
  };

  const trackPushPermissions = (granted: boolean) => {
    const action = granted ? 'push_permission_granted' : 'push_permission_denied';
    console.info(`[Analytics] Push Permissions: ${action}`);
  };

  const trackRecommendationOpened = (eventId: string) => {
    console.info(`[Analytics] Recommendation Opened: ${eventId}`);
    recordInteraction({ eventId, type: 'CLICK', value: 'recommendation_view' }).catch(err => {
      console.warn('[Analytics] Failed to track recommendation open:', err);
    });
  };

  return {
    trackNotificationOpened,
    trackNotificationActionClicked,
    trackTechnologyFollowChanged,
    trackDigestOpened,
    trackPushPermissions,
    trackRecommendationOpened,
  };
}
