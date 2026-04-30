import { apiClient } from './client';
import { Bite } from '../types';

export const getBiteById = async (id: number): Promise<Bite> => {
  return apiClient.get<Bite>(`/bites/${id}`);
};

export const getBitesFeed = async (params: { page: number; size: number; filter?: string }): Promise<any> => {
  const { page, size, filter } = params;
  const endpoint = filter === 'foryou' ? '/bites/foryou' : '/bites';
  return apiClient.get(`${endpoint}?page=${page}&size=${size}`);
};
