import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../theme';
import { useFollowTechnologyMutation } from '../api/eventsApiSlice';
import Icon from '../../../components/common/Icon';

export interface TechnologyChipProps {
  name: string;
  following: boolean;
  trendStatus?: 'EXPLODING' | 'RISING' | 'STABLE' | 'COOLING' | 'DECLINING' | 'DORMANT';
}

/**
 * Purpose: Custom interactive Chip showing technology names, trends, and follow status.
 * Invokes RTK Query follow mutation triggers directly on press.
 */
export default function TechnologyChip({
  name,
  following,
  trendStatus,
}: TechnologyChipProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const [followTech, { isLoading }] = useFollowTechnologyMutation();

  const handlePress = async () => {
    if (isLoading) return;
    try {
      await followTech({ technology: name, follow: !following }).unwrap();
    } catch (error) {
      console.error('[TechnologyChip] Failed to follow/unfollow technology:', error);
    }
  };

  const getTrendColor = (status?: string) => {
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

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isLoading}
      activeOpacity={0.8}
      style={[
        styles.chip,
        {
          borderRadius: radius.full,
          backgroundColor: following ? 'rgba(124, 58, 237, 0.08)' : colors.divider,
          borderColor: following ? colors.primary : colors.border,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
        },
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: following }}
      accessibilityLabel={`Follow technology ${name}`}
    >
      <Text style={[styles.labelText, { color: following ? colors.primary : colors.textPrimary, fontFamily: typography.bodySmall.fontFamily }]}>
        {name}
      </Text>
      {trendStatus && (
        <View style={styles.trendIcon}>
          <Icon 
            name={trendStatus === 'EXPLODING' || trendStatus === 'RISING' ? 'trending-up' : 'trending-down'} 
            provider="feather" 
            size={12} 
            color={getTrendColor(trendStatus)} 
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  trendIcon: {
    marginLeft: 4,
  },
});
