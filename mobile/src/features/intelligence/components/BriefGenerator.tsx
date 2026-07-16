import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import { useGenerateTechBriefMutation } from '../api/intelligenceApiSlice';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import Icon from '../../../components/common/Icon';

/**
 * Purpose: AI Brief Generator offering topic inputs and exporting controls.
 */
export default function BriefGenerator() {
  const { colors, typography, spacing, radius } = useTheme();
  const [topic, setTopic] = useState('');
  const [generateBrief, { isLoading }] = useGenerateTechBriefMutation();
  const [resultBrief, setResultBrief] = useState<string | null>(null);

  const handleGenerate = async (format: 'markdown' | 'pdf') => {
    if (!topic.trim()) return;
    try {
      const brief = await generateBrief({ topic, format }).unwrap();
      setResultBrief(brief.content);
      Alert.alert('Success', `AI Brief successfully generated in ${format.toUpperCase()} format.`);
    } catch (err) {
      console.error('[BriefGenerator] Generation failed:', err);
      Alert.alert('Error', 'Failed to generate brief. Please try again.');
    }
  };

  return (
    <Card variant="standard" style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: radius.md, padding: spacing.md }]}>
      <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]}>
        AI Knowledge Brief Generator
      </Text>
      <Text style={[styles.desc, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xxs }]}>
        Generate custom engineering briefs and export to PDF or Markdown formats.
      </Text>

      <TextInput
        value={topic}
        onChangeText={setTopic}
        placeholder="Enter topic (e.g. Java 21 Migration Guide)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, borderRadius: radius.sm, marginTop: spacing.sm }]}
      />

      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={() => handleGenerate('markdown')}
          disabled={isLoading || !topic.trim()}
          style={[styles.actionBtn, { borderColor: colors.primary, borderRadius: radius.sm }]}
          accessibilityRole="button"
          accessibilityLabel="Export Markdown Brief"
        >
          <Icon name="file-text" provider="feather" size={14} color={colors.primary} />
          <Text style={[styles.btnText, { color: colors.primary, fontFamily: typography.bodyMedium.fontFamily }]}>
            Export Markdown
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleGenerate('pdf')}
          disabled={isLoading || !topic.trim()}
          style={[styles.actionBtn, { borderColor: colors.primary, borderRadius: radius.sm }]}
          accessibilityRole="button"
          accessibilityLabel="Export PDF Brief"
        >
          <Icon name="download" provider="feather" size={14} color={colors.primary} />
          <Text style={[styles.btnText, { color: colors.primary, fontFamily: typography.bodyMedium.fontFamily }]}>
            Export PDF
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.md }} />
      )}

      {resultBrief && (
        <View style={[styles.resultBox, { backgroundColor: colors.divider, borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.md }]}>
          <Text style={[styles.resultText, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily }]} numberOfLines={6}>
            {resultBrief}
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    marginVertical: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  desc: {
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    height: 40,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flex: 1,
    height: 36,
    gap: 6,
  },
  btnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultBox: {
    maxHeight: 120,
    overflow: 'hidden',
  },
  resultText: {
    fontSize: 11,
    lineHeight: 15,
  },
});
