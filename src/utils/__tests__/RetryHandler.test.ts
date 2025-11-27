/**
 * Tests for RetryHandler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  executeWithRetry,
  operationQueue,
  isNetworkError,
  isAIServiceError,
  shouldNotRetry,
  OperationStatus,
  DEFAULT_RETRY_OPTIONS,
  NETWORK_RETRY_OPTIONS,
  AI_SERVICE_RETRY_OPTIONS,
} from '../RetryHandler';

describe('RetryHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    operationQueue.clear();
  });

  describe('executeWithRetry', () => {
    it('should execute operation successfully on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await executeWithRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on network error and succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce('success');
      
      const result = await executeWithRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      const error = new Error('persistent error');
      const operation = vi.fn().mockRejectedValue(error);
      
      await expect(
        executeWithRetry(operation, {
          maxRetries: 2,
          initialDelayMs: 10,
          maxDelayMs: 100,
          backoffMultiplier: 2,
        })
      ).rejects.toThrow('persistent error');
      
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry on permission denied error', async () => {
      const error = { code: 'permission-denied', message: 'Access denied' };
      const operation = vi.fn().mockRejectedValue(error);
      
      await expect(
        executeWithRetry(operation, {
          maxRetries: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
          backoffMultiplier: 2,
        })
      ).rejects.toEqual(error);
      
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn();
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('error 1'))
        .mockResolvedValueOnce('success');
      
      await executeWithRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
        onRetry,
      });
      
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        expect.any(Error),
        1,
        expect.any(Number)
      );
    });

    it('should use custom shouldRetry function', async () => {
      const shouldRetry = vi.fn().mockReturnValue(false);
      const operation = vi.fn().mockRejectedValue(new Error('error'));
      
      await expect(
        executeWithRetry(operation, {
          maxRetries: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
          backoffMultiplier: 2,
          shouldRetry,
        })
      ).rejects.toThrow('error');
      
      expect(operation).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 0);
    });

    it('should apply exponential backoff', async () => {
      const delays: number[] = [];
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('error 1'))
        .mockRejectedValueOnce(new Error('error 2'))
        .mockResolvedValueOnce('success');
      
      const startTime = Date.now();
      
      await executeWithRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
        onRetry: (error, attempt, delay) => {
          delays.push(delay);
        },
      });
      
      const totalTime = Date.now() - startTime;
      
      // Should have 2 delays (for 2 retries)
      expect(delays).toHaveLength(2);
      
      // First delay should be around 100ms (±20% jitter)
      expect(delays[0]).toBeGreaterThanOrEqual(80);
      expect(delays[0]).toBeLessThanOrEqual(120);
      
      // Second delay should be around 200ms (±20% jitter)
      expect(delays[1]).toBeGreaterThanOrEqual(160);
      expect(delays[1]).toBeLessThanOrEqual(240);
      
      // Total time should be at least the sum of delays
      expect(totalTime).toBeGreaterThanOrEqual(delays[0] + delays[1]);
    });
  });

  describe('Error detection functions', () => {
    describe('isNetworkError', () => {
      it('should detect network errors by code', () => {
        expect(isNetworkError({ code: 'network-request-failed' })).toBe(true);
        expect(isNetworkError({ code: 'unavailable' })).toBe(true);
        expect(isNetworkError({ code: 'deadline-exceeded' })).toBe(true);
      });

      it('should detect network errors by message', () => {
        expect(isNetworkError({ message: 'network error' })).toBe(true);
        expect(isNetworkError({ message: 'connection failed' })).toBe(true);
        expect(isNetworkError({ message: 'offline' })).toBe(true);
        expect(isNetworkError({ message: 'timeout' })).toBe(true);
      });

      it('should not detect non-network errors', () => {
        expect(isNetworkError({ code: 'permission-denied' })).toBe(false);
        expect(isNetworkError({ message: 'validation error' })).toBe(false);
      });
    });

    describe('isAIServiceError', () => {
      it('should detect AI service errors by code', () => {
        expect(isAIServiceError({ code: 'ai-service-unavailable' })).toBe(true);
        expect(isAIServiceError({ code: 'rate-limit-exceeded' })).toBe(true);
      });

      it('should detect AI service errors by status', () => {
        expect(isAIServiceError({ status: 429 })).toBe(true);
        expect(isAIServiceError({ status: 500 })).toBe(true);
        expect(isAIServiceError({ status: 502 })).toBe(true);
        expect(isAIServiceError({ status: 503 })).toBe(true);
        expect(isAIServiceError({ status: 504 })).toBe(true);
      });

      it('should detect AI service errors by message', () => {
        expect(isAIServiceError({ message: 'OpenAI error' })).toBe(true);
        expect(isAIServiceError({ message: 'Gemini unavailable' })).toBe(true);
        expect(isAIServiceError({ message: 'AI service down' })).toBe(true);
      });

      it('should not detect non-AI errors', () => {
        expect(isAIServiceError({ status: 404 })).toBe(false);
        expect(isAIServiceError({ message: 'database error' })).toBe(false);
      });
    });

    describe('shouldNotRetry', () => {
      it('should not retry permission errors', () => {
        expect(shouldNotRetry({ code: 'permission-denied' })).toBe(true);
        expect(shouldNotRetry({ status: 403 })).toBe(true);
      });

      it('should not retry not found errors', () => {
        expect(shouldNotRetry({ code: 'not-found' })).toBe(true);
        expect(shouldNotRetry({ status: 404 })).toBe(true);
      });

      it('should not retry validation errors', () => {
        expect(shouldNotRetry({ code: 'invalid-argument' })).toBe(true);
        expect(shouldNotRetry({ status: 400 })).toBe(true);
      });

      it('should retry network errors', () => {
        expect(shouldNotRetry({ code: 'unavailable' })).toBe(false);
        expect(shouldNotRetry({ status: 500 })).toBe(false);
      });
    });
  });

  describe('OperationQueue', () => {
    it('should enqueue operations', () => {
      const operation = vi.fn().mockResolvedValue('result');
      
      const id = operationQueue.enqueue(operation, { description: 'Test op' });
      
      expect(id).toBeDefined();
      expect(operationQueue.size()).toBe(1);
      
      const op = operationQueue.getOperationStatus(id);
      expect(op).toBeDefined();
      expect(op?.status).toBe(OperationStatus.PENDING);
      expect(op?.metadata?.description).toBe('Test op');
    });

    it('should process queue when online', async () => {
      const operation = vi.fn().mockResolvedValue('result');
      
      operationQueue.setOnlineStatus(true);
      const id = operationQueue.enqueue(operation);
      
      // Wait for operation to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const op = operationQueue.getOperationStatus(id);
      expect(op?.status).toBe(OperationStatus.COMPLETED);
      expect(operation).toHaveBeenCalled();
    });

    it('should not process queue when offline', async () => {
      const operation = vi.fn().mockResolvedValue('result');
      
      operationQueue.setOnlineStatus(false);
      operationQueue.enqueue(operation);
      
      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      expect(operation).not.toHaveBeenCalled();
    });

    it('should cancel pending operations', () => {
      const operation = vi.fn().mockResolvedValue('result');
      
      operationQueue.setOnlineStatus(false);
      const id = operationQueue.enqueue(operation);
      
      const cancelled = operationQueue.cancel(id);
      
      expect(cancelled).toBe(true);
      expect(operationQueue.getOperationStatus(id)).toBeUndefined();
    });

    it('should not cancel executing operations', async () => {
      const operation = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('result'), 200))
      );
      
      operationQueue.setOnlineStatus(true);
      const id = operationQueue.enqueue(operation);
      
      // Wait for operation to start executing
      await new Promise((resolve) => setTimeout(resolve, 50));
      
      const cancelled = operationQueue.cancel(id);
      
      expect(cancelled).toBe(false);
    });

    it('should clear completed operations', async () => {
      const operation = vi.fn().mockResolvedValue('result');
      
      operationQueue.setOnlineStatus(true);
      operationQueue.enqueue(operation);
      
      // Wait for operation to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      operationQueue.clearCompleted();
      
      expect(operationQueue.size()).toBe(0);
    });

    it('should get pending count', () => {
      operationQueue.setOnlineStatus(false);
      
      operationQueue.enqueue(vi.fn().mockResolvedValue('1'));
      operationQueue.enqueue(vi.fn().mockResolvedValue('2'));
      operationQueue.enqueue(vi.fn().mockResolvedValue('3'));
      
      expect(operationQueue.getPendingCount()).toBe(3);
    });

    it('should notify listeners on queue changes', () => {
      const listener = vi.fn();
      
      const unsubscribe = operationQueue.subscribe(listener);
      
      operationQueue.enqueue(vi.fn().mockResolvedValue('result'));
      
      expect(listener).toHaveBeenCalled();
      
      unsubscribe();
    });

    it('should throw error when queue is full', () => {
      operationQueue.setOnlineStatus(false);
      
      // Fill the queue (max 100)
      for (let i = 0; i < 100; i++) {
        operationQueue.enqueue(vi.fn().mockResolvedValue(`result ${i}`));
      }
      
      // Try to add one more
      expect(() => {
        operationQueue.enqueue(vi.fn().mockResolvedValue('overflow'));
      }).toThrow('Operation queue is full');
    });

    it('should retry failed operations', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('error 1'))
        .mockResolvedValueOnce('success');
      
      operationQueue.setOnlineStatus(true);
      const id = operationQueue.enqueue(operation);
      
      // Wait for operation to complete with retries
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      const op = operationQueue.getOperationStatus(id);
      expect(op?.status).toBe(OperationStatus.COMPLETED);
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Retry configurations', () => {
    it('should have correct default retry options', () => {
      expect(DEFAULT_RETRY_OPTIONS.maxRetries).toBe(3);
      expect(DEFAULT_RETRY_OPTIONS.initialDelayMs).toBe(1000);
      expect(DEFAULT_RETRY_OPTIONS.maxDelayMs).toBe(10000);
      expect(DEFAULT_RETRY_OPTIONS.backoffMultiplier).toBe(2);
    });

    it('should have correct network retry options', () => {
      expect(NETWORK_RETRY_OPTIONS.maxRetries).toBe(5);
      expect(NETWORK_RETRY_OPTIONS.initialDelayMs).toBe(1000);
      expect(NETWORK_RETRY_OPTIONS.maxDelayMs).toBe(30000);
      expect(NETWORK_RETRY_OPTIONS.backoffMultiplier).toBe(2);
      expect(NETWORK_RETRY_OPTIONS.shouldRetry).toBeDefined();
    });

    it('should have correct AI service retry options', () => {
      expect(AI_SERVICE_RETRY_OPTIONS.maxRetries).toBe(3);
      expect(AI_SERVICE_RETRY_OPTIONS.initialDelayMs).toBe(2000);
      expect(AI_SERVICE_RETRY_OPTIONS.maxDelayMs).toBe(15000);
      expect(AI_SERVICE_RETRY_OPTIONS.backoffMultiplier).toBe(2.5);
      expect(AI_SERVICE_RETRY_OPTIONS.shouldRetry).toBeDefined();
    });
  });
});
