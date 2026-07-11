import React, { useMemo } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme';
import Button from './Button';
import Icon from './Icon';
import Card from './Card';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  iconName?: string;
  iconProvider?: any;
  actionTitle?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Purpose: Centered illustrative state displaying warning info when no records are returned.
 */
export function EmptyState({
  title = 'No Results Found',
  description = 'Try adjusting your search filters or check back later.',
  iconName = 'inbox',
  iconProvider = 'feather',
  actionTitle,
  onActionPress,
  style,
}: EmptyStateProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.centered, style]}>
      <Icon name={iconName} provider={iconProvider} size={48} color={colors.textMuted} />
      <Text
        style={[
          styles.title,
          {
            color: colors.textPrimary,
            fontFamily: typography.titleSmall.fontFamily,
            fontSize: typography.titleSmall.fontSize,
            fontWeight: typography.titleSmall.fontWeight,
            marginTop: spacing.md,
          },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.description,
          {
            color: colors.textSecondary,
            fontFamily: typography.bodyMedium.fontFamily,
            fontSize: typography.bodyMedium.fontSize,
            lineHeight: typography.bodyMedium.lineHeight,
            marginTop: spacing.xs,
          },
        ]}
      >
        {description}
      </Text>

      {actionTitle && onActionPress && (
        <Button
          title={actionTitle}
          onPress={onActionPress}
          style={{ marginTop: spacing.lg, minWidth: 150 }}
        />
      )}
    </View>
  );
}

export interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Purpose: Centered layout describing connectivity failure with quick-retry button.
 */
export function ErrorView({
  message = 'An unexpected system error occurred.',
  onRetry,
  style,
}: ErrorViewProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.centered, style]}>
      <Icon name="alert-triangle" provider="feather" size={48} color={colors.danger} />
      <Text
        style={[
          styles.title,
          {
            color: colors.textPrimary,
            fontFamily: typography.titleSmall.fontFamily,
            fontSize: typography.titleSmall.fontSize,
            fontWeight: typography.titleSmall.fontWeight,
            marginTop: spacing.md,
          },
        ]}
      >
        Oops! Something went wrong
      </Text>
      <Text
        style={[
          styles.description,
          {
            color: colors.textSecondary,
            fontFamily: typography.bodyMedium.fontFamily,
            fontSize: typography.bodyMedium.fontSize,
            lineHeight: typography.bodyMedium.lineHeight,
            marginTop: spacing.xs,
          },
        ]}
      >
        {message}
      </Text>

      {onRetry && (
        <Button
          title="Retry Connection"
          onPress={onRetry}
          variant="outlined"
          style={{ marginTop: spacing.lg, minWidth: 150 }}
        />
      )}
    </View>
  );
}

export interface ProgressIndicatorProps {
  progress: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Purpose: Custom styled linear Progress Bar.
 */
export function ProgressIndicator({
  progress,
  color,
  style,
}: ProgressIndicatorProps) {
  const { colors, radius } = useTheme();

  const clampedProgress = Math.max(0, Math.min(1, progress));

  return (
    <View
      style={[
        styles.progressTrack,
        {
          backgroundColor: colors.divider,
          borderRadius: radius.full,
          height: 6,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.progressBar,
          {
            backgroundColor: color || colors.primary,
            borderRadius: radius.full,
            width: `${clampedProgress * 100}%`,
            height: '100%',
          },
        ]}
      />
    </View>
  );
}

export interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  iconName?: string;
  iconProvider?: any;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  style?: StyleProp<ViewStyle>;
}

/**
 * Purpose: Premium dashboard element showing key system stats.
 */
export function StatCard({
  title,
  value,
  subtext,
  iconName,
  iconProvider,
  trend,
  trendType = 'neutral',
  style,
}: StatCardProps) {
  const { colors, typography, spacing } = useTheme();

  const trendColor = useMemo(() => {
    if (trendType === 'positive') return colors.success;
    if (trendType === 'negative') return colors.danger;
    return colors.textSecondary;
  }, [trendType, colors]);

  return (
    <Card variant="standard" style={style}>
      <View style={styles.statHeader}>
        <Text style={[{ color: colors.textSecondary, fontFamily: typography.caption.fontFamily, fontSize: 12 }]}>
          {title}
        </Text>
        {iconName && (
          <Icon name={iconName} provider={iconProvider} size={20} color={colors.textSecondary} />
        )}
      </View>

      <Text
        style={[
          {
            color: colors.textPrimary,
            fontFamily: typography.heading.fontFamily,
            fontSize: 26,
            fontWeight: 'bold',
            marginTop: spacing.xs,
          },
        ]}
      >
        {value}
      </Text>

      {(subtext || trend) && (
        <View style={[styles.statFooter, { marginTop: spacing.xs }]}>
          {trend && (
            <Text
              style={[
                {
                  color: trendColor,
                  fontFamily: typography.caption.fontFamily,
                  fontWeight: 'bold',
                  marginRight: spacing.xxs,
                },
              ]}
            >
              {trend}
            </Text>
          )}
          {subtext && (
            <Text style={[{ color: colors.textMuted, fontFamily: typography.caption.fontFamily, fontSize: 11 }]}>
              {subtext}
            </Text>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    maxWidth: '85%',
  },
  progressTrack: {
    width: '100%',
    overflow: 'hidden',
  },
  progressBar: {
    alignSelf: 'flex-start',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  statFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
