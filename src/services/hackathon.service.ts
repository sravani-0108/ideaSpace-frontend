import api from './api';
import { Hackathon, HackathonStatus } from '../types';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export const hackathonService = {
  createHackathon: async (data: {
    title: string;
    purpose: string;
    description?: string;
    startDate: string;
    endDate: string;
    registrationDeadline?: string;
    location: string;
    onlineLink?: string;
  }): Promise<Hackathon> => {
    const response = await api.post<ApiResponse<Hackathon>>('/hackathons', data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to create hackathon');
    }
    return response.data.data;
  },

  getAllHackathons: async (): Promise<Hackathon[]> => {
    const response = await api.get<ApiResponse<Hackathon[]>>('/hackathons');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch hackathons');
    }
    return response.data.data;
  },

  getHackathonById: async (id: string): Promise<Hackathon> => {
    const response = await api.get<ApiResponse<Hackathon>>(`/hackathons/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch hackathon');
    }
    return response.data.data;
  },

  getNextHackathon: async (): Promise<Hackathon | null> => {
    const response = await api.get<ApiResponse<Hackathon | null>>('/hackathons/next');
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch next hackathon');
    }
    return response.data.data || null;
  },

  updateHackathon: async (id: string, data: Partial<{
    title: string;
    purpose: string;
    startDate: string;
    endDate: string;
    location: string;
  }>): Promise<Hackathon> => {
    const response = await api.put<ApiResponse<Hackathon>>(`/hackathons/${id}`, data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update hackathon');
    }
    return response.data.data;
  },

  updateStatus: async (id: string, status: HackathonStatus): Promise<Hackathon> => {
    const response = await api.patch<ApiResponse<Hackathon>>(`/hackathons/${id}/status`, { status });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update hackathon status');
    }
    return response.data.data;
  },

  deleteHackathon: async (id: string): Promise<void> => {
    const response = await api.delete<ApiResponse<void>>(`/hackathons/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete hackathon');
    }
  },

  sendReminders: async (id: string): Promise<{ sent: number; skipped: number; failed: number }> => {
    const response = await api.post<ApiResponse<{ sent: number; skipped: number; failed: number }>>(`/hackathons/${id}/send-reminders`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to send reminders');
    }
    return response.data.data;
  },
};

