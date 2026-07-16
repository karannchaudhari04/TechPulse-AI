import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Clipboard } from 'react-native';
import { useTheme } from '../../../theme';
import MarkdownRenderer from './MarkdownRenderer';
import CitationCard from './CitationCard';
import Icon from '../../../components/common/Icon';
import { Citation } from '../api/assistantApiSlice';

export interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  onThumbsUp?: () => void;
  onThumbsDown?: () => void;
}

/**
 * Purpose: Chatbubble segment representing user inputs and assistant markdown contents.
 */
export default function ChatBubble({
  role,
  content,
  citations,
  onThumbsUp,
  onThumbsDown,
}: ChatBubbleProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const isUser = role === 'user';

  const handleCopy = () => {
    Clipboard.setString(content);
  };

  return (
    <View style={[styles.container, isUser ? styles.userAlign : styles.assistantAlign]}>
      <View style={[
        styles.bubble,
        {
          borderRadius: radius.md,
          backgroundColor: isUser ? colors.primary : colors.cardBackground,
          borderColor: colors.border,
          borderWidth: isUser ? 0 : 1,
          padding: spacing.md,
        }
      ]}>
        {isUser ? (
          <Text style={[styles.userText, { color: '#FFF', fontFamily: typography.bodyMedium.fontFamily }]}>
            {content}
          </Text>
        ) : (
          <MarkdownRenderer content={content} />
        )}
      </View>

      {!isUser && citations && citations.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={[styles.citationsScroll, { marginTop: spacing.xs }]}
        >
          {citations.map((cite) => (
            <CitationCard
              key={cite.id}
              title={cite.title}
              source={cite.source}
              credibility={cite.credibility}
              url={cite.url}
            />
          ))}
        </ScrollView>
      )}

      {!isUser && (
        <View style={[styles.toolbar, { marginTop: spacing.xxs }]}>
          <TouchableOpacity onPress={handleCopy} style={styles.toolBtn} accessibilityRole="button" accessibilityLabel="Copy message content">
            <Icon name="copy" provider="feather" size={14} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onThumbsUp} style={styles.toolBtn} accessibilityRole="button" accessibilityLabel="Thumbs Up">
            <Icon name="thumbs-up" provider="feather" size={14} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onThumbsDown} style={styles.toolBtn} accessibilityRole="button" accessibilityLabel="Thumbs Down">
            <Icon name="thumbs-down" provider="feather" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  userAlign: {
    alignItems: 'flex-end',
  },
  assistantAlign: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
  },
  userText: {
    fontSize: 13,
    lineHeight: 18,
  },
  citationsScroll: {
    width: '100%',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 4,
  },
  toolBtn: {
    padding: 4,
  },
});
