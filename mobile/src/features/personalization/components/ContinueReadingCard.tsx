import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../../../theme';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';

export interface ContinueReadingCardProps {
  headline: string;
  lastOpened: string;
  progressPercentage: number;
  onResume: () => void;
}

/**
 * Purpose: Composable "Continue Reading" widget.
 * Renders partial completion progress bars and triggers navigation resumes.
 */
export default function ContinueReadingCard({
  headline,
  lastOpened,
  progressPercentage,
  onResume,
}: ContinueReadingCardProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <Card variant="elevated" style={[styles.card, { borderColor: colors.border, padding: spacing.md }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.primary, fontFamily: typography.titleSmall.fontFamily }]}>
          CONTINUE READING
        </Text>
        <Text style={[styles.time, { color: colors.textMuted, fontFamily: typography.caption.fontFamily }]}>
          {lastOpened}
        </Text>
      </View>

      <Text style={[styles.headline, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xxs }]} numberOfLines={2}>
        {headline}
      </Text>

      <View style={[styles.progressContainer, { marginTop: spacing.md }]}>
        <View style={styles.progressLabelRow}>
          <Text style={[styles.progressText, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
            Progress
          </Text>
          <Text style={[styles.progressText, { color: colors.textPrimary, fontFamily: typography.caption.fontFamily, fontWeight: 'bold' }]}>
            {progressPercentage}%
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: colors.divider, marginTop: 4 }]}>
          <View style={[styles.fill, { width: `${progressPercentage}%`, backgroundColor: colors.primary }]} />
        </View>
      </View>

      <Button
        title="Resume Reading"
        onPress={onResume}
        style={{ marginTop: spacing.md, minHeight: 36, paddingVertical: 6 }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  title: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  time: {
    fontSize: 11,
  },
  headline: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressContainer: {
    width: '100%',
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  progressText: {
    fontSize: 11,
  },
  track: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
