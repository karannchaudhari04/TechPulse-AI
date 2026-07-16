import { apiSlice } from '../../../api/apiSlice';

export interface Citation {
  id: string;
  title: string;
  source: string;
  credibility: number;
  publishedAt: string;
  relatedEventId?: string;
  url: string;
  icon?: string;
  category?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'sending' | 'streaming' | 'completed' | 'failed';
  messageType: 'text' | 'markdown' | 'comparison' | 'timeline' | 'summary' | 'code' | 'citation' | 'recommendation' | 'warning';
  citations?: Citation[];
  createdAt: string;
}

export interface ConversationInfo {
  conversationId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  messageCount: number;
  favorite: boolean;
  pinned: boolean;
  archived: boolean;
}

export interface ChatResponse {
  conversationId: string;
  title: string;
  message: ChatMessage;
}

export interface SuggestionPrompt {
  id: string;
  prompt: string;
  category: string;
  icon?: string;
}

/**
 * Purpose: RTK Query endpoints for conversational assistant prompts, feedbacks,
 * history registries, and response updates.
 */
export const assistantApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    sendChatMessage: builder.mutation<ChatResponse, { conversationId?: string; prompt: string }>({
      query: (payload) => ({
        url: '/assistant/chat',
        method: 'POST',
        data: payload,
      }),
      invalidatesTags: ['Conversation', 'History'],
    }),
    getHistory: builder.query<ConversationInfo[], void>({
      query: () => ({
        url: '/assistant/history',
        method: 'GET',
      }),
      providesTags: ['History'],
    }),
    deleteHistory: builder.mutation<void, void>({
      query: () => ({
        url: '/assistant/history',
        method: 'DELETE',
      }),
      invalidatesTags: ['History', 'Conversation'],
    }),
    getSuggestions: builder.query<SuggestionPrompt[], void>({
      query: () => ({
        url: '/assistant/suggestions',
        method: 'GET',
      }),
      providesTags: ['Assistant'],
    }),
    sendFeedback: builder.mutation<void, { messageId: string; helpful: boolean; feedbackText?: string }>({
      query: (payload) => ({
        url: '/assistant/feedback',
        method: 'POST',
        data: payload,
      }),
    }),
    regenerateResponse: builder.mutation<ChatResponse, { conversationId: string }>({
      query: (payload) => ({
        url: '/assistant/regenerate',
        method: 'POST',
        data: payload,
      }),
      invalidatesTags: ['Conversation'],
    }),
    updateTitle: builder.mutation<void, { conversationId: string; title: string }>({
      query: ({ conversationId, ...payload }) => ({
        url: `/assistant/title`,
        method: 'POST',
        data: { conversationId, ...payload },
      }),
      invalidatesTags: ['History'],
    }),
    getConversationDetails: builder.query<{ messages: ChatMessage[] }, string>({
      query: (id) => ({
        url: `/assistant/conversation/${id}`,
        method: 'GET',
      }),
      providesTags: ['Conversation'],
    }),
  }),
});

export const {
  useSendChatMessageMutation,
  useGetHistoryQuery,
  useDeleteHistoryMutation,
  useGetSuggestionsQuery,
  useSendFeedbackMutation,
  useRegenerateResponseMutation,
  useUpdateTitleMutation,
  useGetConversationDetailsQuery,
} = assistantApiSlice;
