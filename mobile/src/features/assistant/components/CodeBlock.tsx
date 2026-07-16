import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Clipboard } from 'react-native';
import { useTheme } from '../../../theme';
import Icon from '../../../components/common/Icon';

export interface CodeBlockProps {
  code: string;
  language?: string;
}

/**
 * Purpose: Monospaced code box with code copies button.
 */
export default function CodeBlock({ code, language }: CodeBlockProps) {
  const { colors, typography, spacing, radius } = useTheme();

  const handleCopy = () => {
    Clipboard.setString(code);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.divider, borderRadius: radius.sm, borderColor: colors.border }]}>
      <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.langText, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
          {language || 'code'}
        </Text>
        
        <TouchableOpacity onPress={handleCopy} style={styles.copyBtn} accessibilityRole="button" accessibilityLabel="Copy code to clipboard">
          <Icon name="copy" provider="feather" size={14} color={colors.textSecondary} />
          <Text style={[styles.copyText, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
            Copy
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: spacing.sm }}>
        <Text style={[styles.codeText, { color: colors.textPrimary, fontFamily: typography.caption.fontFamily }]}>
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    marginVertical: 6,
    width: '100%',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  langText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  codeText: {
    fontSize: 12,
  },
});
