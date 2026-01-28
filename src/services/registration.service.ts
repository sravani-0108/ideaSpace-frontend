import api from './api';
import { HackathonRegistration } from '../types';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export const registrationService = {
  registerForHackathon: async (hackathonId: string): Promise<HackathonRegistration> => {
    const response = await api.post<ApiResponse<HackathonRegistration>>(`/hackathons/${hackathonId}/register`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to register for hackathon');
    }
    return response.data.data;
  },

  unregisterFromHackathon: async (hackathonId: string): Promise<void> => {
    const response = await api.delete<ApiResponse<void>>(`/hackathons/${hackathonId}/register`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to unregister from hackathon');
    }
  },

  getUserRegistrations: async (): Promise<HackathonRegistration[]> => {
    const response = await api.get<ApiResponse<HackathonRegistration[]>>('/registrations');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch registrations');
    }
    return response.data.data;
  },

  getHackathonRegistrations: async (hackathonId: string): Promise<HackathonRegistration[]> => {
    const response = await api.get<ApiResponse<HackathonRegistration[]>>(`/hackathons/${hackathonId}/registrations`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch hackathon registrations');
    }
    return response.data.data;
  },

  checkRegistrationStatus: async (hackathonId: string): Promise<boolean> => {
    const response = await api.get<ApiResponse<{ isRegistered: boolean }>>(`/hackathons/${hackathonId}/registration-status`);
    if (!response.data.success || response.data.data === undefined) {
      return false;
    }
    return response.data.data.isRegistered;
  },
};

