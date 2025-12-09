import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocAIFilterService } from '../DocAIFilterService';
import { AuditResult } from '../AuditResultService';

// Mock dependencies
vi.mock('../GeminiService', () => ({
  sendMessageToGemini: vi.fn(),
}));

vi.mock('../AuditResultService', () => {
  class MockAuditResultService {
    getAll = vi.fn();
  }
  return {
    AuditResultService: MockAuditResultService,
  };
});

describe('DocAIFilterService', () => {
  let service: DocAIFilterService;

  beforeEach(() => {
    service = new DocAIFilterService();
    vi.clearAllMocks();
  });

  describe('buildFirestoreQuery', () => {
    it('should build query with year filter', () => {
      const intent = {
        interpretation: 'Show findings from 2024',
        filters: { year: 2024 },
        confidence: 0.9,
        needsConfirmation: false,
      };

      const query = service.buildFirestoreQuery(intent);

      expect(query.filters).toContainEqual({
        field: 'year',
        operator: '==',
        value: 2024,
      });
    });

    it('should build query with department filter', () => {
      const intent = {
        interpretation: 'Show IT findings',
        filters: { department: 'IT' },
        confidence: 0.9,
        needsConfirmation: false,
      };

      const query = service.buildFirestoreQuery(intent);

      expect(query.filters).toContainEqual({
        field: 'department',
        operator: '==',
        value: 'IT',
      });
    });

    it('should build query with risk score filter', () => {
      const intent = {
        interpretation: 'Show critical findings',
        filters: { minNilai: 16 },
        confidence: 0.9,
        needsConfirmation: false,
      };

      const query = service.buildFirestoreQuery(intent);

      expect(query.filters).toContainEqual({
        field: 'nilai',
        operator: '>=',
        value: 16,
      });
      expect(query.sorts).toContainEqual({
        field: 'nilai',
        direction: 'desc',
      });
    });

    it('should build query with onlyFindings filter', () => {
      const intent = {
        interpretation: 'Show only findings',
        filters: { onlyFindings: true },
        confidence: 0.9,
        needsConfirmation: false,
      };

      const query = service.buildFirestoreQuery(intent);

      expect(query.filters).toContainEqual({
        field: 'code',
        operator: '!=',
        value: '',
      });
    });

    it('should build composite query', () => {
      const intent = {
        interpretation: 'Show IT findings from 2024',
        filters: {
          year: 2024,
          department: 'IT',
          onlyFindings: true,
        },
        confidence: 0.95,
        needsConfirmation: false,
      };

      const query = service.buildFirestoreQuery(intent);

      expect(query.filters).toHaveLength(3);
      expect(query.filters).toContainEqual({
        field: 'year',
        operator: '==',
        value: 2024,
      });
      expect(query.filters).toContainEqual({
        field: 'department',
        operator: '==',
        value: 'IT',
      });
      expect(query.filters).toContainEqual({
        field: 'code',
        operator: '!=',
        value: '',
      });
    });
  });

  describe('formatResultsForChat', () => {
    it('should format empty results', () => {
      const filterResult = {
        results: [],
        totalCount: 0,
        query: { filters: [], sorts: [] },
        executionTime: 100,
      };

      const output = service.formatResultsForChat(filterResult);

      expect(output).toContain('No results found');
    });

    it('should format results with data', () => {
      const mockResults: AuditResult[] = [
        {
          auditResultId: 'TEST-IT-F01',
          year: 2024,
          sh: 'TEST',
          projectName: 'Test Project',
          projectId: null,
          department: 'IT',
          riskArea: 'Security',
          descriptions: 'Test finding description',
          code: 'F01',
          bobot: 4,
          kadar: 4,
          nilai: 16,
        },
      ];

      const filterResult = {
        results: mockResults,
        totalCount: 1,
        query: { filters: [], sorts: [] },
        executionTime: 150,
      };

      const output = service.formatResultsForChat(filterResult);

      expect(output).toContain('Found 1 result');
      expect(output).toContain('TEST-IT-F01');
      expect(output).toContain('CRITICAL');
      expect(output).toContain('Test Project');
      expect(output).toContain('IT');
    });

    it('should show "first 10" message when more than 10 results', () => {
      const mockResults: AuditResult[] = Array.from({ length: 15 }, (_, i) => ({
        auditResultId: `TEST-IT-F${i + 1}`,
        year: 2024,
        sh: 'TEST',
        projectName: 'Test Project',
        projectId: null,
        department: 'IT',
        riskArea: 'Security',
        descriptions: 'Test finding',
        code: `F${i + 1}`,
        bobot: 3,
        kadar: 3,
        nilai: 9,
      }));

      const filterResult = {
        results: mockResults,
        totalCount: 15,
        query: { filters: [], sorts: [] },
        executionTime: 200,
      };

      const output = service.formatResultsForChat(filterResult);

      expect(output).toContain('Found 15 results');
      expect(output).toContain('Showing first 10 of 15');
    });

    it('should show correct risk levels', () => {
      const mockResults: AuditResult[] = [
        {
          auditResultId: 'CRITICAL',
          year: 2024,
          sh: 'TEST',
          projectName: 'Test',
          projectId: null,
          department: 'IT',
          riskArea: 'Security',
          descriptions: 'Critical',
          code: 'F01',
          bobot: 5,
          kadar: 5,
          nilai: 25,
        },
        {
          auditResultId: 'HIGH',
          year: 2024,
          sh: 'TEST',
          projectName: 'Test',
          projectId: null,
          department: 'IT',
          riskArea: 'Security',
          descriptions: 'High',
          code: 'F02',
          bobot: 3,
          kadar: 4,
          nilai: 12,
        },
        {
          auditResultId: 'MEDIUM',
          year: 2024,
          sh: 'TEST',
          projectName: 'Test',
          projectId: null,
          department: 'IT',
          riskArea: 'Security',
          descriptions: 'Medium',
          code: 'F03',
          bobot: 2,
          kadar: 3,
          nilai: 6,
        },
        {
          auditResultId: 'LOW',
          year: 2024,
          sh: 'TEST',
          projectName: 'Test',
          projectId: null,
          department: 'IT',
          riskArea: 'Security',
          descriptions: 'Low',
          code: 'F04',
          bobot: 1,
          kadar: 2,
          nilai: 2,
        },
      ];

      const filterResult = {
        results: mockResults,
        totalCount: 4,
        query: { filters: [], sorts: [] },
        executionTime: 100,
      };

      const output = service.formatResultsForChat(filterResult);

      expect(output).toContain('CRITICAL');
      expect(output).toContain('HIGH');
      expect(output).toContain('MEDIUM');
      expect(output).toContain('LOW');
    });
  });
});
