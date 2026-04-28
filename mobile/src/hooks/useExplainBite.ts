import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface ExplainResponse {
  explanation: string;
}

export const useExplainBite = () => {
  return useMutation({
    mutationFn: async (biteId: number) => {
      // Calls the Spring Boot AI endpoint to summarize or explain the bite
      // We assume the backend exposes a dedicated POST /api/v1/bites/explain
      return apiClient.post<ExplainResponse>('/bites/explain', { biteId });
    }
  });
};
