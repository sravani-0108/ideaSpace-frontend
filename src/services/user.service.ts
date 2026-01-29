import api from './api';
import { User } from '../types';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
}

export const userService = {
  getProfile: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>('/users/profile');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to get profile');
    }
    return response.data.data;
  },

  updateProfile: async (data: UpdateProfileData, profilePicture?: File): Promise<User> => {
    const formData = new FormData();
    
    // Add text fields
    if (data.firstName !== undefined) {
      formData.append('firstName', data.firstName);
    }
    if (data.lastName !== undefined) {
      formData.append('lastName', data.lastName);
    }
    
    // Add file if provided
    if (profilePicture) {
      formData.append('profilePicture', profilePicture);
    }

    const response = await api.put<ApiResponse<User>>('/users/profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update profile');
    }
    return response.data.data;
  },

  uploadProfilePicture: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append('profilePicture', file);

    const response = await api.post<ApiResponse<User>>('/users/profile/picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to upload profile picture');
    }
    return response.data.data;
  },

  getUserById: async (userId: string): Promise<User> => {
    const response = await api.get<ApiResponse<User>>(`/users/${userId}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to get user');
    }
    return response.data.data;
  },
};

