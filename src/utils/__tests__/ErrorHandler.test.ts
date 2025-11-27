/**
 * ErrorHandler Tests
 * 
 * Tests for the global error handling system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { errorHandler, ErrorCategory, ErrorSeverity, NotificationType } from '../ErrorHandler';

describe('ErrorHandler', () => {
  beforeEach(() => {
    // Reset error handler state
    errorHandler.setOnlineStatus(true);
  });

  describe('Error Categorization', () => {
    it('should categorize authentication errors', () => {
      const error = { code: 'auth/invalid-credential', message: 'Invalid credential' };
      const categorized = errorHandler.categorizeError(error, { operation: 'login' });

      expect(categorized.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(categorized.severity).toBe(ErrorSeverity.WARNING);
      expect(categorized.userMessage).toContain('Invalid email or password');
      expect(categorized.isRecoverable).toBe(false);
    });

    it('should categorize network errors', () => {
      const error = { code: 'network-request-failed', message: 'Network error' };
      const categorized = errorHandler.categorizeError(error, { operation: 'fetchData' });

      expect(categorized.category).toBe(ErrorCategory.NETWORK);
      expect(categorized.severity).toBe(ErrorSeverity.WARNING);
      expect(categorized.userMessage).toContain('Network connection issue');
      expect(categorized.isRecoverable).toBe(true);
    });

    it('should categorize database errors', () => {
      const error = { code: 'permission-denied', message: 'Permission denied' };
      const categorized = errorHandler.categorizeError(error, { operation: 'updateFinding' });

      expect(categorized.category).toBe(ErrorCategory.DATABASE);
      expect(categorized.severity).toBe(ErrorSeverity.ERROR);
      expect(categorized.userMessage).toContain('permission');
      expect(categorized.isRecoverable).toBe(false);
    });

    it('should categorize AI service errors', () => {
      const error = new Error('OpenAI service unavailable');
      const categorized = errorHandler.categorizeError(error, { operation: 'chat' });

      expect(categorized.category).toBe(ErrorCategory.AI_SERVICE);
      expect(categorized.severity).toBe(ErrorSeverity.WARNING);
      expect(categorized.userMessage).toContain('AI service');
      expect(categorized.isRecoverable).toBe(true);
    });

    it('should categorize validation errors', () => {
      const error = { code: 'invalid-argument', message: 'Invalid input' };
      const categorized = errorHandler.categorizeError(error, { operation: 'createFinding' });

      expect(categorized.category).toBe(ErrorCategory.VALIDATION);
      expect(categorized.severity).toBe(ErrorSeverity.INFO);
      expect(categorized.isRecoverable).toBe(false);
    });

    it('should categorize timeout errors', () => {
      const error = { code: 'deadline-exceeded', message: 'Operation timed out' };
      const categorized = errorHandler.categorizeError(error, { operation: 'generateReport' });

      expect(categorized.category).toBe(ErrorCategory.TIMEOUT);
      expect(categorized.severity).toBe(ErrorSeverity.WARNING);
      expect(categorized.userMessage).toContain('took too long');
      expect(categorized.isRecoverable).toBe(true);
    });

    it('should categorize rate limit errors', () => {
      const error = { code: 'too-many-requests', message: 'Rate limit exceeded' };
      const categorized = errorHandler.categorizeError(error, { operation: 'apiCall' });

      expect(categorized.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(categorized.severity).toBe(ErrorSeverity.WARNING);
      expect(categorized.userMessage).toContain('Too many requests');
      expect(categorized.isRecoverable).toBe(true);
    });

    it('should categorize import errors', () => {
      const error = new Error('Failed to parse Excel file');
      const categorized = errorHandler.categorizeError(error, { operation: 'importFindings' });

      expect(categorized.category).toBe(ErrorCategory.IMPORT);
      expect(categorized.severity).toBe(ErrorSeverity.ERROR);
      expect(categorized.isRecoverable).toBe(false);
    });

    it('should categorize unknown errors', () => {
      const error = new Error('Something went wrong');
      const categorized = errorHandler.categorizeError(error, { operation: 'unknownOperation' });

      expect(categorized.category).toBe(ErrorCategory.UNKNOWN);
      expect(categorized.severity).toBe(ErrorSeverity.ERROR);
      expect(categorized.userMessage).toContain('unexpected error');
      expect(categorized.isRecoverable).toBe(false);
    });
  });

  describe('User-Friendly Messages', () => {
    it('should not expose technical details in user messages', () => {
      const error = new Error('Internal server error: Stack trace...');
      const categorized = errorHandler.categorizeError(error, { operation: 'test' });

      expect(categorized.userMessage).not.toContain('Stack trace');
      expect(categorized.userMessage).not.toContain('Internal server error');
      expect(categorized.technicalMessage).toContain('Internal server error');
    });

    it('should provide actionable messages for network errors', () => {
      const error = { code: 'unavailable', message: 'Service unavailable' };
      const categorized = errorHandler.categorizeError(error, { operation: 'test' });

      expect(categorized.userMessage).toContain('check your internet connection');
    });

    it('should provide specific messages for auth errors', () => {
      const error = { code: 'auth/too-many-requests', message: 'Too many attempts' };
      const categorized = errorHandler.categorizeError(error, { operation: 'login' });

      expect(categorized.userMessage).toContain('Too many failed login attempts');
      expect(categorized.userMessage).toContain('try again later');
    });
  });

  describe('Error Recovery', () => {
    it('should identify recoverable network errors', () => {
      const error = { code: 'unavailable', message: 'Network error' };
      const categorized = errorHandler.categorizeError(error, { operation: 'test' });

      expect(categorized.isRecoverable).toBe(true);
    });

    it('should identify non-recoverable permission errors', () => {
      const error = { code: 'permission-denied', message: 'Access denied' };
      const categorized = errorHandler.categorizeError(error, { operation: 'test' });

      expect(categorized.isRecoverable).toBe(false);
    });

    it('should identify recoverable timeout errors', () => {
      const error = { code: 'timeout', message: 'Request timeout' };
      const categorized = errorHandler.categorizeError(error, { operation: 'test' });

      expect(categorized.isRecoverable).toBe(true);
    });
  });

  describe('Notification Callbacks', () => {
    it('should call notification callback when set', async () => {
      const mockNotification = vi.fn();
      errorHandler.setNotificationCallback(mockNotification);

      const error = new Error('Test error');
      await errorHandler.handle(error, { operation: 'test' });

      expect(mockNotification).toHaveBeenCalled();
      expect(mockNotification).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        undefined
      );
    });

    it('should use success notification method', () => {
      const mockNotification = vi.fn();
      errorHandler.setNotificationCallback(mockNotification);

      errorHandler.success('Operation successful');

      expect(mockNotification).toHaveBeenCalledWith(
        'Operation successful',
        NotificationType.SUCCESS,
        undefined
      );
    });

    it('should use info notification method', () => {
      const mockNotification = vi.fn();
      errorHandler.setNotificationCallback(mockNotification);

      errorHandler.info('Information message');

      expect(mockNotification).toHaveBeenCalledWith(
        'Information message',
        NotificationType.INFO,
        undefined
      );
    });

    it('should use warning notification method', () => {
      const mockNotification = vi.fn();
      errorHandler.setNotificationCallback(mockNotification);

      errorHandler.warning('Warning message');

      expect(mockNotification).toHaveBeenCalledWith(
        'Warning message',
        NotificationType.WARNING,
        undefined
      );
    });

    it('should use error notification method', () => {
      const mockNotification = vi.fn();
      errorHandler.setNotificationCallback(mockNotification);

      errorHandler.error('Error message');

      expect(mockNotification).toHaveBeenCalledWith(
        'Error message',
        NotificationType.ERROR,
        undefined
      );
    });
  });

  describe('Online Status', () => {
    it('should detect offline status', () => {
      errorHandler.setOnlineStatus(false);

      const error = new Error('Network error');
      const categorized = errorHandler.categorizeError(error, { operation: 'test' });

      expect(categorized.category).toBe(ErrorCategory.NETWORK);
    });

    it('should handle online status', () => {
      errorHandler.setOnlineStatus(true);

      const error = new Error('Some error');
      const categorized = errorHandler.categorizeError(error, { operation: 'test' });

      // Should not automatically categorize as network error when online
      expect(categorized.category).not.toBe(ErrorCategory.NETWORK);
    });
  });

  describe('Error Context', () => {
    it('should preserve error context', () => {
      const error = new Error('Test error');
      const context = {
        operation: 'testOperation',
        userId: 'user123',
        resourceId: 'resource456',
        metadata: { key: 'value' }
      };

      const categorized = errorHandler.categorizeError(error, context);

      expect(categorized.context).toEqual(context);
    });

    it('should include timestamp', () => {
      const error = new Error('Test error');
      const categorized = errorHandler.categorizeError(error, { operation: 'test' });

      expect(categorized.timestamp).toBeInstanceOf(Date);
    });
  });
});
