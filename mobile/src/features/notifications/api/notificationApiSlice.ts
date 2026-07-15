import { apiSlice } from '../../../api/apiSlice';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'SECURITY' | 'BREAKING' | 'FRAMEWORK' | 'AI' | 'DEVOPS' | 'DATABASE' | 'LANGUAGE' | 'DIGEST' | 'SYSTEM' | 'ACCOUNT';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  read: boolean;
  createdAt: string;
  payload?: Record<string, string>;
}

export interface NotificationPreferences {
  breakingNews: boolean;
  securityAlerts: boolean;
  aiReleases: boolean;
  frameworkUpdates: boolean;
  dailyDigest: boolean;
  weeklyDigest: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  frequency: 'IMMEDIATE' | 'FIFTEEN_MIN' | 'THIRTY_MIN' | 'HOURLY' | 'DAILY';
  maxNotificationsPerDay: number;
}

/**
 * Purpose: RTK Query endpoints for notifications listings, unread badge counts, and configurations.
 */
export const notificationApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationItem[], void>({
      query: () => ({
        url: '/notifications',
        method: 'GET',
      }),
      providesTags: ['Notification'],
    }),
    getUnreadCount: builder.query<{ count: number }, void>({
      query: () => ({
        url: '/notifications/unread',
        method: 'GET',
      }),
      providesTags: ['Notification'],
    }),
    markAsRead: builder.mutation<void, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PUT',
      }),
      invalidatesTags: ['Notification'],
    }),
    markAllAsRead: builder.mutation<void, void>({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PUT',
      }),
      invalidatesTags: ['Notification'],
    }),
    deleteNotification: builder.mutation<void, string>({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Notification'],
    }),
    clearAllNotifications: builder.mutation<void, void>({
      query: () => ({
        url: '/notifications',
        method: 'DELETE',
      }),
      invalidatesTags: ['Notification'],
    }),
    getNotificationPreferences: builder.query<NotificationPreferences, void>({
      query: () => ({
        url: '/notifications/preferences',
        method: 'GET',
      }),
      providesTags: ['Preferences'],
    }),
    updateNotificationPreferences: builder.mutation<NotificationPreferences, Partial<NotificationPreferences>>({
      query: (payload) => ({
        url: '/notifications/preferences',
        method: 'POST',
        data: payload,
      }),
      invalidatesTags: ['Preferences'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useClearAllNotificationsMutation,
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} = notificationApiSlice;
