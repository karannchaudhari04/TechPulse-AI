import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import Card from '../../../components/common/Card';
import Icon from '../../../components/common/Icon';

export interface CollectionCardProps {
  name: string;
  description?: string;
  eventCount: number;
  pinned: boolean;
  favorite: boolean;
  onPress: () => void;
  onPinToggle?: () => void;
}

/**
 * Purpose: Folder Card displaying Collection attributes (event counts, pinned states).
 */
export default function CollectionCard({
  name,
  description,
  eventCount,
  pinned,
  favorite,
  onPress,
  onPinToggle,
}: CollectionCardProps) {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.container}>
      <Card variant="standard" style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: radius.md }]}>
        <View style={styles.folderRow}>
          <Icon name="folder" provider="feather" size={32} color={colors.primary} />
          
          <View style={styles.rightIcons}>
            {pinned && (
              <TouchableOpacity onPress={onPinToggle} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Pinned Collection">
                <Icon name="pin" provider="ionicons" size={16} color={colors.accent} />
              </TouchableOpacity>
            )}
            {favorite && (
              <Icon name="heart" provider="ionicons" size={16} color={colors.danger} />
            )}
          </View>
        </View>

        <Text style={[styles.name, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily, marginTop: spacing.sm }]} numberOfLines={1}>
          {name}
        </Text>

        {description ? (
          <Text style={[styles.desc, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily, marginTop: spacing.xxs }]} numberOfLines={2}>
            {description}
          </Text>
        ) : null}

        <Text style={[styles.count, { color: colors.textMuted, fontFamily: typography.caption.fontFamily, marginTop: spacing.xs }]}>
          {eventCount} {eventCount === 1 ? 'event' : 'events'}
        </Text>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 6,
  },
  card: {
    padding: 12,
    borderWidth: 1,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    padding: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  desc: {
    fontSize: 11,
    lineHeight: 14,
  },
  count: {
    fontSize: 11,
    fontWeight: '600',
  },
});
