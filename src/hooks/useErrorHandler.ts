/**
 * useErrorHandler - React hook for integrating ErrorHandler with components
 * 
 * Provides easy access to error handling functionality in React components.
 */

import { useCallback, useEffect } from 'react';
import { errorHandler, ErrorContext, NotificationType } from '../utils/ErrorHandler';
import { auditService } from '../services/AuditService';
import authService from '../services/AuthService';

/**
 * Hook for using the global error handler
 */
export const useErrorHandler = () => {
  /**
   * Initialize error handler with callbacks
   */
  useEffect(() => {
    // Set up notification callback
    const notificationCallback = (
      message: string,
      type: NotificationType,
      duration?: number
    ) => {
      // Use the global notification function if available
      if ((window as any).__addNotification) {
        (window as any).__addNotification(message, type, duration);
      } else {
        // Fallback to console
        console.warn(`[${type}] ${message}`);
      }
    };

    // Set up error logging callback
    const errorLogCallback = async (error: any, context: ErrorContext) => {
      try {
        const user = authService.getCurrentUser();
        
        // Log error to audit service
        await auditService.logError(
          user?.uid || 'anonymous',
          context.operation,
          {
            category: error.category,
            severity: error.severity,
            message: error.technicalMessage,
            context: context,
            timestamp: error.timestamp,
          }
        );
      } catch (logError) {
        // Don't throw - logging failures shouldn't break the app
        console.error('Failed to log error to audit service:', logError);
      }
    };

    // Register callbacks
    errorHandler.setNotificationCallback(notificationCallback);
    errorHandler.setErrorLogCallback(errorLogCallback);

    // Set up online/offline detection
    const handleOnline = () => errorHandler.setOnlineStatus(true);
    const handleOffline = () => errorHandler.setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial online status
    errorHandler.setOnlineStatus(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Handle an error with context
   */
  const handleError = useCallback(async (error: Error | any, context: ErrorContext) => {
    await errorHandler.handle(error, context);
  }, []);

  /**
   * Show success notification
   */
  const showSuccess = useCallback((message: string, duration?: number) => {
    errorHandler.success(message, duration);
  }, []);

  /**
   * Show info notification
   */
  const showInfo = useCallback((message: string, duration?: number) => {
    errorHandler.info(message, duration);
  }, []);

  /**
   * Show warning notification
   */
  const showWarning = useCallback((message: string, duration?: number) => {
    errorHandler.warning(message, duration);
  }, []);

  /**
   * Show error notification
   */
  const showError = useCallback((message: string, duration?: number) => {
    errorHandler.error(message, duration);
  }, []);

  return {
    handleError,
    showSuccess,
    showInfo,
    showWarning,
    showError,
  };
};

export default useErrorHandler;
