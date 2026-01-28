import api from './api';
import { Comment } from '../types';

export interface CreateCommentData {
  content: string;
  parentId?: string; // Optional: if provided, this is a reply to another comment
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export const commentService = {
  createComment: async (ideaId: string, data: CreateCommentData): Promise<Comment> => {
    const response = await api.post<ApiResponse<Comment>>(`/ideas/${ideaId}/comments`, data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to create comment');
    }
    return response.data.data;
  },
};

