import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import { useNavigation } from '@react-navigation/native';
import { networkTracker } from '../../../utils/network';

import NotificationCard from '../components/NotificationCard';
import NotificationGroup from '../components/NotificationGroup';
import { useNotificationAnalytics } from '../hooks/useNotificationAnalytics';
import { 
  useGetNotificationsQuery, 
  useMarkAsReadMutation, 
  useDeleteNotificationMutation,
  useMarkAllAsReadMutation,
  NotificationItem
} from '../api/notificationApiSlice';
import Icon from '../../../components/common/Icon';
import { SafeAreaWrapper } from '../../../components/common/Layout';

/**
 * Purpose: Notifications screen displaying grouped alerts, priorities,
 * swipes to delete, and mark-read mutators.
 */
export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { colors, typography, spacing } = useTheme();
  const analytics = useNotificationAnalytics();

  const [isOnline, setIsOnline] = useState(networkTracker.getIsOnline());

  const { data: notifications, isLoading, refetch } = useGetNotificationsQuery();
  const [markRead] = useMarkAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [markAllRead] = useMarkAllAsReadMutation();

  useEffect(() => {
    const unsubscribe = networkTracker.subscribe(setIsOnline);
    return unsubscribe;
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await markRead(id).unwrap();
    } catch (err) {
      console.error('[Notifications] Failed to mark read:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id).unwrap();
    } catch (err) {
      console.error('[Notifications] Failed to delete:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead().unwrap();
    } catch (err) {
      console.error('[Notifications] Failed to mark all read:', err);
    }
  };

  const groupedNotifications = React.useMemo(() => {
    if (!notifications) return { today: [], yesterday: [], older: [] };

    const today: NotificationItem[] = [];
    const yesterday: NotificationItem[] = [];
    const older: NotificationItem[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    notifications.forEach((item) => {
      const createdTime = new Date(item.createdAt).getTime();
      if (createdTime >= startOfToday) {
        today.push(item);
      } else if (createdTime >= startOfYesterday) {
        yesterday.push(item);
      } else {
        older.push(item);
      }
    });

    return { today, yesterday, older };
  }, [notifications]);

  const hasNotifications = notifications && notifications.length > 0;

  if (isLoading) {
    return (
      <SafeAreaWrapper style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <View style={[styles.navigationBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton} accessibilityRole="button" accessibilityLabel="Go Back">
          <Icon name="arrow-left" provider="feather" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]} numberOfLines={1}>
          Notifications Hub
        </Text>
        {hasNotifications ? (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.navButton} accessibilityRole="button" accessibilityLabel="Mark all as read">
            <Icon name="check-square" provider="feather" size={20} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.navButtonPlaceholder} />
        )}
      </View>

      {!isOnline && (
        <View style={[styles.offlineBanner, { backgroundColor: colors.danger, marginHorizontal: spacing.md, marginVertical: spacing.xs }]}>
          <Icon name="cloud-offline" provider="ionicons" size={14} color="#FFF" />
          <Text style={[styles.offlineText, { fontFamily: typography.caption.fontFamily }]}>
            Offline. Displaying cached notifications list.
          </Text>
        </View>
      )}

      {!hasNotifications ? (
        <View style={styles.center}>
          <Icon name="bell" provider="feather" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xs }]}>
            All caught up! No notifications alerts here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={[
            { title: 'Today', data: groupedNotifications.today },
            { title: 'Yesterday', data: groupedNotifications.yesterday },
            { title: 'Older', data: groupedNotifications.older },
          ].filter(group => group.data.length > 0)}
          renderItem={({ item }) => (
            <NotificationGroup title={item.title}>
              {item.data.map(notif => (
                <NotificationCard
                  key={notif.id}
                  title={notif.title}
                  message={notif.message}
                  type={notif.type}
                  priority={notif.priority}
                  read={notif.read}
                  createdAt={notif.createdAt}
                  onPress={() => {
                    analytics.trackNotificationOpened(notif.id, notif.type);
                    if (notif.payload?.eventId) {
                      navigation.navigate('EventDetail', { id: notif.payload.eventId });
                    }
                  }}
                  onMarkRead={() => handleMarkRead(notif.id)}
                  onDelete={() => handleDelete(notif.id)}
                />
              ))}
            </NotificationGroup>
          )}
          keyExtractor={(item) => item.title}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
          }
        />
      )}
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  navButton: {
    padding: 8,
  },
  navButtonPlaceholder: {
    width: 40,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  offlineText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
