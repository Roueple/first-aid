/**
 * RetryHandler - Retry logic with exponential backoff for failed operations
 * 
 * Provides retry mechanisms for network errors, AI service failures,
 * and operation queuing for offline scenarios.
 * 
 * Requirements: 12.2, 12.5
 */

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  shouldRetry?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number, delayMs: number) => void;
}

/**
 * Default retry configuration with exponential backoff
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Retry configuration for network operations
 */
export const NETWORK_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  shouldRetry: (error: any) => isNetworkError(error),
};

/**
 * Retry configuration for AI service operations
 */
export const AI_SERVICE_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 2000,
  maxDelayMs: 15000,
  backoffMultiplier: 2.5,
  shouldRetry: (error: any) => isAIServiceError(error),
};

/**
 * Operation status for queued operations
 */
export enum OperationStatus {
  PENDING = 'PENDING',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Queued operation interface
 */
export interface QueuedOperation<T = any> {
  id: string;
  operation: () => Promise<T>;
  status: OperationStatus;
  retryCount: number;
  createdAt: Date;
  lastAttemptAt?: Date;
  error?: Error;
  result?: T;
  metadata?: Record<string, any>;
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: any): boolean {
  const code = error?.code || '';
  const message = error?.message || '';
  
  return (
    code === 'network-request-failed' ||
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('offline') ||
    message.includes('timeout') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ETIMEDOUT')
  );
}

/**
 * Check if an error is an AI service error
 */
export function isAIServiceError(error: any): boolean {
  const code = error?.code || '';
  const message = error?.message || '';
  const status = error?.status || error?.response?.status || 0;
  
  return (
    code === 'ai-service-unavailable' ||
    code === 'rate-limit-exceeded' ||
    status === 429 || // Rate limit
    status === 500 || // Internal server error
    status === 502 || // Bad gateway
    status === 503 || // Service unavailable
    status === 504 || // Gateway timeout
    message.includes('OpenAI') ||
    message.includes('Gemini') ||
    message.includes('AI service') ||
    message.includes('rate limit')
  );
}

/**
 * Check if an error should not be retried
 */
export function shouldNotRetry(error: any): boolean {
  const code = error?.code || '';
  const status = error?.status || error?.response?.status || 0;
  
  // Don't retry on permission denied, not found, or validation errors
  return (
    code === 'permission-denied' ||
    code === 'not-found' ||
    code === 'invalid-argument' ||
    code === 'failed-precondition' ||
    code === 'unauthenticated' ||
    status === 400 || // Bad request
    status === 401 || // Unauthorized
    status === 403 || // Forbidden
    status === 404    // Not found
  );
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  options: RetryOptions
): number {
  const exponentialDelay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs);
  
  // Add jitter (±20%) to prevent thundering herd
  const jitter = cappedDelay * 0.2 * (Math.random() - 0.5);
  
  return Math.floor(cappedDelay + jitter);
}

/**
 * Execute an operation with retry logic and exponential backoff
 * 
 * @param operation - The async operation to execute
 * @param options - Retry configuration options
 * @returns Promise resolving to the operation result
 * @throws The last error if all retries are exhausted
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Execute the operation
      const result = await operation();
      return result;
    } catch (error: any) {
      lastError = error;

      // Check if we should retry this error
      const shouldRetryError = config.shouldRetry
        ? config.shouldRetry(error, attempt)
        : !shouldNotRetry(error);

      // If this was the last attempt or we shouldn't retry, throw the error
      if (attempt === config.maxRetries || !shouldRetryError) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = calculateDelay(attempt, config);

      // Call onRetry callback if provided
      if (config.onRetry) {
        config.onRetry(error, attempt + 1, delay);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // All retries exhausted, throw the last error
  throw lastError;
}

/**
 * OperationQueue - Queue for managing operations when offline
 * 
 * Stores operations in memory and executes them when connection is restored.
 * Operations are executed in FIFO order with retry logic.
 */
export class OperationQueue {
  private queue: Map<string, QueuedOperation> = new Map();
  private isProcessing: boolean = false;
  private isOnline: boolean = true;
  private maxQueueSize: number = 100;
  private listeners: Set<(queue: QueuedOperation[]) => void> = new Set();

  /**
   * Set online status and trigger queue processing if online
   */
  setOnlineStatus(isOnline: boolean): void {
    const wasOffline = !this.isOnline;
    this.isOnline = isOnline;

    // If we just came online, process the queue
    if (isOnline && wasOffline && this.queue.size > 0) {
      console.log(`Connection restored. Processing ${this.queue.size} queued operations...`);
      this.processQueue();
    }
  }

