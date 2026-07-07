import { apiClient } from './client';

export interface UserCollection {
  id: number;
  userId: number;
  name: string;
  description: string;
  isAutoUpdating: boolean;
  queryCriteriaJson: string | null;
  createdAt: string;
}

export const collectionsApi = {
  createCollection: async (params: {
    name: string;
    description: string;
    isAutoUpdating: boolean;
    queryCriteria?: any[];
  }): Promise<UserCollection> => {
    return apiClient.post<UserCollection>('/user/collection', params);
  },
};
