import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import { useAppSelector } from '../../../store';
import { Avatar } from '../../../components/common/Badge';
import Icon from '../../../components/common/Icon';

export interface HomeHeaderProps {
  onNotificationsPress: () => void;
  onProfilePress?: () => void;
}

/**
 * Purpose: Premium clean greeting header for the main dashboard.
 * Displays greeting, user identity, notifications, and profile action.
 */
export default function HomeHeader({
  onNotificationsPress,
  onProfilePress,
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
});
