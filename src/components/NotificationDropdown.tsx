import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../services/notification.service';
import { Notification, NotificationType } from '../types';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
}

const NotificationDropdown = ({ isOpen, onClose, onMarkAllRead }: NotificationDropdownProps) => {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isNavigatingRef = useRef(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if we're navigating
      if (isNavigatingRef.current) {
        console.log('🚫 Ignoring outside click - navigation in progress');
        return;
      }
      
      const target = event.target as Node;
      // Check if click is outside the dropdown
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        // Also check if click is not on the notification bell button
        const bellButton = document.querySelector('[aria-label="Notifications"]');
        if (!bellButton || !bellButton.contains(target)) {
          console.log('🔒 Closing dropdown - outside click detected');
          onClose();
        }
      }
    };

    if (isOpen) {
      // Use a longer delay to ensure click handlers execute first
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside, true); // Use capture phase
      }, 300);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside, true);
      };
    }
  }, [isOpen, onClose]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (e: React.MouseEvent, notification: Notification) => {
    console.log('🔔 Notification clicked:', {
      id: notification.id,
      type: notification.type,
      isRead: notification.isRead,
      ideaId: notification.ideaId,
      hackathonId: notification.hackathonId,
      notification
    });
    
    // Stop all event propagation immediately
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    console.log('✅ Event propagation stopped');
    
    // Mark as read if not already read
    if (!notification.isRead) {
      console.log('📝 Marking notification as read...');
      try {
        const result = await notificationService.markAsRead(notification.id);
        console.log('✅ Notification marked as read successfully:', result);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
        // Refresh count immediately and wait for it
        console.log('🔄 Refreshing unread count...');
        await onMarkAllRead();
        console.log('✅ Unread count refreshed');
      } catch (error) {
        console.error('❌ Failed to mark notification as read:', error);
      }
    } else {
      console.log('ℹ️ Notification already read, skipping mark as read');
    }
    
    // Determine navigation path first
    let navigationPath: string | null = null;
    
    console.log('🧭 Determining navigation path...');
    try {
      switch (notification.type) {
        case NotificationType.HACKATHON_REMINDER:
        case NotificationType.HACKATHON_REGISTRATION:
          console.log('📍 Notification type:', notification.type);
          // Navigate to hackathon details page
          if (notification.hackathonId) {
            navigationPath = `/hackathons/${notification.hackathonId}`;
            console.log('✅ Navigation path set:', navigationPath);
          } else {
            console.warn('⚠️ Hackathon notification missing hackathonId');
          }
          break;
        
        case NotificationType.COMMENT:
        case NotificationType.LIKE:
        case NotificationType.IDEA_APPROVED:
        case NotificationType.IDEA_REJECTED:
          console.log('📍 Notification type:', notification.type);
          // Navigate to idea details page
          if (notification.ideaId) {
            navigationPath = `/ideas/${notification.ideaId}`;
            console.log('✅ Navigation path set:', navigationPath);
          } else {
            console.warn('⚠️ Idea notification missing ideaId');
          }
          break;
        
        default:
          console.log('📍 Notification type: DEFAULT (fallback)');
          // Fallback: try to navigate to idea if ideaId exists
          if (notification.ideaId) {
            navigationPath = `/ideas/${notification.ideaId}`;
            console.log('✅ Navigation path set (fallback - idea):', navigationPath);
          } else if (notification.hackathonId) {
            navigationPath = `/hackathons/${notification.hackathonId}`;
            console.log('✅ Navigation path set (fallback - hackathon):', navigationPath);
          } else {
            console.warn('⚠️ Notification missing both ideaId and hackathonId');
          }
      }
    } catch (error) {
      console.error('❌ Failed to determine navigation path:', error);
    }
    
    // Navigate immediately (before closing dropdown to ensure navigation happens)
    if (navigationPath) {
      console.log('🚀 Navigating to:', navigationPath);
      isNavigatingRef.current = true;
      try {
        navigate(navigationPath);
        console.log('✅ Navigation called successfully');
        
        // Close dropdown after navigation is initiated
        setTimeout(() => {
          console.log('🔒 Closing dropdown...');
          onClose();
          console.log('✅ Dropdown closed');
          // Reset navigation flag after a delay
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 500);
        }, 150);
      } catch (error) {
        console.error('❌ Navigation failed:', error);
        isNavigatingRef.current = false;
        onClose();
      }
    } else {
      console.error('❌ No navigation path determined, cannot navigate');
      onClose();
    }
  };

  const handleMarkAllRead = async () => {
    console.log('📝 Marking all notifications as read...');
    try {
      await notificationService.markAllAsRead();
      console.log('✅ All notifications marked as read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      onMarkAllRead();
      console.log('✅ Unread count refreshed');
    } catch (error) {
      console.error('❌ Failed to mark all as read:', error);
    }
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case NotificationType.COMMENT:
        return 'commented on your idea';
      case NotificationType.LIKE:
        return 'liked your idea';
      case NotificationType.HACKATHON_REMINDER:
        return 'Hackathon reminder';
      case NotificationType.HACKATHON_REGISTRATION:
        return 'You have successfully registered for the hackathon';
      case NotificationType.IDEA_APPROVED:
        return 'Your idea has been approved';
      case NotificationType.IDEA_REJECTED:
        return 'Your idea has been rejected';
      default:
        return 'interacted with your idea';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      data-notification-dropdown
      className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col"
    >
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNotificationClick(e, notification);
                }}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                  !notification.isRead ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                      !notification.isRead ? 'bg-blue-600' : 'bg-transparent'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {notification.type === NotificationType.HACKATHON_REMINDER ? (
                        <>
                          <span className="font-medium">Reminder:</span>{' '}
                          {getNotificationText(notification)}
                        </>
                      ) : notification.type === NotificationType.HACKATHON_REGISTRATION ? (
                        <>
                          <span className="font-medium text-green-600">✓ Success:</span>{' '}
                          {getNotificationText(notification)}
                        </>
                      ) : notification.type === NotificationType.IDEA_APPROVED || notification.type === NotificationType.IDEA_REJECTED ? (
                        <>
                          <span className="font-medium text-green-600">
                            {notification.type === NotificationType.IDEA_APPROVED ? '✓ Approved' : '✗ Rejected'}
                          </span>
                          {' '}
                          {getNotificationText(notification)}
                        </>
                      ) : (
                        <>
                          <span className="font-medium">Someone</span>{' '}
                          {getNotificationText(notification)}
                        </>
                      )}
                    </p>
                    {notification.idea && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        "{notification.idea.title}"
                      </p>
                    )}
                    {notification.hackathon && (
                      <div className="text-xs text-gray-500 mt-1">
                        <p className="font-medium truncate">"{notification.hackathon.title}"</p>
                        <p className="text-gray-400 mt-0.5">
                          {new Date(notification.hackathon.startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })} • {notification.hackathon.location}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;