  /**
   * Add an operation to the queue
   * 
   * @param operation - The async operation to queue
   * @param metadata - Optional metadata about the operation
   * @returns Operation ID
   */
  enqueue<T>(
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): string {
    // Check queue size limit
    if (this.queue.size >= this.maxQueueSize) {
      throw new Error('Operation queue is full. Please try again later.');
    }

    const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedOp: QueuedOperation<T> = {
      id,
      operation,
      status: OperationStatus.PENDING,
      retryCount: 0,
      createdAt: new Date(),
      metadata,
    };

    this.queue.set(id, queuedOp);
    this.notifyListeners();

    // If online, start processing immediately
    if (this.isOnline && !this.isProcessing) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Get the status of a queued operation
   */
  getOperationStatus(id: string): QueuedOperation | undefined {
    return this.queue.get(id);
  }

  /**
   * Cancel a queued operation
   */
  cancel(id: string): boolean {
    const operation = this.queue.get(id);
    
    if (!operation) {
      return false;
    }

    // Can only cancel pending operations
    if (operation.status === OperationStatus.PENDING) {
      operation.status = OperationStatus.CANCELLED;
      this.queue.delete(id);
      this.notifyListeners();
      return true;
    }

    return false;
  }

  /**
   * Clear all completed and failed operations from the queue
   */
  clearCompleted(): void {
    const toRemove: string[] = [];
    
    this.queue.forEach((op, id) => {
      if (
        op.status === OperationStatus.COMPLETED ||
        op.status === OperationStatus.FAILED ||
        op.status === OperationStatus.CANCELLED
      ) {
        toRemove.push(id);
      }
    });

    toRemove.forEach((id) => this.queue.delete(id));
    this.notifyListeners();
  }

  /**
   * Get all queued operations
   */
  getAll(): QueuedOperation[] {
    return Array.from(this.queue.values());
  }

  /**
   * Get pending operations count
   */
  getPendingCount(): number {
    return Array.from(this.queue.values()).filter(
      (op) => op.status === OperationStatus.PENDING
    ).length;
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: (queue: QueuedOperation[]) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of queue changes
   */
  private notifyListeners(): void {
    const operations = this.getAll();
    this.listeners.forEach((listener) => {
      try {
        listener(operations);
      } catch (error) {
        console.error('Error in queue listener:', error);
      }
    });
  }

  /**
   * Process all pending operations in the queue
   */
  private async processQueue(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing || !this.isOnline) {
      return;
    }

    this.isProcessing = true;

    try {
      // Get all pending operations
      const pendingOps = Array.from(this.queue.values())
        .filter((op) => op.status === OperationStatus.PENDING)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      for (const op of pendingOps) {
        // Check if still online
        if (!this.isOnline) {
          console.log('Connection lost. Pausing queue processing.');
          break;
        }

        // Skip if operation was cancelled
        if (!this.queue.has(op.id)) {
          continue;
        }

        await this.executeOperation(op);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single queued operation with retry logic
   */
  private async executeOperation(op: QueuedOperation): Promise<void> {
    op.status = OperationStatus.EXECUTING;
    op.lastAttemptAt = new Date();
    this.notifyListeners();

    try {
      // Execute with retry logic
      const result = await executeWithRetry(op.operation, {
        ...NETWORK_RETRY_OPTIONS,
        onRetry: (error, attempt, delay) => {
          op.retryCount = attempt;
          console.log(
            `Retrying operation ${op.id} (attempt ${attempt}/${NETWORK_RETRY_OPTIONS.maxRetries}) after ${delay}ms`
          );
          this.notifyListeners();
        },
      });

      // Operation succeeded
      op.status = OperationStatus.COMPLETED;
      op.result = result;
      this.notifyListeners();

      // Remove from queue after a short delay
      setTimeout(() => {
        this.queue.delete(op.id);
        this.notifyListeners();
      }, 5000);
    } catch (error: any) {
      // Operation failed after all retries
      op.status = OperationStatus.FAILED;
      op.error = error;
      console.error(`Operation ${op.id} failed after ${op.retryCount} retries:`, error);
      this.notifyListeners();
    }
  }

  /**
   * Clear all operations from the queue
   */
  clear(): void {
    this.queue.clear();
    this.notifyListeners();
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.size;
  }
}

// Export singleton instance
export const operationQueue = new OperationQueue();

export default {
  executeWithRetry,
  operationQueue,
  isNetworkError,
  isAIServiceError,
  shouldNotRetry,
};
