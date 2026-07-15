import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { useTheme } from '../../../theme';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../../components/common/Icon';
import { useGetUnreadCountQuery } from '../api/notificationApiSlice';

/**
 * Purpose: Header notification bell widget.
 * Fetches unread counts and overlays badge indicators.
 */
export default function NotificationBell() {
  const navigation = useNavigation<any>();
  const { colors, typography } = useTheme();

  const { data: unreadData } = useGetUnreadCountQuery();
  const count = unreadData?.count || 0;

  return (
    <TouchableOpacity 
      onPress={() => navigation.navigate('Notifications')}
      activeOpacity={0.7}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={`Notifications, ${count} unread`}
    >
      <Icon name="bell" provider="feather" size={22} color={colors.textPrimary} />
      
      {count > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.danger }]}>
          <Text style={[styles.badgeText, { fontFamily: typography.caption.fontFamily }]}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 6,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
