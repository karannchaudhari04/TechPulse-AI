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

  updateStreak: async () => {
    return apiClient.post<number>('/users/streak/update', {});
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
    return apiClient.post('/bites/admin/news/ingest', {});
  }
};
