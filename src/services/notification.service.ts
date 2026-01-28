import api from './api';
import { Notification } from '../types';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
}

export const notificationService = {
  getNotifications: async (): Promise<Notification[]> => {
    const response = await api.get<ApiResponse<Notification[]>>('/notifications');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch notifications');
    }
    return response.data.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<{ success: boolean; count?: number; message?: string }>('/notifications/unread-count');
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch unread count');
    }
    return response.data.count || 0;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const response = await api.patch<ApiResponse<Notification>>(`/notifications/${id}/read`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to mark notification as read');
    }
    return response.data.data;
  },

  markAllAsRead: async (): Promise<void> => {
    const response = await api.patch<ApiResponse<void>>('/notifications/read-all');
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to mark all notifications as read');
    }
  },
};

