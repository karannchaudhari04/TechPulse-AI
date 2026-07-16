import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage } from '../api/assistantApiSlice';

export interface ConversationState {
  activeConversationId: string | null;
  draftMessage: string;
  assistantStatus: 'idle' | 'thinking' | 'searching' | 'retrieving' | 'generating' | 'completed' | 'error';
  messages: Record<string, ChatMessage[]>;
}

const initialState: ConversationState = {
  activeConversationId: null,
  draftMessage: '',
  assistantStatus: 'idle',
  messages: {},
};

/**
 * Purpose: Redux state slice managing local AI assistant conversation messages lists,
 * current statuses, and text drafts inputs.
 */
export const conversationSlice = createSlice({
  name: 'conversation',
  initialState,
  reducers: {
    setActiveConversationId: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
    },
    setDraftMessage: (state, action: PayloadAction<string>) => {
      state.draftMessage = action.payload;
    },
    setAssistantStatus: (state, action: PayloadAction<ConversationState['assistantStatus']>) => {
      state.assistantStatus = action.payload;
    },
    appendUserMessage: (state, action: PayloadAction<{ conversationId: string; content: string }>) => {
      const { conversationId, content } = action.payload;
      const userMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: 'user',
        content,
        status: 'completed',
        messageType: 'text',
        createdAt: new Date().toISOString(),
      };
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      state.messages[conversationId].push(userMsg);
    },
    appendAssistantMessage: (state, action: PayloadAction<{ conversationId: string; message: ChatMessage }>) => {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      state.messages[conversationId].push(message);
    },
    clearMessages: (state, action: PayloadAction<string>) => {
      delete state.messages[action.payload];
    },
  },
});

export const {
  setActiveConversationId,
  setDraftMessage,
  setAssistantStatus,
  appendUserMessage,
  appendAssistantMessage,
  clearMessages,
} = conversationSlice.actions;

export default conversationSlice.reducer;
