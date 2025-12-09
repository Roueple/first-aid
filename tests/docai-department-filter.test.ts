import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimpleQueryExecutor } from '../src/services/SimpleQueryExecutor';
import { AuditResultService } from '../src/services/AuditResultService';
import departmentService from '../src/services/DepartmentService';
import { QueryPattern } from '../src/services/SimpleQueryMatcher';

// Mock the services
vi.mock('../src/services/DepartmentService', () => ({
  default: {
    searchByName: vi.fn(),
    findOrCreate: vi.fn(),
  },
}));

describe('DocAI Department Filter Integration', () => {
  let executor: SimpleQueryExecutor;
  let auditResultService: AuditResultService;

  beforeEach(() => {
    auditResultService = new AuditResultService();
    executor = new SimpleQueryExecutor(auditResultService);
    vi.clearAllMocks();
  });

  describe('Department Normalization', () => {
    it('should normalize department name using department table', async () => {
      // Mock department service to return normalized department
      vi.mocked(departmentService.searchByName).mockResolvedValue([
        {
          id: 'dept-1',
          name: 'IT',
          originalNames: ['IT', 'Departemen IT', 'Information Technology', 'ICT'],
          keywords: ['it', 'information', 'technology'],
          category: 'IT',
        },
      ]);

      // Mock audit result service
      const mockResults = [
        {
          id: '1',
          auditResultId: 'AR-001',
          year: 2023,
          sh: 'SH01',
          projectName: 'Project A',
          projectId: 'proj-1',
          department: 'IT',
          riskArea: 'Security',
          descriptions: 'Test finding',
          code: 'F001',
          bobot: 3,
          kadar: 5,
          nilai: 15,
        },
        {
          id: '2',
          auditResultId: 'AR-002',
          year: 2023,
          sh: 'SH01',
          projectName: 'Project B',
          projectId: 'proj-2',
          department: 'Departemen IT',
          riskArea: 'Compliance',
          descriptions: 'Test finding 2',
          code: 'F002',
          bobot: 2,
          kadar: 4,
          nilai: 8,
        },
      ];

      vi.spyOn(auditResultService, 'getAll').mockResolvedValue(mockResults);

      // Create a simple department query pattern
      const pattern: QueryPattern = {
        id: 'test-dept',
        name: 'Test Department Query',
        priority: 10,
        regex: /(.+?)\s+findings?$/i,
        parameterExtractors: [
          { name: 'department', type: 'string', captureGroup: 1, normalizer: 'trim' },
        ],
        filterBuilder: (params) => [
          { field: 'department', operator: '==', value: params.department },
        ],
        sortBuilder: () => [{ field: 'nilai', direction: 'desc' }],
      };

      const params = { department: 'IT' };

      // Execute query
      const result = await executor.execute(pattern, params);

      // Verify department service was called
      expect(departmentService.searchByName).toHaveBeenCalledWith('IT');

      // Verify results include findings from all department variations
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.metadata.resultsCount).toBeGreaterThan(0);
    });

    it('should handle department not found in table', async () => {
      // Mock department service to return empty array
      vi.mocked(departmentService.searchByName).mockResolvedValue([]);
      vi.mocked(departmentService.findOrCreate).mockResolvedValue({
        id: 'dept-new',
        name: 'Unknown Dept',
        originalNames: ['Unknown Dept'],
        keywords: ['unknown', 'dept'],
        category: 'Other',
      });

      const pattern: QueryPattern = {
        id: 'test-dept',
        name: 'Test Department Query',
        priority: 10,
        regex: /(.+?)\s+findings?$/i,
        parameterExtractors: [
          { name: 'department', type: 'string', captureGroup: 1, normalizer: 'trim' },
        ],
        filterBuilder: (params) => [
          { field: 'department', operator: '==', value: params.department },
        ],
        sortBuilder: () => [{ field: 'nilai', direction: 'desc' }],
      };

      const params = { department: 'Unknown Dept' };

      // Execute query
      const result = await executor.execute(pattern, params);

      // Verify department service was called
      expect(departmentService.searchByName).toHaveBeenCalledWith('Unknown Dept');
      expect(departmentService.findOrCreate).toHaveBeenCalledWith('Unknown Dept');

      // Result should be empty or use fallback
      expect(result).toBeDefined();
    });

    it('should combine results from multiple department variations', async () => {
      // Mock department service
      vi.mocked(departmentService.searchByName).mockResolvedValue([
        {
          id: 'dept-1',
          name: 'Finance',
          originalNames: ['Finance', 'Keuangan', 'FAD'],
          keywords: ['finance', 'keuangan', 'fad'],
          category: 'Finance',
        },
      ]);

      // Mock different results for each department variation
      const mockFinanceResults = [
        {
          id: '1',
          auditResultId: 'AR-001',
          year: 2023,
          sh: 'SH01',
          projectName: 'Project A',
          projectId: 'proj-1',
          department: 'Finance',
          riskArea: 'Budget',
          descriptions: 'Finance finding',
          code: 'F001',
          bobot: 3,
          kadar: 5,
          nilai: 15,
        },
      ];

      const mockKeuanganResults = [
        {
          id: '2',
          auditResultId: 'AR-002',
          year: 2023,
          sh: 'SH01',
          projectName: 'Project B',
          projectId: 'proj-2',
          department: 'Keuangan',
          riskArea: 'Reporting',
          descriptions: 'Keuangan finding',
          code: 'F002',
          bobot: 2,
          kadar: 4,
          nilai: 8,
        },
      ];

      vi.spyOn(auditResultService, 'getAll')
        .mockResolvedValueOnce(mockFinanceResults)
        .mockResolvedValueOnce(mockKeuanganResults)
        .mockResolvedValueOnce([]);

      const pattern: QueryPattern = {
        id: 'test-dept',
        name: 'Test Department Query',
        priority: 10,
        regex: /(.+?)\s+findings?$/i,
        parameterExtractors: [
          { name: 'department', type: 'string', captureGroup: 1, normalizer: 'trim' },
        ],
        filterBuilder: (params) => [
          { field: 'department', operator: '==', value: params.department },
        ],
        sortBuilder: () => [{ field: 'nilai', direction: 'desc' }],
      };

      const params = { department: 'Finance' };

      // Execute query
      const result = await executor.execute(pattern, params);

      // Verify results are combined and sorted
      expect(result.findings.length).toBe(2);
      expect(result.findings[0].nilai).toBeGreaterThanOrEqual(result.findings[1].nilai);
    });
  });

  describe('Composite Queries with Department', () => {
    it('should handle department + year composite query', async () => {
      vi.mocked(departmentService.searchByName).mockResolvedValue([
        {
          id: 'dept-1',
          name: 'IT',
          originalNames: ['IT', 'Departemen IT'],
          keywords: ['it'],
          category: 'IT',
        },
      ]);

      vi.spyOn(auditResultService, 'getAll').mockResolvedValue([
        {
          id: '1',
          auditResultId: 'AR-001',
          year: 2023,
          sh: 'SH01',
          projectName: 'Project A',
          projectId: 'proj-1',
          department: 'IT',
          riskArea: 'Security',
          descriptions: 'IT finding from 2023',
          code: 'F001',
          bobot: 3,
          kadar: 5,
          nilai: 15,
        },
      ]);

      const pattern: QueryPattern = {
        id: 'test-composite',
        name: 'Test Composite Query',
        priority: 20,
        regex: /(.+?)\s+findings?\s+from\s+(\d{4})/i,
        parameterExtractors: [
          { name: 'department', type: 'string', captureGroup: 1, normalizer: 'trim' },
          { name: 'year', type: 'number', captureGroup: 2 },
        ],
        filterBuilder: (params) => [
          { field: 'department', operator: '==', value: params.department },
          { field: 'year', operator: '==', value: params.year },
        ],
        sortBuilder: () => [{ field: 'nilai', direction: 'desc' }],
      };

      const params = { department: 'IT', year: 2023 };

      // Execute query
      const result = await executor.execute(pattern, params);

      // Verify both filters are applied
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findings[0].year).toBe(2023);
    });

    it('should handle department + risk composite query', async () => {
      vi.mocked(departmentService.searchByName).mockResolvedValue([
        {
          id: 'dept-1',
          name: 'HR',
          originalNames: ['HR', 'HRD', 'SDM'],
          keywords: ['hr', 'hrd', 'sdm'],
          category: 'HR',
        },
      ]);

      vi.spyOn(auditResultService, 'getAll').mockResolvedValue([
        {
          id: '1',
          auditResultId: 'AR-001',
          year: 2023,
          sh: 'SH01',
          projectName: 'Project A',
          projectId: 'proj-1',
          department: 'HR',
          riskArea: 'Compliance',
          descriptions: 'Critical HR finding',
          code: 'F001',
          bobot: 3,
          kadar: 5,
          nilai: 15,
        },
      ]);

      const pattern: QueryPattern = {
        id: 'test-composite-risk',
        name: 'Test Composite Risk Query',
        priority: 25,
        regex: /critical\s+(.+?)\s+findings?/i,
        parameterExtractors: [
          { name: 'department', type: 'string', captureGroup: 1, normalizer: 'trim' },
        ],
        filterBuilder: (params) => [
          { field: 'department', operator: '==', value: params.department },
          { field: 'nilai', operator: '>=', value: 15 },
        ],
        sortBuilder: () => [{ field: 'nilai', direction: 'desc' }],
      };

      const params = { department: 'HR' };

      // Execute query
      const result = await executor.execute(pattern, params);

      // Verify risk filter is applied
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findings[0].nilai).toBeGreaterThanOrEqual(15);
    });
  });
});
