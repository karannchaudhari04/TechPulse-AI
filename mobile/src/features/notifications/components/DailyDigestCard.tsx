import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../../../theme';
import Card from '../../../components/common/Card';
import Icon from '../../../components/common/Icon';

export interface DailyDigestCardProps {
  digestType: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'WEEKLY';
  dateString: string;
  topTechnologies: string[];
  releasesCount: number;
  criticalAlertsCount: number;
  summary: string;
}

/**
 * Purpose: Daily Digest Card presenting release counts, critical alerts counts, and summaries.
 */
export default function DailyDigestCard({
  digestType,
  dateString,
  topTechnologies,
  releasesCount,
  criticalAlertsCount,
  summary,
}: DailyDigestCardProps) {
  const { colors, typography, spacing, radius } = useTheme();

  const getDigestTitle = () => {
    switch (digestType) {
      case 'MORNING': return '☀️ Morning Intelligence Digest';
      case 'AFTERNOON': return '🌤️ Afternoon Intelligence Digest';
      case 'EVENING': return '🌙 Evening Intelligence Digest';
      case 'WEEKLY': return '📅 Weekly Intelligence Summary';
      default: return 'Daily Intelligence Digest';
    }
  };

  return (
    <Card variant="elevated" style={[styles.card, { borderColor: colors.border, padding: spacing.md, borderRadius: radius.md }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]}>
          {getDigestTitle()}
        </Text>
        <Text style={[styles.date, { color: colors.textMuted, fontFamily: typography.caption.fontFamily }]}>
          {dateString}
        </Text>
      </View>

      <Text style={[styles.summary, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.sm }]}>
        {summary}
      </Text>

      <View style={[styles.metricsRow, { marginTop: spacing.md, borderTopColor: colors.border, paddingTop: spacing.sm }]}>
        <View style={styles.metric}>
          <Icon name="box" provider="feather" size={16} color={colors.primary} />
          <Text style={[styles.metricText, { color: colors.textPrimary, fontFamily: typography.caption.fontFamily }]}>
            {releasesCount} Releases
          </Text>
        </View>

        <View style={styles.metric}>
          <Icon name="shield" provider="feather" size={16} color={colors.danger} />
          <Text style={[styles.metricText, { color: colors.textPrimary, fontFamily: typography.caption.fontFamily }]}>
            {criticalAlertsCount} Alerts
          </Text>
        </View>
      </View>

      {topTechnologies.length > 0 && (
        <View style={[styles.techRow, { marginTop: spacing.sm }]}>
          {topTechnologies.map((tech, idx) => (
            <View key={idx} style={[styles.chip, { backgroundColor: colors.divider, borderRadius: radius.full }]}>
              <Text style={[styles.chipText, { color: colors.textPrimary, fontFamily: typography.caption.fontFamily }]}>
                #{tech}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 11,
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 1,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  techRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
