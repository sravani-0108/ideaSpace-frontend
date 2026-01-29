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

interface CommentsResponse {
  comments: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const commentService = {
  createComment: async (ideaId: string, data: CreateCommentData): Promise<Comment> => {
    const response = await api.post<ApiResponse<Comment>>(`/ideas/${ideaId}/comments`, data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to create comment');
    }
    return response.data.data;
  },

  getCommentsByUserId: async (userId: string, page: number = 1, limit: number = 10): Promise<Comment[]> => {
    const response = await api.get<ApiResponse<CommentsResponse>>(`/users/${userId}/comments?page=${page}&limit=${limit}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch user comments');
    }
    return response.data.data.comments;
  },
};

