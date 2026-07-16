/**
 * Purpose: Custom hook providing chat assistant usage behaviors analytics tracking.
 */
export function useAssistantAnalytics() {
  const trackConversationStarted = (category?: string) => {
    console.info(`[Analytics] AI Copilot Conversation Started: category=${category || 'general'}`);
  };

  const trackMessageSent = (prompt: string) => {
    console.info(`[Analytics] AI Copilot Message Sent: "${prompt}"`);
  };

  const trackResponseReceived = (durationMs: number) => {
    console.info(`[Analytics] AI Copilot Response Received in ${durationMs}ms`);
  };

  const trackCitationOpened = (citationId: string) => {
    console.info(`[Analytics] AI Copilot Citation Opened: ${citationId}`);
  };

  const trackCopyCode = (code: string) => {
    console.info(`[Analytics] AI Copilot Code Snippet Copied`);
  };

  const trackFeedback = (helpful: boolean) => {
    console.info(`[Analytics] AI Copilot Feedback: ${helpful ? 'thumbs_up' : 'thumbs_down'}`);
  };

  return {
    trackConversationStarted,
    trackMessageSent,
    trackResponseReceived,
    trackCitationOpened,
    trackCopyCode,
    trackFeedback,
  };
}
