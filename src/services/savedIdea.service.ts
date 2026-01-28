import api from './api';
import { Idea } from '../types';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export const savedIdeaService = {
  saveIdea: async (ideaId: string): Promise<void> => {
    const response = await api.post<ApiResponse<void>>(`/ideas/${ideaId}/save`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to save idea');
    }
  },

  unsaveIdea: async (ideaId: string): Promise<void> => {
    const response = await api.delete<ApiResponse<void>>(`/ideas/${ideaId}/save`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to unsave idea');
    }
  },

  getSavedIdeas: async (): Promise<Idea[]> => {
    const response = await api.get<ApiResponse<Idea[]>>('/saved');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch saved ideas');
    }
    return response.data.data;
  },

  checkSavedStatus: async (ideaId: string): Promise<boolean> => {
    const response = await api.get<ApiResponse<{ isSaved: boolean }>>(`/ideas/${ideaId}/saved-status`);
    if (!response.data.success || response.data.data === undefined) {
      return false;
    }
    return response.data.data.isSaved;
  },
};

