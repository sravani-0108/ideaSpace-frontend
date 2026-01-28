import api from './api';
import { Meeting } from '../types';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export const meetingService = {
  createMeeting: async (
    hackathonId: string,
    data: {
      title: string;
      description?: string;
      scheduledDate: string;
      meetingLink?: string;
      teamId?: string;
    }
  ): Promise<Meeting> => {
    const response = await api.post<ApiResponse<Meeting>>(`/hackathons/${hackathonId}/meetings`, data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to create meeting');
    }
    return response.data.data;
  },

  getHackathonMeetings: async (hackathonId: string): Promise<Meeting[]> => {
    const response = await api.get<ApiResponse<Meeting[]>>(`/hackathons/${hackathonId}/meetings`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch meetings');
    }
    return response.data.data;
  },

  getTeamMeetings: async (teamId: string): Promise<Meeting[]> => {
    const response = await api.get<ApiResponse<Meeting[]>>(`/teams/${teamId}/meetings`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch team meetings');
    }
    return response.data.data;
  },

  getUserMeetings: async (): Promise<Meeting[]> => {
    const response = await api.get<ApiResponse<Meeting[]>>('/meetings');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch user meetings');
    }
    return response.data.data;
  },

  updateMeeting: async (
    id: string,
    data: {
      title?: string;
      description?: string;
      scheduledDate?: string;
      meetingLink?: string;
    }
  ): Promise<Meeting> => {
    const response = await api.put<ApiResponse<Meeting>>(`/meetings/${id}`, data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update meeting');
    }
    return response.data.data;
  },

  deleteMeeting: async (id: string): Promise<void> => {
    const response = await api.delete<ApiResponse<void>>(`/meetings/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete meeting');
    }
  },
};

