import { useRecordInteractionMutation } from '../../events/api/eventsApiSlice';

/**
 * Purpose: Custom hook providing search metrics and user behaviors analytics tracking.
 */
export function useSearchAnalytics() {
  const [recordInteraction] = useRecordInteractionMutation();

  const trackSearchStarted = () => {
    console.info('[Analytics] Search Started');
  };

  const trackQuerySubmitted = (
    query: string, 
    mode: 'semantic' | 'keyword', 
    filtersCount: number, 
    resultCount: number, 
    durationMs: number,
    isOffline: boolean
  ) => {
    console.info(`[Analytics] Search Query: "${query}" | Mode: ${mode} | Filters: ${filtersCount} | Results: ${resultCount} | Duration: ${durationMs}ms | Offline: ${isOffline}`);
  };

  const trackSuggestionClicked = (suggestion: string) => {
    console.info(`[Analytics] Suggestion Clicked: "${suggestion}"`);
  };

  const trackResultOpened = (eventId: string, position: number) => {
    console.info(`[Analytics] Search Result Opened: ${eventId} at position ${position}`);
    recordInteraction({ eventId, type: 'CLICK', value: `search_pos_${position}` }).catch(err => {
      console.warn('[Analytics] Failed to track result click:', err);
    });
  };

  const trackFilterApplied = (filters: any) => {
    console.info('[Analytics] Search Filters Applied:', filters);
  };

  const trackHistoryClicked = (query: string) => {
    console.info(`[Analytics] History Item Clicked: "${query}"`);
  };

  const trackTechnologyFollowed = (techName: string, followed: boolean) => {
    console.info(`[Analytics] Technology Followed from Search: ${techName} (${followed})`);
  };

  const trackBookmarkClicked = (eventId: string) => {
    recordInteraction({ eventId, type: 'BOOKMARK' }).catch(err => {
      console.warn('[Analytics] Failed to track search bookmark:', err);
    });
  };

  return {
    trackSearchStarted,
    trackQuerySubmitted,
    trackSuggestionClicked,
    trackResultOpened,
    trackFilterApplied,
    trackHistoryClicked,
    trackTechnologyFollowed,
    trackBookmarkClicked,
  };
}
