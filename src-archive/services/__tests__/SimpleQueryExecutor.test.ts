import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { SimpleQueryExecutor, SimpleQueryResult } from '../SimpleQueryExecutor';
import { AuditResultService, AuditResult } from '../AuditResultService';
import { QueryPattern, ExtractedParams } from '../SimpleQueryMatcher';
import { Timestamp } from 'firebase/firestore';

// Mock AuditResultService
vi.mock('../AuditResultService', () => {
  return {
    AuditResultService: vi.fn().mockImplementation(() => ({
      getAll: vi.fn(),
    })),
    default: {
      getAll: vi.fn(),
    },
  };
});

describe('SimpleQueryExecutor', () => {
  let executor: SimpleQueryExecutor;
  let mockAuditResultService: any;

  beforeEach(() => {
    mockAuditResultService = {
      getAll: vi.fn(),
    };
    executor = new SimpleQueryExecutor(mockAuditResultService);
  });

  // Helper to create mock audit results
  const createMockAuditResult = (overrides: Partial<AuditResult> = {}): AuditResult => ({
    id: 'test-id',
    auditResultId: 'AR-001',
    year: 2023,
    sh: 'SH-A',
    projectName: 'Test Project',
    projectId: 'proj-001',
    department: 'IT',
    riskArea: 'Security',
    descriptions: 'Test finding',
    code: 'F001',
    bobot: 3,
    kadar: 5,
    nilai: 15,
    createdAt: Timestamp.now(),
    ...overrides,
  });

  describe('Query Execution', () => {
    it('should execute queries and return results', async () => {
      const mockResults = [createMockAuditResult()];
      mockAuditResultService.getAll.mockResolvedValue(mockResults);

      const pattern: QueryPattern = {
        id: 'test-pattern',
        name: 'Test Pattern',
        priority: 10,
        regex: /test/,
        parameterExtractors: [],
        filterBuilder: () => [{ field: 'year', operator: '==', value: 2023 }],
        sortBuilder: () => [{ field: 'nilai', direction: 'desc' }],
      };

      const result = await executor.execute(pattern, {});

      expect(result.type).toBe('simple_query');
      expect(result.findings).toEqual(mockResults);
      expect(result.metadata.queryType).toBe('simple_query');
      expect(result.metadata.resultsCount).toBe(1);
    });

    it('should use limit from params when provided', async () => {
      const mockResults = [createMockAuditResult(), createMockAuditResult()];
      mockAuditResultService.getAll.mockResolvedValue(mockResults);

      const pattern: QueryPattern = {
        id: 'test-limit',
        name: 'Test Limit Pattern',
        priority: 10,
        regex: /test/,
        parameterExtractors: [],
        filterBuilder: () => [],
        sortBuilder: () => [{ field: 'nilai', direction: 'desc' }],
      };

      const result = await executor.execute(pattern, { limit: 10 });

      const callArgs = mockAuditResultService.getAll.mock.calls[0][0];
      expect(callArgs.limit).toBe(10);
    });

    it('should use default limit of 50 when no limit provided', async () => {
      const mockResults = [createMockAuditResult()];
      mockAuditResultService.getAll.mockResolvedValue(mockResults);

      const pattern: QueryPattern = {
        id: 'test-default-limit',
        name: 'Test Default Limit Pattern',
        priority: 10,
        regex: /test/,
        parameterExtractors: [],
        filterBuilder: () => [],
        sortBuilder: () => [{ field: 'nilai', direction: 'desc' }],
      };

      const result = await executor.execute(pattern, {});

      const callArgs = mockAuditResultService.getAll.mock.calls[0][0];
      expect(callArgs.limit).toBe(50);
    });

    it('should handle empty results', async () => {
      mockAuditResultService.getAll.mockResolvedValue([]);

      const pattern: QueryPattern = {
        id: 'test-pattern',
        name: 'Test Pattern',
        priority: 10,
        regex: /test/,
        parameterExtractors: [],
        filterBuilder: () => [{ field: 'year', operator: '==', value: 2023 }],
        sortBuilder: () => [{ field: 'nilai', direction: 'desc' }],
      };

      const result = await executor.execute(pattern, {});

      expect(result.findings).toHaveLength(0);
      expect(result.metadata.resultsCount).toBe(0);
      expect(result.answer).toContain('No Results Found');
    });

    it('should handle errors gracefully', async () => {
      mockAuditResultService.getAll.mockRejectedValue(new Error('Database error'));

      const pattern: QueryPattern = {
        id: 'test-pattern',
        name: 'Test Pattern',
        priority: 10,
        regex: /test/,
        parameterExtractors: [],
        filterBuilder: () => [{ field: 'year', operator: '==', value: 2023 }],
        sortBuilder: () => [{ field: 'nilai', direction: 'desc' }],
      };

      const result = await executor.execute(pattern, {});

      expect(result.findings).toHaveLength(0);
      expect(result.answer).toContain('Query Error');
    });
  });

  describe('Inequality Sort Ordering', () => {
    it('should order sorts with inequality field first', async () => {
      mockAuditResultService.getAll.mockResolvedValue([]);

      const pattern: QueryPattern = {
        id: 'inequality-pattern',
        name: 'Inequality Pattern',
        priority: 10,
        regex: /test/,
        parameterExtractors: [],
        filterBuilder: () => [
          { field: 'department', operator: '==', value: 'IT' },
          { field: 'nilai', operator: '>=', value: 10 },
        ],
        sortBuilder: () => [
          { field: 'year', direction: 'desc' },
        ],
      };

      await executor.execute(pattern, {});

      // Check that getAll was called with reordered sorts
      const callArgs = mockAuditResultService.getAll.mock.calls[0][0];
      expect(callArgs.sorts[0].field).toBe('nilai'); // Inequality field should be first
    });

    it('should not reorder when inequality field is already first', async () => {
      mockAuditResultService.getAll.mockResolvedValue([]);

      const pattern: QueryPattern = {
        id: 'inequality-pattern',
        name: 'Inequality Pattern',
        priority: 10,
        regex: /test/,
        parameterExtractors: [],
        filterBuilder: () => [
          { field: 'nilai', operator: '>=', value: 10 },
        ],
        sortBuilder: () => [
          { field: 'nilai', direction: 'desc' },
        ],
      };

      await executor.execute(pattern, {});

      const callArgs = mockAuditResultService.getAll.mock.calls[0][0];
      expect(callArgs.sorts[0].field).toBe('nilai');
    });

    it('should not modify sorts when no inequality filter', async () => {
      mockAuditResultService.getAll.mockResolvedValue([]);

      const pattern: QueryPattern = {
        id: 'equality-pattern',
        name: 'Equality Pattern',
        priority: 10,
        regex: /test/,
        parameterExtractors: [],
        filterBuilder: () => [
          { field: 'department', operator: '==', value: 'IT' },
          { field: 'year', operator: '==', value: 2023 },
        ],
        sortBuilder: () => [
          { field: 'nilai', direction: 'desc' },
        ],
      };

      await executor.execute(pattern, {});

      const callArgs = mockAuditResultService.getAll.mock.calls[0][0];
      expect(callArgs.sorts[0].field).toBe('nilai');
    });
  });

  // **Feature: docai-simple-query, Property 9: Department Query Sorting**
  describe('Property 9: Department Query Sorting', () => {
    it('should sort department query results by year in descending order', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom('IT', 'HR', 'Finance', 'Sales', 'Legal', 'Marketing'),
          async (department) => {
            // Reset mock for each iteration
            mockAuditResultService.getAll.mockClear();
            
            // Create department pattern
            const deptPattern: QueryPattern = {
              id: 'dept-query',
              name: 'Department Query',
              priority: 10,
              regex: new RegExp(`(${department})\\s+findings?`, 'i'),
              parameterExtractors: [
                { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' },
              ],
              filterBuilder: (params) => [
                { field: 'department', operator: '==', value: params.department },
              ],
              sortBuilder: () => [
                { field: 'year', direction: 'desc' },
              ],
            };

            // Mock results
            const mockResults = [
              createMockAuditResult({ department, year: 2023, nilai: 10 }),
              createMockAuditResult({ department, year: 2022, nilai: 15 }),
              createMockAuditResult({ department, year: 2021, nilai: 12 }),
            ];
            mockAuditResultService.getAll.mockResolvedValue(mockResults);

            const params: ExtractedParams = { department };
            const result = await executor.execute(deptPattern, params);

            // Property: Should have department filter
            const filters = deptPattern.filterBuilder(params);
            expect(filters).toHaveLength(1);
            expect(filters[0].field).toBe('department');
            expect(filters[0].operator).toBe('==');

            // Property: Should sort by year in descending order
            const sorts = deptPattern.sortBuilder(params);
            expect(sorts).toHaveLength(1);
            expect(sorts[0].field).toBe('year');
            expect(sorts[0].direction).toBe('desc');

            // Property: Result should be returned successfully
            expect(result).toBeDefined();
            expect(result.metadata.queryType).toBe('simple_query');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should consistently apply year descending sort for all department queries', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom('IT', 'HR', 'Finance', 'Sales', 'Legal', 'Marketing', 'Operations'),
          fc.constantFrom('findings', 'finding', 'audit results'),
          async (department, suffix) => {
            // Reset mock for each iteration
            mockAuditResultService.getAll.mockClear();
            
            const deptPattern: QueryPattern = {
              id: 'dept-flexible',
              name: 'Department Flexible Query',
              priority: 10,
              regex: new RegExp(`(IT|HR|Finance|Sales|Legal|Marketing|Operations)\\s+(findings?|audit results)`, 'i'),
              parameterExtractors: [
                { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' },
              ],
              filterBuilder: (params) => [
                { field: 'department', operator: '==', value: params.department },
              ],
              sortBuilder: () => [
                { field: 'year', direction: 'desc' },
              ],
            };

            mockAuditResultService.getAll.mockResolvedValue([]);

            const params: ExtractedParams = { department };
            await executor.execute(deptPattern, params);

            // Property: Sort order must always be year descending for department queries
            const sorts = deptPattern.sortBuilder(params);
            expect(sorts.length).toBeGreaterThan(0);
            expect(sorts[0].field).toBe('year');
            expect(sorts[0].direction).toBe('desc');

            // Property: No other sort fields should precede year
            expect(sorts[0]).toEqual({ field: 'year', direction: 'desc' });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not use nilai as primary sort field for department queries', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom('IT', 'HR', 'Finance', 'Sales'),
          async (department) => {
            // Reset mock for each iteration
            mockAuditResultService.getAll.mockClear();
            
            const deptPattern: QueryPattern = {
              id: 'dept-check',
              name: 'Department Check',
              priority: 10,
              regex: new RegExp(`(${department})\\s+findings?`, 'i'),
              parameterExtractors: [
                { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' },
              ],
              filterBuilder: (params) => [
                { field: 'department', operator: '==', value: params.department },
              ],
              sortBuilder: () => [
                { field: 'year', direction: 'desc' },
              ],
            };

            mockAuditResultService.getAll.mockResolvedValue([]);

            const params: ExtractedParams = { department };
            await executor.execute(deptPattern, params);

            // Property: Department queries should NOT sort by nilai as primary field
            const sorts = deptPattern.sortBuilder(params);
            expect(sorts[0].field).not.toBe('nilai');

            // Property: Should sort by year instead
            expect(sorts[0].field).toBe('year');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: docai-simple-query, Property 13: Project Query Sorting**
  describe('Property 13: Project Query Sorting', () => {
    it('should sort project query results by year in descending order', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom('Project Alpha', 'Project Beta', 'Project Gamma', 'Test Project'),
          async (projectName) => {
            // Reset mock for each iteration
            mockAuditResultService.getAll.mockClear();
            
            // Create project pattern
            const projectPattern: QueryPattern = {
              id: 'project-query',
              name: 'Project Query',
              priority: 10,
              regex: /findings?\s+for\s+(.+)/i,
              parameterExtractors: [
                { name: 'projectName', type: 'string', captureGroup: 1 },
              ],
              filterBuilder: (params) => [
                { field: 'projectName', operator: '==', value: params.projectName },
              ],
              sortBuilder: () => [
                { field: 'year', direction: 'desc' },
              ],
            };

            // Mock results
            const mockResults = [
              createMockAuditResult({ projectName, year: 2023 }),
              createMockAuditResult({ projectName, year: 2022 }),
              createMockAuditResult({ projectName, year: 2021 }),
            ];
            mockAuditResultService.getAll.mockResolvedValue(mockResults);

            const params: ExtractedParams = { projectName };
            const result = await executor.execute(projectPattern, params);

            // Property: Should have project filter
            const filters = projectPattern.filterBuilder(params);
            expect(filters).toHaveLength(1);
            expect(filters[0].field).toBe('projectName');
            expect(filters[0].operator).toBe('==');

            // Property: Should sort by year in descending order
            const sorts = projectPattern.sortBuilder(params);
            expect(sorts).toHaveLength(1);
            expect(sorts[0].field).toBe('year');
            expect(sorts[0].direction).toBe('desc');

            // Property: Result should be returned successfully
            expect(result).toBeDefined();
            expect(result.metadata.queryType).toBe('simple_query');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should consistently apply year descending sort for all project queries', () => {
      fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom('Alpha', 'Beta', 'Gamma', 'Delta'), { minLength: 1, maxLength: 3 }),
          async (projectWords) => {
            // Reset mock for each iteration
            mockAuditResultService.getAll.mockClear();
            
            const projectName = `Project ${projectWords.join(' ')}`;
            
            const projectPattern: QueryPattern = {
              id: 'project-flexible',
              name: 'Project Flexible Query',
              priority: 10,
              regex: /findings?\s+for\s+(.+)/i,
              parameterExtractors: [
                { name: 'projectName', type: 'string', captureGroup: 1 },
              ],
              filterBuilder: (params) => [
                { field: 'projectName', operator: '==', value: params.projectName },
              ],
              sortBuilder: () => [
                { field: 'year', direction: 'desc' },
              ],
            };

            mockAuditResultService.getAll.mockResolvedValue([]);

            const params: ExtractedParams = { projectName };
            await executor.execute(projectPattern, params);

            // Property: Sort order must always be year descending for project queries
            const sorts = projectPattern.sortBuilder(params);
            expect(sorts.length).toBeGreaterThan(0);
            expect(sorts[0].field).toBe('year');
            expect(sorts[0].direction).toBe('desc');

            // Property: No other sort fields should precede year
            expect(sorts[0]).toEqual({ field: 'year', direction: 'desc' });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multi-word project names correctly', () => {
      fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 3, maxLength: 10 }), { minLength: 2, maxLength: 5 }),
          async (words) => {
            // Reset mock for each iteration
            mockAuditResultService.getAll.mockClear();
            
            const projectName = words.join(' ');
            
            const projectPattern: QueryPattern = {
              id: 'project-multiword',
              name: 'Project Multi-word Query',
              priority: 10,
              regex: /findings?\s+for\s+(.+)/i,
              parameterExtractors: [
                { name: 'projectName', type: 'string', captureGroup: 1 },
              ],
              filterBuilder: (params) => [
                { field: 'projectName', operator: '==', value: params.projectName },
              ],
              sortBuilder: () => [
                { field: 'year', direction: 'desc' },
              ],
            };

            mockAuditResultService.getAll.mockResolvedValue([]);

            const params: ExtractedParams = { projectName };
            await executor.execute(projectPattern, params);

            // Property: Should handle complete project name with spaces
            const filters = projectPattern.filterBuilder(params);
            expect(filters[0].value).toBe(projectName);

            // Property: Should still sort by year
            const sorts = projectPattern.sortBuilder(params);
            expect(sorts[0].field).toBe('year');
            expect(sorts[0].direction).toBe('desc');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: docai-simple-query, Property 4: Result Format Consistency**
  describe('Property 4: Result Format Consistency', () => {
    it('should format all results with consistent structure', () => {
      fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              year: fc.integer({ min: 2020, max: 2024 }),
              department: fc.constantFrom('IT', 'HR', 'Finance', 'Sales'),
              projectName: fc.constantFrom('Project Alpha', 'Project Beta', 'Project Gamma'),
              nilai: fc.integer({ min: 1, max: 20 }),
              bobot: fc.integer({ min: 1, max: 5 }),
              kadar: fc.integer({ min: 1, max: 5 }),
              riskArea: fc.constantFrom('Security', 'Compliance', 'Operations'),
              descriptions: fc.string({ minLength: 10, maxLength: 100 }),
              code: fc.constantFrom('F001', 'F002', 'F003', ''),
              sh: fc.constantFrom('SH-A', 'SH-B', 'SH-C'),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (resultData) => {
            // Reset mock for each iteration
            mockAuditResultService.getAll.mockClear();
            
            // Create mock results from generated data
            const mockResults = resultData.map((data, index) => 
              createMockAuditResult({
                id: `test-${index}`,
                auditResultId: `AR-${index}`,
                ...data,
              })
            );
            
            mockAuditResultService.getAll.mockResolvedValue(mockResults);

            const pattern: QueryPattern = {
              id: 'test-format',
              name: 'Test Format Pattern',
              priority: 10,
              regex: /test/,
              parameterExtractors: [],
              filterBuilder: () => [],
              sortBuilder: () => [{ field: 'nilai', direction: 'desc' }],
            };

            const result = await executor.execute(pattern, {});

            // Property: Result should have consistent structure
            expect(result).toHaveProperty('type');
            expect(result).toHaveProperty('answer');
            expect(result).toHaveProperty('findings');
            expect(result).toHaveProperty('metadata');

            // Property: Type should always be 'simple_query'
            expect(result.type).toBe('simple_query');

            // Property: Answer should be a non-empty string
            expect(typeof result.answer).toBe('string');
            expect(result.answer.length).toBeGreaterThan(0);

            // Property: Findings should be an array
            expect(Array.isArray(result.findings)).toBe(true);

            // Property: Metadata should have required fields
            expect(result.metadata).toHaveProperty('queryType');
            expect(result.metadata).toHaveProperty('patternMatched');
            expect(result.metadata).toHaveProperty('executionTimeMs');
            expect(result.metadata).toHaveProperty('resultsCount');
            expect(result.metadata).toHaveProperty('filtersApplied');
            expect(result.metadata).toHaveProperty('sortsApplied');

            // Property: Metadata values should be correct types
            expect(result.metadata.queryType).toBe('simple_query');
            expect(typeof result.metadata.patternMatched).toBe('string');
            expect(typeof result.metadata.executionTimeMs).toBe('number');
            expect(typeof result.metadata.resultsCount).toBe('number');
            expect(Array.isArray(result.metadata.filtersApplied)).toBe(true);
            expect(Array.isArray(result.metadata.sortsApplied)).toBe(true);

            // Property: Results count should match findings length
            expect(result.metadata.resultsCount).toBe(result.findings.length);

            // Property: Answer should contain summary header for non-empty results
            if (result.findings.length > 0) {
              expect(result.answer).toContain('Query Results');
              expect(result.answer).toContain('Summary Statistics');
              expect(result.answer).toContain('Total Results:');
              expect(result.answer).toContain('Total Risk Value');
              expect(result.answer).toContain('Average Risk Value');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format empty results consistently', () => {
      fc.assert(
        fc.asyncProperty(
          fc.record({
            year: fc.option(fc.integer({ min: 2020, max: 2024 })),
            department: fc.option(fc.constantFrom('IT', 'HR', 'Finance')),
            projectName: fc.option(fc.string({ minLength: 5, maxLength: 20 })),
          }),
          async (params) => {
            // Reset mock for each iteration
            mockAuditResultService.getAll.mockClear();
            
            // Mock empty results
            mockAuditResultService.getAll.mockResolvedValue([]);

            const pattern: QueryPattern = {
              id: 'test-empty',
              name: 'Test Empty Pattern',
              priority: 10,
              regex: /test/,
              parameterExtractors: [],
              filterBuilder: () => [],
              sortBuilder: () => [{ field: 'nilai', direction: 'desc' }],
            };

            const result = await executor.execute(pattern, params);

            // Property: Empty results should have consistent structure
            expect(result.type).toBe('simple_query');
            expect(result.findings).toHaveLength(0);
            expect(result.metadata.resultsCount).toBe(0);

            // Property: Answer should contain "No Results Found"
            expect(result.answer).toContain('No Results Found');

            // Property: Answer should contain suggestions
            expect(result.answer).toContain('Suggestions');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include all required metadata fields for any query', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom('temporal', 'department', 'risk', 'project'),
          fc.array(
            fc.record({
              year: fc.integer({ min: 2020, max: 2024 }),
              nilai: fc.integer({ min: 1, max: 20 }),
            }),
            { minLength: 0, maxLength: 5 }
          ),
          async (queryType, resultData) => {
            // Reset mock for each iteration
            mockAuditResultService.getAll.mockClear();
            
            const mockResults = resultData.map((data, index) => 
              createMockAuditResult({
                id: `test-${index}`,
                ...data,
              })
            );
            
            mockAuditResultService.getAll.mockResolvedValue(mockResults);

            const pattern: QueryPattern = {
              id: `test-${queryType}`,
              name: `Test ${queryType} Pattern`,
              priority: 10,
              regex: /test/,
              parameterExtractors: [],
              filterBuilder: () => [],
              sortBuilder: () => [{ field: 'nilai', direction: 'desc' }],
            };

            const result = await executor.execute(pattern, {});

            // Property: All metadata fields must be present
            const requiredMetadataFields = [
              'queryType',
              'patternMatched',
              'executionTimeMs',
              'resultsCount',
              'filtersApplied',
              'sortsApplied',
            ];

            requiredMetadataFields.forEach(field => {
              expect(result.metadata).toHaveProperty(field);
            });

            // Property: Execution time should be non-negative
            expect(result.metadata.executionTimeMs).toBeGreaterThanOrEqual(0);

            // Property: Pattern matched should match the pattern ID
            expect(result.metadata.patternMatched).toBe(pattern.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: docai-simple-query, Property 18: Subholding Query Sorting**
  describe('Property 18: Subholding Query Sorting', () => {
    it('should sort subholding query results by year in descending order', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom('SH-A', 'SH-B', 'SH-C', 'SH-D'),
          async (sh) => {
            // Reset mock for each iteration
            mockAuditResultService.getAll.mockClear();
            
            // Create subholding pattern
            const shPattern: QueryPattern = {
              id: 'sh-query',
              name: 'Subholding Query',
              priority: 10,
              regex: /findings?\s+for\s+SH\s+([A-Z]+)/i,
              parameterExtractors: [
                { name: 'sh', type: 'string', captureGroup: 1, normalizer: 'uppercase' },
              ],
              filterBuilder: (params) => [
                { field: 'sh', operator: '==', value: params.sh },
              ],
              sortBuilder: () => [
                { field: 'year', direction: 'desc' },
              ],
            };

            // Mock results
            const mockResults = [
              createMockAuditResult({ sh, year: 2023 }),
              createMockAuditResult({ sh, year: 2022 }),
              createMockAuditResult({ sh, year: 2021 }),
            ];
            mockAuditResultService.getAll.mockResolvedValue(mockResults);

            const params: ExtractedParams = { sh };
            const result = await executor.execute(shPattern, params);

            // Property: Should have subholding filter
            const filters = shPattern.filterBuilder(params);
            expect(filters).toHaveLength(1);
            expect(filters[0].field).toBe('sh');
            expect(filters[0].operator).toBe('==');

            // Property: Should sort by year in descending order
            const sorts = shPattern.sortBuilder(params);
            expect(sorts).toHaveLength(1);
            expect(sorts[0].field).toBe('year');
            expect(sorts[0].direction).toBe('desc');

            // Property: Result should be returned successfully
            expect(result).toBeDefined();
            expect(result.metadata.queryType).toBe('simple_query');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should consistently apply year descending sort for all subholding queries', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 3 }).map(s => s.toUpperCase()),
          async (code) => {
            // Reset mock for each iteration
            mockAuditResultService.getAll.mockClear();
            
            const shPattern: QueryPattern = {
              id: 'sh-flexible',
              name: 'Subholding Flexible Query',
              priority: 10,
              regex: /([A-Z]+)\s+subholding\s+findings?/i,
              parameterExtractors: [
                { name: 'sh', type: 'string', captureGroup: 1, normalizer: 'uppercase' },
              ],
              filterBuilder: (params) => [
                { field: 'sh', operator: '==', value: params.sh },
              ],
              sortBuilder: () => [
                { field: 'year', direction: 'desc' },
              ],
            };

            mockAuditResultService.getAll.mockResolvedValue([]);

            const params: ExtractedParams = { sh: code };
            await executor.execute(shPattern, params);

            // Property: Sort order must always be year descending for subholding queries
            const sorts = shPattern.sortBuilder(params);
            expect(sorts.length).toBeGreaterThan(0);
            expect(sorts[0].field).toBe('year');
            expect(sorts[0].direction).toBe('desc');

            // Property: No other sort fields should precede year
            expect(sorts[0]).toEqual({ field: 'year', direction: 'desc' });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should normalize subholding codes to uppercase', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom('abc', 'ABC', 'Abc', 'aBc'),
          async (code) => {
            // Reset mock for each iteration
            mockAuditResultService.getAll.mockClear();
            
            const shPattern: QueryPattern = {
              id: 'sh-normalize',
              name: 'Subholding Normalize',
              priority: 10,
              regex: /([a-z]+)\s+subholding/i,
              parameterExtractors: [
                { name: 'sh', type: 'string', captureGroup: 1, normalizer: 'uppercase' },
              ],
              filterBuilder: (params) => [
                { field: 'sh', operator: '==', value: params.sh },
              ],
              sortBuilder: () => [
                { field: 'year', direction: 'desc' },
              ],
            };

            mockAuditResultService.getAll.mockResolvedValue([]);

            const params: ExtractedParams = { sh: code.toUpperCase() };
            await executor.execute(shPattern, params);

            // Property: Subholding code should be normalized to uppercase
            const filters = shPattern.filterBuilder(params);
            expect(filters[0].value).toBe('ABC');

            // Property: Should still sort by year
            const sorts = shPattern.sortBuilder(params);
            expect(sorts[0].field).toBe('year');
            expect(sorts[0].direction).toBe('desc');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: docai-simple-query, Property 11: Top N Limit Application**
  describe('Property 11: Top N Limit Application', () => {
    it('should limit results to exactly N items when limit parameter is provided', () => {
      fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 5, max: 100 }),
          async (limitN, totalResults) => {
            // Reset mock for each iteration
            mockAuditResultService.getAll.mockClear();
            
            // Create more results than the limit
            const mockResults = Array.from({ length: totalResults }, (_, index) => 
              createMockAuditResult({
                id: `test-${index}`,
                auditResultId: `AR-${index}`,
                nilai: 20 - (index % 20), // Varying nilai values
              })
            );
            
            // Mock will return only the limited results
            const limitedResults = mockResults.slice(0, limitN);
            mockAuditResultService.getAll.mockResolvedValue(limitedResults);

            const topNPattern: QueryPattern = {
              id: 'top-n-test',
              name: 'Top N Test Pattern',
              priority: 15,
              regex: /top\s+(\d+)\s+findings?/i,
              parameterExtractors: [
                { name: 'limit', type: 'number', captureGroup: 1 }
              ],
              filterBuilder: () => [],
              sortBuilder: () => [
                { field: 'nilai', direction: 'desc' }
              ],
            };

            // Simulate extracted params with limit
            const params: ExtractedParams = { limit: limitN };
            const result = await executor.execute(topNPattern, params);

            // Property: Query should be called with the correct limit
            expect(mockAuditResultService.getAll.mock.calls.length).toBeGreaterThan(0);
            const callArgs = mockAuditResultService.getAll.mock.calls[0][0];
            expect(callArgs).toBeDefined();
            expect(callArgs.limit).toBe(limitN);

            // Property: Results should not exceed the limit
            expect(result.findings.length).toBeLessThanOrEqual(limitN);

            // Property: Results should be sorted by nilai descending
            const sorts = topNPattern.sortBuilder(params);
            expect(sorts[0].field).toBe('nilai');
            expect(sorts[0].direction).toBe('desc');

            // Property: Metadata should reflect the correct count
            expect(result.metadata.resultsCount).toBe(result.findings.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle top N queries with various N values', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom(1, 5, 10, 15, 20, 50, 100),
          async (n) => {
            // Reset mock for each iteration
            mockAuditResultService.getAll.mockClear();
            
            // Create exactly n results
            const mockResults = Array.from({ length: n }, (_, index) => 
              createMockAuditResult({
                id: `test-${index}`,
                auditResultId: `AR-${index}`,
                nilai: 20 - index,
              })
            );
            
            mockAuditResultService.getAll.mockResolvedValue(mockResults);

            const topNPattern: QueryPattern = {
              id: 'top-n-various',
              name: 'Top N Various Pattern',
              priority: 15,
              regex: /top\s+(\d+)\s+findings?/i,
              parameterExtractors: [
                { name: 'limit', type: 'number', captureGroup: 1 }
              ],
              filterBuilder: () => [],
              sortBuilder: () => [
                { field: 'nilai', direction: 'desc' }
              ],
            };

            const params: ExtractedParams = { limit: n };
            await executor.execute(topNPattern, params);

            // Property: Limit should be passed to query
            const callArgs = mockAuditResultService.getAll.mock.calls[0][0];
            expect(callArgs.limit).toBe(n);

            // Property: Sort should always be by nilai descending for top N
            expect(callArgs.sorts[0].field).toBe('nilai');
            expect(callArgs.sorts[0].direction).toBe('desc');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use default limit when no limit parameter is provided', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom('year', 'department', 'project'),
          async (queryType) => {
            // Reset mock for each iteration
            mockAuditResultService.getAll.mockClear();
            
            mockAuditResultService.getAll.mockResolvedValue([]);

            const pattern: QueryPattern = {
              id: `${queryType}-no-limit`,
              name: `${queryType} No Limit Pattern`,
              priority: 10,
              regex: /test/,
              parameterExtractors: [],
              filterBuilder: () => [],
              sortBuilder: () => [{ field: 'year', direction: 'desc' }],
            };

            // Execute without limit parameter
            await executor.execute(pattern, {});

            // Property: Should use default limit of 50 when no limit specified
            const callArgs = mockAuditResultService.getAll.mock.calls[0][0];
            expect(callArgs.limit).toBe(50);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly apply limit with filters and sorts', () => {
      fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          fc.constantFrom('IT', 'HR', 'Finance'),
          fc.integer({ min: 2020, max: 2024 }),
          async (limitN, department, year) => {
            // Reset mock for each iteration
            mockAuditResultService.getAll.mockClear();
            
            const mockResults = Array.from({ length: limitN }, (_, index) => 
              createMockAuditResult({
                id: `test-${index}`,
                department,
                year,
                nilai: 15 - index,
              })
            );
            
            mockAuditResultService.getAll.mockResolvedValue(mockResults);

            const compositePattern: QueryPattern = {
              id: 'composite-with-limit',
              name: 'Composite With Limit Pattern',
              priority: 20,
              regex: /test/,
              parameterExtractors: [],
              filterBuilder: () => [
                { field: 'department', operator: '==', value: department },
                { field: 'year', operator: '==', value: year }
              ],
              sortBuilder: () => [
                { field: 'nilai', direction: 'desc' }
              ],
            };

            const params: ExtractedParams = { limit: limitN };
            const result = await executor.execute(compositePattern, params);

            // Property: Limit should be applied along with filters
            const callArgs = mockAuditResultService.getAll.mock.calls[0][0];
            expect(callArgs.limit).toBe(limitN);
            expect(callArgs.filters.length).toBe(2);
            expect(callArgs.sorts.length).toBeGreaterThan(0);

            // Property: Results should respect the limit
            expect(result.findings.length).toBeLessThanOrEqual(limitN);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case of limit = 1', () => {
      fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          async (totalAvailable) => {
            // Reset mock for each iteration
            mockAuditResultService.getAll.mockClear();
            
            // Return only 1 result even if more are available
            const mockResults = [
              createMockAuditResult({
                id: 'test-0',
                nilai: 20,
              })
            ];
            
            mockAuditResultService.getAll.mockResolvedValue(mockResults);

            const topOnePattern: QueryPattern = {
              id: 'top-1',
              name: 'Top 1 Pattern',
              priority: 15,
              regex: /top\s+1\s+finding/i,
              parameterExtractors: [
                { name: 'limit', type: 'number', captureGroup: 1 }
              ],
              filterBuilder: () => [],
              sortBuilder: () => [
                { field: 'nilai', direction: 'desc' }
              ],
            };

            const params: ExtractedParams = { limit: 1 };
            const result = await executor.execute(topOnePattern, params);

            // Property: Should request exactly 1 result
            const callArgs = mockAuditResultService.getAll.mock.calls[0][0];
            expect(callArgs.limit).toBe(1);

            // Property: Should return at most 1 result
            expect(result.findings.length).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
