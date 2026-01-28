import api from './api';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export const likeService = {
  likeIdea: async (ideaId: string): Promise<void> => {
    const response = await api.post<ApiResponse<void>>(`/ideas/${ideaId}/like`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to like idea');
    }
  },

  unlikeIdea: async (ideaId: string): Promise<void> => {
    const response = await api.delete<ApiResponse<void>>(`/ideas/${ideaId}/like`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to unlike idea');
    }
  },
};

