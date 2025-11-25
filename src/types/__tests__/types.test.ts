import { describe, it, expect } from 'vitest';
import {
  FindingSchema,
  CreateFindingSchema,
  UpdateFindingSchema,
  UserSchema,
  CreateUserSchema,
  ChatSessionSchema,
  PatternSchema,
  ReportSchema,
  FindingFiltersSchema,
  PaginationSchema,
  AuditLogSchema,
  DEFAULT_PAGINATION,
  createPaginatedResult,
} from '../index';

describe('Type Validation Schemas', () => {
  describe('Finding Schemas', () => {
    it('should validate a valid CreateFindingInput', () => {
      const input = {
        title: 'Test Finding',
        description: 'Test description',
        severity: 'High' as const,
        status: 'Open' as const,
        category: 'Security',
        location: 'Main Office',
        responsiblePerson: 'John Doe',
        dateIdentified: new Date(),
        recommendation: 'Fix the issue',
        riskLevel: 8,
        originalSource: 'Manual audit',
      };

      const result = CreateFindingSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid severity', () => {
      const input = {
        title: 'Test Finding',
        description: 'Test description',
        severity: 'Invalid',
        status: 'Open',
        category: 'Security',
        location: 'Main Office',
        responsiblePerson: 'John Doe',
        dateIdentified: new Date(),
        recommendation: 'Fix the issue',
        riskLevel: 8,
        originalSource: 'Manual audit',
      };

      const result = CreateFindingSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const input = {
        title: 'Test Finding',
        // Missing description
        severity: 'High',
        status: 'Open',
      };

      const result = CreateFindingSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should validate UpdateFindingInput with partial fields', () => {
      const input = {
        status: 'Closed' as const,
        dateCompleted: new Date(),
      };

      const result = UpdateFindingSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('User Schemas', () => {
    it('should validate a valid CreateUserInput', () => {
      const input = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'auditor' as const,
        department: 'IT',
      };

      const result = CreateUserSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const input = {
        email: 'invalid-email',
        name: 'Test User',
        role: 'auditor',
      };

      const result = CreateUserSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Filter Schemas', () => {
    it('should validate FindingFilters', () => {
      const filters = {
        severity: ['Critical', 'High'] as const,
        status: ['Open'] as const,
        location: ['Main Office'],
        searchText: 'security',
      };

      const result = FindingFiltersSchema.safeParse(filters);
      expect(result.success).toBe(true);
    });

    it('should validate Pagination', () => {
      const pagination = {
        page: 1,
        pageSize: 20,
        sortBy: 'dateCreated' as const,
        sortDirection: 'desc' as const,
      };

      const result = PaginationSchema.safeParse(pagination);
      expect(result.success).toBe(true);
    });

    it('should reject invalid page size', () => {
      const pagination = {
        page: 1,
        pageSize: 200, // Too large
      };

      const result = PaginationSchema.safeParse(pagination);
      expect(result.success).toBe(false);
    });
  });

  describe('Pattern Schema', () => {
    it('should validate a valid pattern', () => {
      const pattern = {
        id: 'pattern-1',
        type: 'geographic' as const,
        title: 'Security issues in Branch A',
        description: 'Multiple security findings detected',
        confidence: 0.85,
        occurrences: 5,
        affectedFindings: ['f1', 'f2', 'f3', 'f4', 'f5'],
        detectedAt: new Date(),
        severity: 'High' as const,
        recommendations: ['Conduct security audit', 'Update policies'],
        isDismissed: false,
      };

      const result = PatternSchema.safeParse(pattern);
      expect(result.success).toBe(true);
    });

    it('should reject pattern with less than 3 occurrences', () => {
      const pattern = {
        id: 'pattern-1',
        type: 'geographic',
        title: 'Test pattern',
        description: 'Test',
        confidence: 0.85,
        occurrences: 2, // Too few
        affectedFindings: ['f1', 'f2'],
        detectedAt: new Date(),
        severity: 'High',
        recommendations: [],
        isDismissed: false,
      };

      const result = PatternSchema.safeParse(pattern);
      expect(result.success).toBe(false);
    });
  });

  describe('Audit Log Schema', () => {
    it('should validate a valid audit log', () => {
      const log = {
        id: 'log-1',
        userId: 'user-1',
        action: 'create' as const,
        resourceType: 'finding' as const,
        resourceId: 'finding-1',
        details: { field: 'value' },
        ipAddress: '192.168.1.1',
        timestamp: new Date(),
      };

      const result = AuditLogSchema.safeParse(log);
      expect(result.success).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should create paginated result correctly', () => {
      const items = [1, 2, 3, 4, 5];
      const total = 50;
      const pagination = { ...DEFAULT_PAGINATION, page: 1, pageSize: 5 };

      const result = createPaginatedResult(items, total, pagination);

      expect(result.items).toEqual(items);
      expect(result.total).toBe(50);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(5);
      expect(result.totalPages).toBe(10);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('should handle last page correctly', () => {
      const items = [1, 2, 3];
      const total = 23;
      const pagination = { ...DEFAULT_PAGINATION, page: 5, pageSize: 5 };

      const result = createPaginatedResult(items, total, pagination);

      expect(result.totalPages).toBe(5);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(true);
    });
  });

  describe('Default Values', () => {
    it('should have correct default pagination', () => {
      expect(DEFAULT_PAGINATION).toEqual({
        page: 1,
        pageSize: 20,
        sortBy: 'dateCreated',
        sortDirection: 'desc',
      });
    });
  });
});
