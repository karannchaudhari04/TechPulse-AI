import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import { useAppSelector } from '../../../store';
import { Avatar } from '../../../components/common/Badge';
import Icon from '../../../components/common/Icon';

export interface HomeHeaderProps {
  onSearchPress: () => void;
  onNotificationsPress: () => void;
  onProfilePress?: () => void;
  breakingCount?: number;
  trendsCount?: number;
}

/**
 * Purpose: Premium custom greeting header for the main dashboard.
 * Exposes live status indicators and search entry fields.
 */
export default function HomeHeader({
  onSearchPress,
  onNotificationsPress,
  onProfilePress,
  breakingCount = 4,
  trendsCount = 18,
}: HomeHeaderProps) {
  const { colors, typography, spacing } = useTheme();
  const profile = useAppSelector((state) => state.profile.profile);

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const displayName = profile?.displayName || 'Developer';

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]}>
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily }]}>
            {getGreeting()}
          </Text>
          <Text style={[styles.name, { color: colors.textPrimary, fontFamily: typography.titleLarge.fontFamily }]}>
            {displayName}
          </Text>
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity onPress={onNotificationsPress} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Notifications">
            <Icon name="bell" provider="feather" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onProfilePress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Profile Settings">
            <Avatar 
              source={profile?.photoURL} 
              name={displayName} 
              size={36} 
              style={{ marginLeft: spacing.sm }} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.statsRow, { marginTop: spacing.xs }]}>
        <Text style={[styles.statsText, { color: colors.accent, fontFamily: typography.caption.fontFamily }]}>
          🔥 {breakingCount} breaking releases
        </Text>
        <Text style={[styles.statsDivider, { color: colors.border }]}>|</Text>
        <Text style={[styles.statsText, { color: colors.primary, fontFamily: typography.caption.fontFamily }]}>
          📈 {trendsCount} trending topics
        </Text>
      </View>

      <TouchableOpacity 
        onPress={onSearchPress} 
        activeOpacity={0.8}
        style={[styles.searchBox, { 
          backgroundColor: colors.surface, 
          borderColor: colors.border,
          borderRadius: 8,
          marginTop: spacing.sm,
          paddingHorizontal: spacing.sm,
        }]}
        accessibilityRole="search"
        accessibilityLabel="Search technology updates"
      >
        <Icon name="search" provider="feather" size={18} color={colors.textMuted} />
        <Text style={[styles.searchText, { color: colors.textMuted, fontFamily: typography.bodyMedium.fontFamily, marginLeft: spacing.xs }]}>
          Search technology updates...
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  greeting: {
    fontSize: 14,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsDivider: {
    marginHorizontal: 8,
    fontSize: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
  },
  searchText: {
    fontSize: 14,
  },
});
