import api from './api';
import { AuthResponse } from '../types';

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface VerifyEmailData {
  email: string;
  otp: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export const authService = {
  register: async (data: RegisterData): Promise<void> => {
    const response = await api.post<ApiResponse<void>>('/auth/register', data);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Registration failed');
    }
  },

  verifyEmail: async (data: VerifyEmailData): Promise<void> => {
    const response = await api.post<ApiResponse<null>>('/auth/verify-email', data);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Email verification failed');
    }
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Login failed');
    }
    return response.data.data;
  },

  resendOTP: async (email: string): Promise<void> => {
    const response = await api.post<ApiResponse<void>>('/auth/resend-otp', { email });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to resend OTP');
    }
  },
};

