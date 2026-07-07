import { apiClient } from './client';

export interface NotificationEvent {
  id: number;
  userId: number;
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  eventId: string | null;
  sentAt: string;
  isRead: boolean;
}

export const notificationsApi = {
  getNotifications: async (): Promise<NotificationEvent[]> => {
    return apiClient.get<NotificationEvent[]>('/notifications');
  },
};
