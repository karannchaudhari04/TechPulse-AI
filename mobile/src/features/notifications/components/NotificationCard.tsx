import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import Card from '../../../components/common/Card';
import Icon from '../../../components/common/Icon';
import PriorityBadge from './PriorityBadge';

export interface NotificationCardProps {
  title: string;
  message: string;
  type: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  read: boolean;
  createdAt: string;
  onPress: () => void;
  onMarkRead?: () => void;
  onDelete?: () => void;
}

/**
 * Purpose: Premium notification card displaying type badges, priority indicators,
 * timestamps, and mark-read/delete actions.
 */
export default function NotificationCard({
  title,
  message,
  type,
  priority,
  read,
  createdAt,
  onPress,
  onMarkRead,
  onDelete,
}: NotificationCardProps) {
  const { colors, typography, spacing, radius } = useTheme();

  const getPriorityStripeColor = () => {
    switch (priority) {
      case 'CRITICAL': return colors.danger;
      case 'HIGH': return colors.warning;
      case 'NORMAL': return colors.primary;
      case 'LOW': return colors.info;
      default: return colors.border;
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'SECURITY': return 'shield';
      case 'BREAKING': return 'zap';
      case 'FRAMEWORK': return 'box';
      case 'AI': return 'cpu';
      case 'DIGEST': return 'book-open';
      default: return 'bell';
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.container}>
      <Card variant="standard" style={[styles.card, { borderColor: colors.border, backgroundColor: read ? colors.cardBackground : colors.divider, borderRadius: radius.md }]}>
        <View style={[styles.stripe, { backgroundColor: getPriorityStripeColor() }]} />

        <View style={[styles.content, { padding: spacing.md }]}>
          <View style={styles.headerRow}>
            <View style={styles.typeIconRow}>
              <Icon name={getTypeIcon()} provider="feather" size={16} color={colors.primary} />
              <Text style={[styles.typeText, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
                {type}
              </Text>
            </View>
            <PriorityBadge priority={priority} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily, marginTop: spacing.xs }]} numberOfLines={1}>
            {title}
          </Text>

          <Text style={[styles.message, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xxs }]} numberOfLines={2}>
            {message}
          </Text>

          <View style={[styles.footerRow, { marginTop: spacing.sm }]}>
            <Text style={[styles.time, { color: colors.textMuted, fontFamily: typography.caption.fontFamily }]}>
              {new Date(createdAt).toLocaleDateString()}
            </Text>
            
            <View style={styles.actions}>
              {!read && onMarkRead && (
                <TouchableOpacity onPress={onMarkRead} style={styles.actionBtn} accessibilityRole="button" accessibilityLabel="Mark as read">
                  <Icon name="check" provider="feather" size={14} color={colors.success} />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity onPress={onDelete} style={styles.actionBtn} accessibilityRole="button" accessibilityLabel="Delete notification">
                  <Icon name="trash-2" provider="feather" size={14} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    overflow: 'hidden',
  },
  stripe: {
    width: 4,
    height: '100%',
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 4,
  },
});
