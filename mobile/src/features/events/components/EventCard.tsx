import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import { FeedItem } from '../../feed/api/feedApiSlice';
import Icon from '../../../components/common/Icon';
import Card from '../../../components/common/Card';
import { Tag } from '../../../components/common/Badge';

export interface EventCardProps {
  item: FeedItem;
  onPress: () => void;
  onBookmarkToggle: () => void;
}

/**
 * Purpose: Design System styled Event Card.
 * Surfaces AI credibility indicators, importance metrics, and recommendation details.
 */
export default function EventCard({
  item,
  onPress,
  onBookmarkToggle,
}: EventCardProps) {
  const { colors, typography, spacing, radius } = useTheme();

  const getTrendColor = (status: FeedItem['trendStatus']) => {
    switch (status) {
      case 'EXPLODING':
        return colors.primary;
      case 'RISING':
        return colors.success;
      case 'STABLE':
        return colors.info;
      case 'COOLING':
        return colors.warning;
      case 'DECLINING':
      case 'DORMANT':
      default:
        return colors.textSecondary;
    }
  };

  const getTrendIcon = (status: FeedItem['trendStatus']) => {
    switch (status) {
      case 'EXPLODING':
        return 'zap';
      case 'RISING':
        return 'trending-up';
      case 'STABLE':
        return 'minus';
      case 'COOLING':
        return 'trending-down';
      case 'DECLINING':
      case 'DORMANT':
      default:
        return 'slash';
    }
  };

  const getCredibilityType = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 50) return 'warning';
    return 'danger';
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.container}>
      <Card variant="standard" style={{ borderColor: colors.border, backgroundColor: colors.cardBackground, padding: spacing.md, borderRadius: radius.md }}>
        {item.recommendationReason && (
          <View style={[styles.recommendationBanner, { borderBottomColor: colors.border, paddingBottom: spacing.xs, marginBottom: spacing.sm }]}>
            <Icon name="info" provider="feather" size={14} color={colors.primary} />
            <Text style={[styles.recommendationText, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily, marginLeft: spacing.xxs }]}>
              {item.recommendationReason}
            </Text>
          </View>
        )}

        <View style={styles.topRow}>
          <View style={styles.tagsRow}>
            <Tag label={item.technology} type="primary" />
            {item.version && (
              <Tag label={`v${item.version}`} type="info" />
            )}
            <View style={[styles.trendRow, { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: colors.border, borderRadius: radius.xs }]}>
              <Icon name={getTrendIcon(item.trendStatus)} provider="feather" size={12} color={getTrendColor(item.trendStatus)} />
              <Text style={[styles.trendText, { color: getTrendColor(item.trendStatus), fontFamily: typography.caption.fontFamily }]}>
                {item.trendStatus}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity onPress={onBookmarkToggle} style={styles.bookmarkButton} accessibilityRole="button" accessibilityLabel="Bookmark Event">
            <Icon 
              name={item.bookmarked ? 'bookmark' : 'bookmark-outline'} 
              provider="ionicons" 
              size={20} 
              color={item.bookmarked ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>

        <Text 
          style={[
            styles.headline, 
            { color: colors.textPrimary, fontFamily: typography.titleMedium.fontFamily, marginTop: spacing.xs }
          ]}
          numberOfLines={2}
        >
          {item.headline}
        </Text>

        <Text 
          style={[
            styles.summary, 
            { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xs }
          ]}
          numberOfLines={3}
        >
          {item.summary}
        </Text>

        <View style={[styles.footerRow, { marginTop: spacing.md }]}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted, fontFamily: typography.caption.fontFamily }]}>
              Credibility
            </Text>
            <Tag label={`${item.credibilityScore}%`} type={getCredibilityType(item.credibilityScore)} />
          </View>

          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted, fontFamily: typography.caption.fontFamily }]}>
              Importance
            </Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary, fontFamily: typography.bodySmall.fontFamily }]}>
              {item.importanceScore}/100
            </Text>
          </View>

          <Text style={[styles.time, { color: colors.textMuted, fontFamily: typography.caption.fontFamily }]}>
            {item.publishedTime}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  trendText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  bookmarkButton: {
    padding: 4,
  },
  recommendationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  recommendationText: {
    fontSize: 11,
    fontWeight: '500',
  },
  headline: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  time: {
    fontSize: 11,
  },
});
