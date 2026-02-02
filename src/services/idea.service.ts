import api from './api';
import { Idea, Comment } from '../types';

export interface CreateIdeaData {
  title: string;
  description: string;
  hackathonId?: string;
  gitRepositoryUrl?: string;
  documentationUrl?: string;
  videoUrl?: string;
  zipFilePath?: string;
  documentationFile?: File;
  videoFile?: File;
  zipFile?: File;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

interface IdeasResponse {
  ideas: Idea[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const ideaService = {
  getApprovedIdeas: async (): Promise<Idea[]> => {
    // Use feed endpoint to get PUBLISHED ideas (visible in feed)
    const response = await api.get<ApiResponse<IdeasResponse>>('/ideas/feed');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch ideas');
    }
    return response.data.data.ideas;
  },

  getAllApprovedIdeas: async (): Promise<Idea[]> => {
    // Use legacy endpoint to get APPROVED ideas (includes APPROVED and PUBLISHED)
    const response = await api.get<ApiResponse<IdeasResponse>>('/ideas/');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch ideas');
    }
    return response.data.data.ideas;
  },

  getMyIdeas: async (): Promise<Idea[]> => {
    const response = await api.get<ApiResponse<IdeasResponse>>('/ideas/my-ideas');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch your ideas');
    }
    return response.data.data.ideas;
  },

  getIdeaById: async (id: string): Promise<Idea & { comments?: Comment[] }> => {
    const response = await api.get<ApiResponse<Idea & { comments?: Comment[] }>>(`/ideas/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch idea');
    }
    return response.data.data;
  },

  createIdea: async (data: CreateIdeaData): Promise<Idea> => {
    // Check if we have files to upload - use FormData if files exist
    const hasFiles = data.documentationFile || data.videoFile || data.zipFile;
    
    if (hasFiles) {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      if (data.hackathonId) {
        formData.append('hackathonId', data.hackathonId);
      }
      if (data.gitRepositoryUrl) {
        formData.append('gitRepositoryUrl', data.gitRepositoryUrl);
      }
      if (data.documentationFile) {
        formData.append('documentation', data.documentationFile);
      } else if (data.documentationUrl) {
        formData.append('documentationUrl', data.documentationUrl);
      }
      if (data.videoFile) {
        formData.append('video', data.videoFile);
      } else if (data.videoUrl) {
        formData.append('videoUrl', data.videoUrl);
      }
      if (data.zipFile) {
        formData.append('zipFile', data.zipFile);
      } else if (data.zipFilePath) {
        formData.append('zipFilePath', data.zipFilePath);
      }
      
      const response = await api.post<ApiResponse<Idea>>('/ideas', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to create idea');
      }
      return response.data.data;
    } else {
      // No files - use regular JSON
      const response = await api.post<ApiResponse<Idea>>('/ideas', data);
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to create idea');
      }
      return response.data.data;
    }
  },

  getIdeasByUserId: async (userId: string, page: number = 1, limit: number = 10): Promise<Idea[]> => {
    const response = await api.get<ApiResponse<IdeasResponse>>(`/ideas/user/${userId}?page=${page}&limit=${limit}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch user ideas');
    }
    return response.data.data.ideas;
  },

  getHandsOnHackathonIdeas: async (hackathonId: string, page: number = 1, limit: number = 10): Promise<Idea[]> => {
    const response = await api.get<ApiResponse<IdeasResponse>>(`/ideas/hackathon/${hackathonId}?page=${page}&limit=${limit}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch hackathon ideas');
    }
    return response.data.data.ideas;
  },
};

