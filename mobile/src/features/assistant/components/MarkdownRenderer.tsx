import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../../../theme';
import CodeBlock from './CodeBlock';

export interface MarkdownRendererProps {
  content: string;
}

/**
 * Purpose: Composed markdown renderer container resolving code blocks, headers, lists, and paragraphs.
 */
export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const { colors, typography, spacing } = useTheme();

  const blocks = React.useMemo(() => {
    const parts: { type: 'text' | 'code' | 'header' | 'list'; text: string; lang?: string }[] = [];
    const lines = content.split('\n');
    let insideCode = false;
    let currentCode = '';
    let currentLang = '';

    lines.forEach((line) => {
      if (line.startsWith('```')) {
        if (insideCode) {
          parts.push({ type: 'code', text: currentCode, lang: currentLang });
          currentCode = '';
          currentLang = '';
          insideCode = false;
        } else {
          currentLang = line.replace('```', '').trim();
          insideCode = true;
        }
      } else if (insideCode) {
        currentCode += line + '\n';
      } else if (line.startsWith('#')) {
        parts.push({ type: 'header', text: line.replace(/^#+\s*/, '') });
      } else if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
        parts.push({ type: 'list', text: line.replace(/^[\s-*]+\s*/, '') });
      } else if (line.trim()) {
        parts.push({ type: 'text', text: line });
      }
    });

    return parts;
  }, [content]);

  return (
    <View style={styles.container}>
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return <CodeBlock key={idx} code={block.text.trim()} language={block.lang} />;
        }
        if (block.type === 'header') {
          return (
            <Text key={idx} style={[styles.header, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily, marginTop: spacing.xs }]}>
              {block.text}
            </Text>
          );
        }
        if (block.type === 'list') {
          return (
            <View key={idx} style={[styles.listItem, { paddingLeft: spacing.sm }]}>
              <Text style={{ color: colors.primary, marginRight: 6 }}>•</Text>
              <Text style={[styles.listText, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily }]}>
                {block.text}
              </Text>
            </View>
          );
        }
        return (
          <Text key={idx} style={[styles.paragraph, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginVertical: spacing.xxs }]}>
            {block.text}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
  },
  listText: {
    fontSize: 13,
    flex: 1,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 18,
  },
});
