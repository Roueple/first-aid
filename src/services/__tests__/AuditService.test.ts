/**
 * Unit tests for AuditService
 * 
 * Tests the audit logging functionality to ensure:
 * - Events are logged correctly
 * - Different action types are supported
 * - Error handling works properly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from '../AuditService';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Mock Firebase functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
}));

describe('AuditService', () => {
  let auditService: AuditService;
  let mockCallable: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock callable function
    mockCallable = vi.fn().mockResolvedValue({
      data: {
        success: true,
        logId: 'test-log-id',
        timestamp: new Date().toISOString(),
      },
    });

    // Mock httpsCallable to return our mock
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    // Create new service instance
    auditService = new AuditService();
  });

  describe('logEvent', () => {
    it('should log an audit event successfully', async () => {
      const result = await auditService.logEvent(
        'create',
        'finding',
        'finding-123',
        { test: true }
      );

      expect(result.success).toBe(true);
      expect(result.logId).toBe('test-log-id');
      expect(mockCallable).toHaveBeenCalledWith({
        action: 'create',
        resourceType: 'finding',
        resourceId: 'finding-123',
        details: { test: true },
      });
    });

    it('should handle missing optional parameters', async () => {
      const result = await auditService.logEvent('login', 'user');

      expect(result.success).toBe(true);
      expect(mockCallable).toHaveBeenCalledWith({
        action: 'login',
        resourceType: 'user',
        resourceId: undefined,
        details: undefined,
      });
    });

    it('should handle errors gracefully', async () => {
      mockCallable.mockRejectedValue(new Error('Network error'));

      const result = await auditService.logEvent('create', 'finding');

      expect(result.success).toBe(false);
      expect(result.logId).toBe('');
    });
  });

  describe('logLogin', () => {
    it('should log a login event', async () => {
      await auditService.logLogin('user-123', 'email');

      expect(mockCallable).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'login',
          resourceType: 'user',
          resourceId: 'user-123',
          details: expect.objectContaining({
            loginMethod: 'email',
          }),
        })
      );
    });

    it('should use default login method', async () => {
      await auditService.logLogin('user-123');

      expect(mockCallable).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            loginMethod: 'email',
          }),
        })
      );
    });
  });

  describe('logLogout', () => {
    it('should log a logout event', async () => {
      await auditService.logLogout('user-123');

      expect(mockCallable).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'logout',
          resourceType: 'user',
          resourceId: 'user-123',
        })
      );
    });
  });

  describe('logFindingCreate', () => {
    it('should log a finding creation event', async () => {
      await auditService.logFindingCreate('finding-123', { severity: 'High' });

      expect(mockCallable).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create',
          resourceType: 'finding',
          resourceId: 'finding-123',
          details: { severity: 'High' },
        })
      );
    });
  });

  describe('logFindingUpdate', () => {
    it('should log a finding update event', async () => {
      await auditService.logFindingUpdate('finding-123', ['status', 'severity']);

      expect(mockCallable).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          resourceType: 'finding',
          resourceId: 'finding-123',
          details: {
            changedFields: ['status', 'severity'],
          },
        })
      );
    });
  });

  describe('logFindingDelete', () => {
    it('should log a finding deletion event', async () => {
      await auditService.logFindingDelete('finding-123');

      expect(mockCallable).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
          resourceType: 'finding',
          resourceId: 'finding-123',
        })
      );
    });
  });

  describe('logAIQuery', () => {
    it('should log an AI query event', async () => {
      await auditService.logAIQuery('session-123', 'What are the high-risk findings?', 1500);

      expect(mockCallable).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ai_query',
          resourceType: 'chat',
          resourceId: 'session-123',
          details: expect.objectContaining({
            queryLength: 33,
            responseTime: 1500,
          }),
        })
      );
    });
  });

  describe('logReportGenerate', () => {
    it('should log a report generation event', async () => {
      await auditService.logReportGenerate('report-123', 'PDF', {
        dateRange: '2024-01-01 to 2024-12-31',
      });

      expect(mockCallable).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'report_generate',
          resourceType: 'report',
          resourceId: 'report-123',
          details: {
            format: 'PDF',
            criteria: {
              dateRange: '2024-01-01 to 2024-12-31',
            },
          },
        })
      );
    });
  });

  describe('logReportDownload', () => {
    it('should log a report download event', async () => {
      await auditService.logReportDownload('report-123');

      expect(mockCallable).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'report_download',
          resourceType: 'report',
          resourceId: 'report-123',
        })
      );
    });
  });

  describe('logImport', () => {
    it('should log an import event', async () => {
      await auditService.logImport('batch-123', 100, 95, 5);

      expect(mockCallable).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'import',
          resourceType: 'finding',
          resourceId: 'batch-123',
          details: expect.objectContaining({
            findingsCount: 100,
            successCount: 95,
            failureCount: 5,
          }),
        })
      );
    });
  });

  describe('logExport', () => {
    it('should log an export event', async () => {
      await auditService.logExport('finding', 'Excel', 50);

      expect(mockCallable).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'export',
          resourceType: 'finding',
          details: expect.objectContaining({
            format: 'Excel',
            recordCount: 50,
          }),
        })
      );
    });
  });
});
