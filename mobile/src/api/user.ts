import { apiClient } from './client';

export const userApi = {
  savePreferences: async (categories: string[]) => {
    return apiClient.post('/users/preferences', { categories });
  },

  getPreferences: async () => {
    return apiClient.get<string[]>('/users/preferences');
  },
  
  registerOrLogin: async (email: string, displayName: string, photoUrl: string) => {
    return apiClient.post<any>('/users/register-or-login', {
      email,
      displayName,
      photoUrl
    });
  }
};
