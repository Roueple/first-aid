/**
 * NotificationSystem - Toast notification component for displaying messages
 * 
 * Provides a centralized notification system for success, info, warning, and error messages.
 * Integrates with the ErrorHandler for displaying user-friendly error messages.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { NotificationType } from '../utils/ErrorHandler';

/**
 * Notification interface
 */
interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration: number;
}

/**
 * NotificationSystem component
 */
export const NotificationSystem: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  /**
   * Add a new notification
   */
  const addNotification = useCallback(
    (message: string, type: NotificationType, duration: number = 5000) => {
      const id = `notification-${Date.now()}-${Math.random()}`;
      const notification: Notification = { id, message, type, duration };

      setNotifications((prev) => [...prev, notification]);

      // Auto-remove after duration
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    },
    []
  );

  /**
   * Remove a notification
   */
  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  /**
   * Get icon for notification type
   */
  const getIcon = (type: NotificationType): string => {
    switch (type) {
      case NotificationType.SUCCESS:
        return '✓';
      case NotificationType.INFO:
        return 'ℹ';
      case NotificationType.WARNING:
        return '⚠';
      case NotificationType.ERROR:
        return '✕';
      default:
        return 'ℹ';
    }
  };

  /**
   * Get styles for notification type
   */
  const getStyles = (type: NotificationType): string => {
    const baseStyles = 'flex items-start gap-3 p-4 rounded-lg shadow-lg border';
    
    switch (type) {
      case NotificationType.SUCCESS:
        return `${baseStyles} bg-green-50 border-green-200 text-green-800`;
      case NotificationType.INFO:
        return `${baseStyles} bg-blue-50 border-blue-200 text-blue-800`;
      case NotificationType.WARNING:
        return `${baseStyles} bg-yellow-50 border-yellow-200 text-yellow-800`;
      case NotificationType.ERROR:
        return `${baseStyles} bg-red-50 border-red-200 text-red-800`;
      default:
        return `${baseStyles} bg-gray-50 border-gray-200 text-gray-800`;
    }
  };

  /**
   * Get icon styles for notification type
   */
  const getIconStyles = (type: NotificationType): string => {
    const baseStyles = 'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm';
    
    switch (type) {
      case NotificationType.SUCCESS:
        return `${baseStyles} bg-green-200 text-green-800`;
      case NotificationType.INFO:
        return `${baseStyles} bg-blue-200 text-blue-800`;
      case NotificationType.WARNING:
        return `${baseStyles} bg-yellow-200 text-yellow-800`;
      case NotificationType.ERROR:
        return `${baseStyles} bg-red-200 text-red-800`;
      default:
        return `${baseStyles} bg-gray-200 text-gray-800`;
    }
  };

  // Expose addNotification globally for ErrorHandler
  useEffect(() => {
    // Store the function in window for global access
    (window as any).__addNotification = addNotification;

    return () => {
      delete (window as any).__addNotification;
    };
  }, [addNotification]);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getStyles(notification.type)} animate-slide-in-right`}
          role="alert"
        >
          <div className={getIconStyles(notification.type)}>
            {getIcon(notification.type)}
          </div>
          <div className="flex-1 text-sm">{notification.message}</div>
          <button
            onClick={() => removeNotification(notification.id)}
            className="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity"
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;
