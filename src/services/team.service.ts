import api from './api';
import { Team, HackathonRegistration } from '../types';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export const teamService = {
  createTeam: async (hackathonId: string, name: string, description?: string): Promise<Team> => {
    const response = await api.post<ApiResponse<Team>>(`/hackathons/${hackathonId}/teams`, { name, description });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to create team');
    }
    return response.data.data;
  },

  getTeamsByHackathon: async (hackathonId: string): Promise<Team[]> => {
    const response = await api.get<ApiResponse<Team[]>>(`/hackathons/${hackathonId}/teams`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch teams');
    }
    return response.data.data;
  },

  getTeamById: async (id: string): Promise<Team> => {
    const response = await api.get<ApiResponse<Team>>(`/teams/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch team');
    }
    return response.data.data;
  },

  getTeamMembers: async (teamId: string): Promise<HackathonRegistration[]> => {
    const response = await api.get<ApiResponse<HackathonRegistration[]>>(`/teams/${teamId}/members`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch team members');
    }
    return response.data.data;
  },

  addMemberToTeam: async (teamId: string, userId: string, hackathonId: string): Promise<void> => {
    const response = await api.post<ApiResponse<void>>(`/teams/${teamId}/members`, { userId, hackathonId });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to add member to team');
    }
  },

  removeMemberFromTeam: async (teamId: string, userId: string): Promise<void> => {
    const response = await api.delete<ApiResponse<void>>(`/teams/${teamId}/members/${userId}`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to remove member from team');
    }
  },

  updateTeam: async (id: string, name?: string, description?: string): Promise<Team> => {
    const response = await api.put<ApiResponse<Team>>(`/teams/${id}`, { name, description });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update team');
    }
    return response.data.data;
  },

  deleteTeam: async (id: string): Promise<void> => {
    const response = await api.delete<ApiResponse<void>>(`/teams/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete team');
    }
  },
};

