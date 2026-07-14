import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import { SearchResultItem } from '../api/searchApiSlice';
import Icon from '../../../components/common/Icon';
import Card from '../../../components/common/Card';
import { Tag } from '../../../components/common/Badge';

export interface SearchResultCardProps {
  item: SearchResultItem;
  onPress: () => void;
  onBookmarkToggle: () => void;
}

/**
 * Purpose: Advanced Search Result card displaying Entity Type badges, relevance explanations,
 * and AI summary briefings.
 */
export default function SearchResultCard({
  item,
  onPress,
  onBookmarkToggle,
}: SearchResultCardProps) {
  const { colors, typography, spacing, radius } = useTheme();

  const getTrendColor = (status: SearchResultItem['trendStatus']) => {
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

  const getTrendIcon = (status: SearchResultItem['trendStatus']) => {
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

  const getEntityTypeColor = (type: SearchResultItem['entityType']) => {
    switch (type) {
      case 'SECURITY_ALERT':
        return colors.danger;
      case 'RELEASE':
        return colors.accent;
      case 'TECHNOLOGY':
      case 'FRAMEWORK':
        return colors.primary;
      case 'COMPANY':
        return colors.info;
      case 'EVENT':
      default:
        return colors.textSecondary;
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.container}>
      <Card variant="standard" style={{ borderColor: colors.border, backgroundColor: colors.cardBackground, padding: spacing.md, borderRadius: radius.md }}>
        {/* Top Tag Row */}
        <View style={styles.topRow}>
          <View style={styles.tagsRow}>
            <Tag label={item.entityType} style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: getEntityTypeColor(item.entityType), borderWidth: 1 }} textStyle={{ color: getEntityTypeColor(item.entityType) }} />
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
          
          <TouchableOpacity onPress={onBookmarkToggle} style={styles.bookmarkButton} accessibilityRole="button" accessibilityLabel="Bookmark item">
            <Icon 
              name={item.bookmarked ? 'bookmark' : 'bookmark-outline'} 
              provider="ionicons" 
              size={20} 
              color={item.bookmarked ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>

        {/* Headline */}
        <Text style={[styles.headline, { color: colors.textPrimary, fontFamily: typography.titleMedium.fontFamily, marginTop: spacing.xs }]} numberOfLines={2}>
          {item.headline}
        </Text>

        {/* AI Summary */}
        <Text style={[styles.summary, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xs }]} numberOfLines={3}>
          {item.summary}
        </Text>

        {/* Relevance explanation details */}
        {item.relevanceExplanation && (
          <View style={[styles.relevanceBox, { backgroundColor: colors.divider, borderRadius: radius.xs, marginTop: spacing.sm, padding: spacing.xs }]}>
            <Icon name="info" provider="feather" size={12} color={colors.primary} />
            <Text style={[styles.relevanceText, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily, marginLeft: spacing.xxs }]} numberOfLines={1}>
              {item.relevanceExplanation}
            </Text>
          </View>
        )}

        {/* Footer Metrics */}
        <View style={[styles.footerRow, { marginTop: spacing.md }]}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted, fontFamily: typography.caption.fontFamily }]}>
              Credibility
            </Text>
            <Text style={[styles.metricValue, { color: colors.success, fontFamily: typography.bodySmall.fontFamily }]}>
              {item.credibilityScore}%
            </Text>
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
  headline: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
  },
  relevanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  relevanceText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
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
