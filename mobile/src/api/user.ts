import { apiClient } from './client';

export const userApi = {
  savePreferences: async (categories: string[]) => {
    return apiClient.post('/users/preferences', { categories });
  },

  getPreferences: async () => {
    return apiClient.get<string[]>('/users/preferences');
  },

  getProfile: async () => {
    return apiClient.get<any>('/users/profile');
  },

  registerPushToken: async (token: string) => {
    return apiClient.post<void>('/users/push-token', { token });
  },

  triggerPushNotifications: async () => {
    return apiClient.post<void>('/users/push-test', {});
  },


  getCategories: async () => {
    return apiClient.get<any[]>('/categories');
  },
  
  registerOrLogin: async (email: string, displayName: string, photoUrl: string) => {
    return apiClient.post<any>('/users/register-or-login', {
      email,
      displayName,
      photoUrl
    });
  },
  
  ingestNews: async () => {
    return apiClient.post('/admin/news/ingest', {});
  },

  recordInteraction: async (eventId: string, type: 'VIEW' | 'CLICK' | 'BOOKMARK' | 'SHARE' | 'LIKE' | 'SEARCH' | 'READ_COMPLETE', value?: string) => {
    return apiClient.post<void>('/user/interaction', { eventId, type, value });
  }
};
