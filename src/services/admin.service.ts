import api from './api';
import { Idea } from '../types';

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

export const adminService = {
  getIdeasForReview: async (): Promise<Idea[]> => {
    const response = await api.get<ApiResponse<IdeasResponse>>('/admin/ideas/review');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch ideas for review');
    }
    return response.data.data.ideas;
  },

  approveIdea: async (id: string, data?: { projectDeadline?: string }): Promise<Idea> => {
    // Approve the idea with optional project deadline
    const approveResponse = await api.patch<ApiResponse<Idea>>(`/admin/ideas/${id}/approve`, data || {});
    if (!approveResponse.data.success || !approveResponse.data.data) {
      throw new Error(approveResponse.data.message || 'Failed to approve idea');
    }
    
    // For Hands-On hackathons, don't auto-publish (they need project submission)
    // For regular ideas, auto-publish so they appear in the feed
    const idea = approveResponse.data.data;
    if (!idea.hackathonId) {
      try {
        const publishResponse = await api.patch<ApiResponse<Idea>>(`/admin/ideas/${id}/publish`);
        if (publishResponse.data.success && publishResponse.data.data) {
          return publishResponse.data.data;
        }
      } catch (error) {
        // If publish fails, return the approved idea
      }
    }
    
    return approveResponse.data.data;
  },

  rejectIdea: async (id: string, data?: { rejectionReason?: string }): Promise<Idea> => {
    const response = await api.patch<ApiResponse<Idea>>(`/admin/ideas/${id}/reject`, data || {});
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to reject idea');
    }
    return response.data.data;
  },

  updateIdeaStatus: async (id: string, status: string, data?: { rejectionReason?: string; projectDeadline?: string; statusDeadline?: string }): Promise<Idea> => {
    // Handle Hands-On hackathon specific statuses
    const handsOnStatuses = ['UNDER_REVIEW', 'PITCHING', 'ENHANCEMENTS', 'IMPLEMENTATION', 'COMPLETED', 'REJECTED'];
    
    if (handsOnStatuses.includes(status)) {
      const response = await api.patch<ApiResponse<Idea>>(`/admin/ideas/${id}/status`, {
        status,
        statusDeadline: data?.statusDeadline,
        rejectionReason: data?.rejectionReason,
      });
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to update idea status');
      }
      return response.data.data;
    }
    
    // Handle legacy statuses
    if (status === 'APPROVED') {
      return await adminService.approveIdea(id, { projectDeadline: data?.projectDeadline });
    } else if (status === 'REJECTED') {
      return await adminService.rejectIdea(id, { rejectionReason: data?.rejectionReason });
    } else if (status === 'PUBLISHED') {
      const response = await api.patch<ApiResponse<Idea>>(`/admin/ideas/${id}/publish`);
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to publish idea');
      }
      return response.data.data;
    }
    throw new Error('Invalid status');
  },
};

