import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../../theme';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../store';
import { networkTracker } from '../../../utils/network';

import ChatBubble from '../components/ChatBubble';
import TypingIndicator from '../components/TypingIndicator';
import { useAssistantAnalytics } from '../hooks/useAssistantAnalytics';
import { 
  useSendChatMessageMutation, 
  useGetSuggestionsQuery,
  useSendFeedbackMutation,
  ChatMessage
} from '../api/assistantApiSlice';
import { 
  setActiveConversationId,
  setDraftMessage,
  setAssistantStatus,
  appendUserMessage,
  appendAssistantMessage
} from '../store/conversationSlice';
import Icon from '../../../components/common/Icon';
import { SafeAreaWrapper } from '../../../components/common/Layout';

/**
 * Purpose: Main AI Copilot chat screen viewport.
 * Integrates suggestions lists, inverted virtualized flatlists, and status labels.
 */
export default function AssistantScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { colors, typography, spacing } = useTheme();
  const analytics = useAssistantAnalytics();

  const [isOnline, setIsOnline] = useState(networkTracker.getIsOnline());
  const [input, setInput] = useState('');

  const { activeConversationId, assistantStatus, messages, draftMessage } = useAppSelector(state => state.conversation);
  const activeMessages = activeConversationId ? (messages[activeConversationId] || []) : [];

  const { data: suggestions } = useGetSuggestionsQuery();
  const [sendMessage] = useSendChatMessageMutation();
  const [sendFeedback] = useSendFeedbackMutation();

  const flatListRef = useRef<FlatList>(null);
  const searchStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (draftMessage) {
      setInput(draftMessage);
    }
    const unsubscribe = networkTracker.subscribe(setIsOnline);
    return () => {
      unsubscribe();
    };
  }, []);

  const handleSend = async (textToSend?: string) => {
    const finalPrompt = textToSend || input;
    if (!finalPrompt.trim()) return;

    setInput('');
    dispatch(setDraftMessage(''));

    const convId = activeConversationId || Math.random().toString(36).substring(7);
    if (!activeConversationId) {
      dispatch(setActiveConversationId(convId));
      analytics.trackConversationStarted();
    }

    dispatch(appendUserMessage({ conversationId: convId, content: finalPrompt }));
    dispatch(setAssistantStatus('thinking'));
    analytics.trackMessageSent(finalPrompt);
    searchStartTimeRef.current = Date.now();

    try {
      if (!isOnline) {
        setTimeout(() => {
          const offlineMsg: ChatMessage = {
            id: Math.random().toString(36).substring(7),
            role: 'assistant',
            content: 'Connection offline. I will respond to your queries once you are back online.',
            status: 'completed',
            messageType: 'text',
            createdAt: new Date().toISOString(),
          };
          dispatch(appendAssistantMessage({ conversationId: convId, message: offlineMsg }));
          dispatch(setAssistantStatus('completed'));
        }, 1000);
        return;
      }

      const result = await sendMessage({ 
        conversationId: activeConversationId || undefined, 
        prompt: finalPrompt 
      }).unwrap();

      dispatch(appendAssistantMessage({ conversationId: convId, message: result.message }));
      dispatch(setAssistantStatus('completed'));
      analytics.trackResponseReceived(Date.now() - searchStartTimeRef.current);
    } catch (err) {
      dispatch(setAssistantStatus('error'));
      console.error('[Assistant] Failed to get response:', err);
    }
  };

  const handleFeedback = async (messageId: string, helpful: boolean) => {
    try {
      await sendFeedback({ messageId, helpful }).unwrap();
      analytics.trackFeedback(helpful);
    } catch (err) {
      console.error('[Assistant] Failed to send feedback:', err);
    }
  };

  const reversedMessages = [...activeMessages].reverse();

  return (
    <SafeAreaWrapper>
      <View style={[styles.navigationBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton} accessibilityRole="button" accessibilityLabel="Go Back">
          <Icon name="arrow-left" provider="feather" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]} numberOfLines={1}>
          AI Engineering Copilot
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('ConversationHistory')} style={styles.navButton} accessibilityRole="button" accessibilityLabel="History">
          <Icon name="history" provider="material" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={reversedMessages}
          inverted
          renderItem={({ item }) => (
            <ChatBubble
              role={item.role}
              content={item.content}
              citations={item.citations}
              onThumbsUp={() => handleFeedback(item.id, true)}
              onThumbsDown={() => handleFeedback(item.id, false)}
            />
          )}
          keyExtractor={(item) => item.id}
          ListFooterComponent={() => {
            if (activeMessages.length === 0 && suggestions && suggestions.length > 0) {
              return (
                <View style={[styles.suggestionsContainer, { padding: spacing.md }]}>
                  <Text style={[styles.suggestLabel, { color: colors.textSecondary, fontFamily: typography.titleSmall.fontFamily }]}>
                    QUICK START SUGGESTIONS
                  </Text>
                  
                  <View style={[styles.suggestionsGrid, { marginTop: spacing.sm }]}>
                    {suggestions.map(s => (
                      <TouchableOpacity 
                        key={s.id} 
                        onPress={() => handleSend(s.prompt)}
                        style={[styles.suggestCard, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
                      >
                        <Icon name={s.icon || 'zap'} provider="feather" size={16} color={colors.primary} />
                        <Text style={[styles.suggestText, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]} numberOfLines={2}>
                          {s.prompt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            }
            return null;
          }}
          ListHeaderComponent={() => {
            if (assistantStatus !== 'idle' && assistantStatus !== 'completed') {
              return <TypingIndicator status={assistantStatus} />;
            }
            return null;
          }}
        />

        <View style={[styles.inputBarContainer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TextInput
            value={input}
            onChangeText={(text) => {
              setInput(text);
              dispatch(setDraftMessage(text));
            }}
            placeholder="Ask AI Copilot anything..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border }]}
          />
          
          <TouchableOpacity 
            onPress={() => handleSend()}
            disabled={!input.trim()}
            style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.divider }]}
            accessibilityRole="button"
            accessibilityLabel="Send Prompt"
          >
            <Icon name="send" provider="feather" size={16} color={input.trim() ? '#FFF' : colors.textMuted} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  navButton: {
    padding: 8,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  suggestionsContainer: {
    width: '100%',
  },
  suggestLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  suggestionsGrid: {
    gap: 8,
  },
  suggestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
  },
  suggestText: {
    fontSize: 13,
    flex: 1,
  },
  inputBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    padding: 10,
    gap: 10,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
