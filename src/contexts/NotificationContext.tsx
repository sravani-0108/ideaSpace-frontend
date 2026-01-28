import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { notificationService } from '../services/notification.service';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  unreadCount: number;
  refreshCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshCount = useCallback(async () => {
    console.log('🔄 Refreshing unread count...', { isAuthenticated });
    if (!isAuthenticated) {
      console.log('ℹ️ User not authenticated, setting count to 0');
      setUnreadCount(0);
      return;
    }

    try {
      const count = await notificationService.getUnreadCount();
      console.log('✅ Unread count fetched:', count);
      setUnreadCount(count);
    } catch (error) {
      console.error('❌ Failed to load unread count:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshCount();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(refreshCount, 30000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [isAuthenticated, refreshCount]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

