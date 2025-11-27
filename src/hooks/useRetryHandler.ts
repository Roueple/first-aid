/**
 * useRetryHandler - React hook for retry logic and operation queue
 * 
 * Provides easy access to retry functionality and operation queue
 * management in React components.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  executeWithRetry,
  operationQueue,
  QueuedOperation,
  OperationStatus,
  RetryOptions,
  NETWORK_RETRY_OPTIONS,
  AI_SERVICE_RETRY_OPTIONS,
} from '../utils/RetryHandler';
import { useErrorHandler } from './useErrorHandler';

/**
 * Hook for using retry logic and operation queue
 */
export const useRetryHandler = () => {
  const { showInfo, showWarning, showError } = useErrorHandler();
  const [queuedOperations, setQueuedOperations] = useState<QueuedOperation[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  /**
   * Set up online/offline detection and queue subscription
   */
  useEffect(() => {
    // Handle online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      operationQueue.setOnlineStatus(true);
      
      const pendingCount = operationQueue.getPendingCount();
      if (pendingCount > 0) {
        showInfo(
          `Connection restored. Processing ${pendingCount} queued operation${pendingCount > 1 ? 's' : ''}...`,
          5000
        );
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      operationQueue.setOnlineStatus(false);
      showWarning('Connection lost. Operations will be queued until connection is restored.', 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial online status
    operationQueue.setOnlineStatus(navigator.onLine);

    // Subscribe to queue changes
    const unsubscribe = operationQueue.subscribe((operations) => {
      setQueuedOperations(operations);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, [showInfo, showWarning]);

  /**
   * Execute an operation with retry logic
   * 
   * @param operation - The async operation to execute
   * @param options - Retry configuration options
   * @returns Promise resolving to the operation result
   */
  const retry = useCallback(
    async <T>(
      operation: () => Promise<T>,
      options?: Partial<RetryOptions>
    ): Promise<T> => {
      return executeWithRetry(operation, {
        ...options,
        onRetry: (error, attempt, delay) => {
          console.log(`Retrying operation (attempt ${attempt}) after ${delay}ms`);
          
          // Call custom onRetry if provided
          if (options?.onRetry) {
            options.onRetry(error, attempt, delay);
          }
        },
      });
    },
    []
  );

  /**
   * Execute a network operation with retry logic
   */
  const retryNetwork = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      return retry(operation, NETWORK_RETRY_OPTIONS);
    },
    [retry]
  );

  /**
   * Execute an AI service operation with retry logic
   */
  const retryAI = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      return retry(operation, AI_SERVICE_RETRY_OPTIONS);
    },
    [retry]
  );

  /**
   * Queue an operation for execution when online
   * 
   * @param operation - The async operation to queue
   * @param metadata - Optional metadata about the operation
   * @returns Operation ID
   */
  const queueOperation = useCallback(
    <T>(
      operation: () => Promise<T>,
      metadata?: Record<string, any>
    ): string => {
      try {
        const operationId = operationQueue.enqueue(operation, metadata);
        
        if (!isOnline) {
          showInfo(
            'Operation queued. It will be executed when connection is restored.',
            3000
          );
        }
        
        return operationId;
      } catch (error: any) {
        showError(error.message || 'Failed to queue operation', 5000);
        throw error;
      }
    },
    [isOnline, showInfo, showError]
  );

  /**
   * Cancel a queued operation
   */
  const cancelOperation = useCallback(
    (operationId: string): boolean => {
      const cancelled = operationQueue.cancel(operationId);
      
      if (cancelled) {
        showInfo('Operation cancelled', 2000);
      }
      
      return cancelled;
    },
    [showInfo]
  );

  /**
   * Clear completed and failed operations from the queue
   */
  const clearCompleted = useCallback(() => {
    operationQueue.clearCompleted();
  }, []);

  /**
   * Get the status of a queued operation
   */
  const getOperationStatus = useCallback(
    (operationId: string): QueuedOperation | undefined => {
      return operationQueue.getOperationStatus(operationId);
    },
    []
  );

  /**
   * Get pending operations count
   */
  const pendingCount = operationQueue.getPendingCount();

  /**
   * Get operations by status
   */
  const getOperationsByStatus = useCallback(
    (status: OperationStatus): QueuedOperation[] => {
      return queuedOperations.filter((op) => op.status === status);
    },
    [queuedOperations]
  );

  return {
    // Retry functions
    retry,
    retryNetwork,
    retryAI,
    
    // Queue functions
    queueOperation,
    cancelOperation,
    clearCompleted,
    getOperationStatus,
    getOperationsByStatus,
    
    // Queue state
    queuedOperations,
    pendingCount,
    isOnline,
  };
};

export default useRetryHandler;
