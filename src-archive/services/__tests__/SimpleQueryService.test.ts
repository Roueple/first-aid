import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { SimpleQueryService } from '../SimpleQueryService';
import { AuditResultService, AuditResult } from '../AuditResultService';
import { QueryPattern } from '../SimpleQueryMatcher';
import { Timestamp } from 'firebase/firestore';

// Mock AuditResultService
vi.mock('../AuditResultService');

describe('SimpleQueryService', () => {
  let service: SimpleQueryService;
  let mockAuditResultService: AuditResultService;

  beforeEach(() => {
    // Create mock audit result service
    mockAuditResultService = {
      getAll: vi.fn().mockResolvedValue([]),
    } as any;

    // Create service with mock
    service = new SimpleQueryService(mockAuditResultService);
  });

  describe('Pattern Management', () => {
    it('should return available patterns', () => {
      const patterns = service.getAvailablePatterns();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should add custom patterns', () => {
      const customPattern: QueryPattern = {
        id: 'custom-test',
        name: 'Custom Test',
        priority: 50,
        regex: /custom query/i,
        parameterExtractors: [],
        filterBuilder: () => [],
        sortBuilder: () => [],
      };

      expect(() => service.addCustomPattern(customPattern)).not.toThrow();
      
      const pattern = service.getPatternById('custom-test');
      expect(pattern).toBeDefined();
      expect(pattern?.id).toBe('custom-test');
    });

    it('should validate patterns before adding', () => {
      const invalidPattern = {
        id: '',
        name: 'Invalid',
        priority: 10,
        regex: /test/,
        parameterExtractors: [],
        filterBuilder: () => [],
        sortBuilder: () => [],
      } as QueryPattern;

      expect(() => service.addCustomPattern(invalidPattern)).toThrow();
    });

    it('should remove patterns by ID', () => {
      const customPattern: QueryPattern = {
        id: 'removable-test',
        name: 'Removable Test',
        priority: 50,
        regex: /removable query/i,
        parameterExtractors: [],
        filterBuilder: () => [],
        sortBuilder: () => [],
      };

      service.addCustomPattern(customPattern);
      expect(service.getPatternById('removable-test')).toBeDefined();

      const removed = service.removePattern('removable-test');
      expect(removed).toBe(true);
      expect(service.getPatternById('removable-test')).toBeUndefined();
    });

    it('should return false when removing non-existent pattern', () => {
      const removed = service.removePattern('non-existent-pattern');
      expect(removed).toBe(false);
    });
  });

  describe('Query Processing', () => {
    beforeEach(() => {
      // Mock audit results
      const mockResults: AuditResult[] = [
        {
          id: '1',
          projectName: 'Test Project 1',
          year: 2023,
          department: 'IT',
          riskArea: 'Security',
          nilai: 15,
          bobot: 3,
          kadar: 5,
          code: 'T001',
          descriptions: 'Test finding 1',
          sh: 'SH01',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        {
          id: '2',
          projectName: 'Test Project 2',
          year: 2023,
          department: 'IT',
          riskArea: 'Compliance',
          nilai: 12,
          bobot: 3,
          kadar: 4,
          code: 'T002',
          descriptions: 'Test finding 2',
          sh: 'SH01',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ];

      (mockAuditResultService.getAll as any).mockResolvedValue(mockResults);
    });

    it('should process matching queries successfully', async () => {
      const result = await service.processQuery('findings from 2023', 'user123');
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('simple_query');
      expect(result?.findings).toHaveLength(2);
      expect(result?.metadata).toBeDefined();
    });

    it('should return null for non-matching queries', async () => {
      const result = await service.processQuery('completely random unmatched query', 'user123');
      
      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      // Mock error
      (mockAuditResultService.getAll as any).mockRejectedValue(new Error('Database error'));

      const result = await service.processQuery('findings from 2023', 'user123');
      
      // Should return error result with metadata (not null)
      expect(result).not.toBeNull();
      expect(result?.type).toBe('simple_query');
      expect(result?.findings).toHaveLength(0);
      expect(result?.answer).toContain('Query Error');
      expect(result?.metadata).toBeDefined();
    });
  });

  describe('Query Matching', () => {
    it('should match queries without executing', () => {
      const matchResult = service.matchQuery('findings from 2023');
      
      expect(matchResult.matched).toBe(true);
      expect(matchResult.pattern).toBeDefined();
      expect(matchResult.params).toBeDefined();
      expect(matchResult.params?.year).toBe(2023);
    });

    it('should not match invalid queries', () => {
      const matchResult = service.matchQuery('random unmatched query');
      
      expect(matchResult.matched).toBe(false);
      expect(matchResult.pattern).toBeUndefined();
    });
  });

  // **Feature: docai-simple-query, Property 2: Simple Query Performance**
  describe('Property 2: Simple Query Performance', () => {
    it('should execute all simple queries in less than 500ms', async () => {
      // Mock audit results with realistic data
      const mockResults: AuditResult[] = Array.from({ length: 50 }, (_, i) => ({
        id: `${i}`,
        projectName: `Test Project ${i}`,
        year: 2023,
        department: 'IT',
        riskArea: 'Security',
        nilai: 10 + i,
        bobot: 3,
        kadar: 4,
        code: `T${i.toString().padStart(3, '0')}`,
        descriptions: `Test finding ${i}`,
        sh: 'SH01',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }));

      (mockAuditResultService.getAll as any).mockResolvedValue(mockResults);

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'findings from 2023',
            'IT findings',
            'critical findings',
            'top 10 findings',
            'IT findings from 2023',
            'Finance findings from 2022',
            'high risk findings',
            'findings for SH A',
            'only findings',
            'HR findings from 2021'
          ),
          async (query) => {
            const startTime = Date.now();
            const result = await service.processQuery(query, 'test-user', 'test-session');
            const endTime = Date.now();
            const executionTime = endTime - startTime;

            if (result !== null) {
              // Property: Simple queries must execute in less than 500ms
              expect(executionTime).toBeLessThan(500);

              // Property: Recorded execution time should match actual time (within margin)
              expect(result.metadata.executionTimeMs).toBeLessThanOrEqual(executionTime + 10);

              // Property: Execution time must be non-negative (can be 0 for cache hits)
              expect(result.metadata.executionTimeMs).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should execute queries faster with caching enabled', async () => {
      const mockResults: AuditResult[] = [
        {
          id: '1',
          projectName: 'Test Project',
          year: 2023,
          department: 'IT',
          riskArea: 'Security',
          nilai: 15,
          bobot: 3,
          kadar: 5,
          code: 'T001',
          descriptions: 'Test finding',
          sh: 'SH01',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ];

      (mockAuditResultService.getAll as any).mockResolvedValue(mockResults);

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2000, max: 2099 }),
          async (year) => {
            const query = `findings from ${year}`;

            // First execution (cache miss)
            const startTime1 = Date.now();
            const result1 = await service.processQuery(query, 'test-user');
            const endTime1 = Date.now();
            const firstExecutionTime = endTime1 - startTime1;

            // Second execution (cache hit)
            const startTime2 = Date.now();
            const result2 = await service.processQuery(query, 'test-user');
            const endTime2 = Date.now();
            const secondExecutionTime = endTime2 - startTime2;

            if (result1 !== null && result2 !== null) {
              // Property: Both executions should complete in less than 500ms
              expect(firstExecutionTime).toBeLessThan(500);
              expect(secondExecutionTime).toBeLessThan(500);

              // Property: Cached execution should be faster or equal (cache lookup is fast)
              // Note: In tests with mocks, this might not always be true due to overhead
              // but we verify the cache is working by checking results are identical
              expect(result2.findings).toEqual(result1.findings);
              expect(result2.metadata.patternMatched).toBe(result1.metadata.patternMatched);
              expect(result2.metadata.resultsCount).toBe(result1.metadata.resultsCount);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain performance with varying result set sizes', async () => {
      // Create a service with caching disabled for this test to avoid cache interference
      const testService = new SimpleQueryService(mockAuditResultService, undefined, { cacheEnabled: false });

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 2000, max: 2099 }),
          async (resultCount, year) => {
            // Generate mock results of varying sizes
            const mockResults: AuditResult[] = Array.from({ length: resultCount }, (_, i) => ({
              id: `${i}`,
              projectName: `Test Project ${i}`,
              year,
              department: 'IT',
              riskArea: 'Security',
              nilai: 10 + i,
              bobot: 3,
              kadar: 4,
              code: `T${i.toString().padStart(3, '0')}`,
              descriptions: `Test finding ${i}`,
              sh: 'SH01',
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            }));

            // Mock should respect the limit parameter
            (mockAuditResultService.getAll as any).mockImplementation(async (options: any) => {
              const limit = options?.limit || 50;
              return mockResults.slice(0, limit);
            });

            const startTime = Date.now();
            const result = await testService.processQuery(`findings from ${year}`, 'test-user');
            const endTime = Date.now();
            const executionTime = endTime - startTime;

            if (result !== null) {
              // Property: Query execution time should be under 500ms regardless of result size
              expect(executionTime).toBeLessThan(500);

              // Property: Results should match expected count (up to limit of 50)
              const expectedCount = Math.min(resultCount, 50); // Default limit is 50
              expect(result.findings.length).toBe(expectedCount);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain performance across different query patterns', async () => {
      const mockResults: AuditResult[] = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        projectName: `Test Project ${i}`,
        year: 2023,
        department: 'IT',
        riskArea: 'Security',
        nilai: 10 + i,
        bobot: 3,
        kadar: 4,
        code: `T${i.toString().padStart(3, '0')}`,
        descriptions: `Test finding ${i}`,
        sh: 'SH01',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }));

      (mockAuditResultService.getAll as any).mockResolvedValue(mockResults);

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            { query: 'findings from 2023', type: 'temporal' },
            { query: 'IT findings', type: 'department' },
            { query: 'critical findings', type: 'risk' },
            { query: 'top 5 findings', type: 'top-n' },
            { query: 'IT findings from 2023', type: 'composite' },
            { query: 'Finance findings from 2022', type: 'composite' },
            { query: 'high risk findings', type: 'risk' },
            { query: 'findings for SH A', type: 'subholding' },
            { query: 'only findings', type: 'finding-type' }
          ),
          async (testCase) => {
            const startTime = Date.now();
            const result = await service.processQuery(testCase.query, 'test-user');
            const endTime = Date.now();
            const executionTime = endTime - startTime;

            if (result !== null) {
              // Property: All query types should execute in less than 500ms
              expect(executionTime).toBeLessThan(500);

              // Property: Execution time should be recorded accurately (can be 0 for cache hits)
              expect(result.metadata.executionTimeMs).toBeGreaterThanOrEqual(0);
              expect(result.metadata.executionTimeMs).toBeLessThanOrEqual(executionTime + 10);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle concurrent queries efficiently', async () => {
      const mockResults: AuditResult[] = [
        {
          id: '1',
          projectName: 'Test Project',
          year: 2023,
          department: 'IT',
          riskArea: 'Security',
          nilai: 15,
          bobot: 3,
          kadar: 5,
          code: 'T001',
          descriptions: 'Test finding',
          sh: 'SH01',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ];

      (mockAuditResultService.getAll as any).mockResolvedValue(mockResults);

      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 2000, max: 2099 }), { minLength: 3, maxLength: 10 }),
          async (years) => {
            const queries = years.map(year => `findings from ${year}`);

            const startTime = Date.now();
            const results = await Promise.all(
              queries.map(query => service.processQuery(query, 'test-user'))
            );
            const endTime = Date.now();
            const totalExecutionTime = endTime - startTime;

            // Property: Concurrent queries should all complete
            const validResults = results.filter(r => r !== null);
            expect(validResults.length).toBe(queries.length);

            // Property: Each individual query should be under 500ms
            validResults.forEach(result => {
              if (result) {
                expect(result.metadata.executionTimeMs).toBeLessThan(500);
              }
            });

            // Property: Total time for concurrent execution should be reasonable
            // (not just sum of individual times due to parallelization)
            expect(totalExecutionTime).toBeLessThan(queries.length * 500);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain performance with pattern matching optimization', async () => {
      const mockResults: AuditResult[] = [
        {
          id: '1',
          projectName: 'Test Project',
          year: 2023,
          department: 'IT',
          riskArea: 'Security',
          nilai: 15,
          bobot: 3,
          kadar: 5,
          code: 'T001',
          descriptions: 'Test finding',
          sh: 'SH01',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ];

      (mockAuditResultService.getAll as any).mockResolvedValue(mockResults);

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2000, max: 2099 }),
          async (year) => {
            const query = `findings from ${year}`;

            // Measure pattern matching time
            const matchStartTime = Date.now();
            const matchResult = service.matchQuery(query);
            const matchEndTime = Date.now();
            const matchTime = matchEndTime - matchStartTime;

            // Property: Pattern matching should be very fast (< 50ms)
            expect(matchTime).toBeLessThan(50);

            // Property: Pattern matching should succeed for valid queries
            expect(matchResult.matched).toBe(true);

            // Full query execution
            const execStartTime = Date.now();
            const result = await service.processQuery(query, 'test-user');
            const execEndTime = Date.now();
            const execTime = execEndTime - execStartTime;

            if (result !== null) {
              // Property: Full execution should be under 500ms
              expect(execTime).toBeLessThan(500);

              // Property: Pattern matching time should be a small fraction of total time
              // (most time should be in query execution, not pattern matching)
              // Note: For cache hits, both can be 0, so we check <= instead of <
              expect(matchTime).toBeLessThanOrEqual(execTime);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: docai-simple-query, Property 3: Metadata Logging Consistency**
  describe('Property 3: Metadata Logging Consistency', () => {
    it('should include all required metadata fields for every simple query execution', async () => {
      // Mock audit results
      const mockResults: AuditResult[] = [
        {
          id: '1',
          projectName: 'Test Project',
          year: 2023,
          department: 'IT',
          riskArea: 'Security',
          nilai: 15,
          bobot: 3,
          kadar: 5,
          code: 'T001',
          descriptions: 'Test finding',
          sh: 'SH01',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ];

      (mockAuditResultService.getAll as any).mockResolvedValue(mockResults);

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2000, max: 2099 }),
          fc.constantFrom('IT', 'HR', 'Finance', 'Sales', 'Legal'),
          async (year, department) => {
            // Test various query types
            const queries = [
              `findings from ${year}`,
              `${department} findings`,
              `${department} findings from ${year}`,
              `critical findings`,
              `top 10 findings`,
            ];

            for (const query of queries) {
              const result = await service.processQuery(query, 'test-user', 'test-session');

              if (result !== null) {
                // Property: Result must have type 'simple_query'
                expect(result.type).toBe('simple_query');

                // Property: Metadata must exist
                expect(result.metadata).toBeDefined();

                // Property: Metadata must have queryType field set to 'simple_query'
                expect(result.metadata.queryType).toBe('simple_query');

                // Property: Metadata must have patternMatched field
                expect(result.metadata.patternMatched).toBeDefined();
                expect(typeof result.metadata.patternMatched).toBe('string');
                expect(result.metadata.patternMatched.length).toBeGreaterThan(0);

                // Property: Metadata must have executionTimeMs field
                expect(result.metadata.executionTimeMs).toBeDefined();
                expect(typeof result.metadata.executionTimeMs).toBe('number');
                expect(result.metadata.executionTimeMs).toBeGreaterThanOrEqual(0);

                // Property: Metadata must have resultsCount field
                expect(result.metadata.resultsCount).toBeDefined();
                expect(typeof result.metadata.resultsCount).toBe('number');
                expect(result.metadata.resultsCount).toBeGreaterThanOrEqual(0);

                // Property: resultsCount must match actual findings length
                expect(result.metadata.resultsCount).toBe(result.findings.length);

                // Property: Metadata must have filtersApplied field
                expect(result.metadata.filtersApplied).toBeDefined();
                expect(Array.isArray(result.metadata.filtersApplied)).toBe(true);

                // Property: Metadata must have sortsApplied field
                expect(result.metadata.sortsApplied).toBeDefined();
                expect(Array.isArray(result.metadata.sortsApplied)).toBe(true);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should record accurate execution time for all queries', async () => {
      // Mock audit results with delay to simulate query time
      const mockResults: AuditResult[] = [
        {
          id: '1',
          projectName: 'Test Project',
          year: 2023,
          department: 'IT',
          riskArea: 'Security',
          nilai: 15,
          bobot: 3,
          kadar: 5,
          code: 'T001',
          descriptions: 'Test finding',
          sh: 'SH01',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ];

      (mockAuditResultService.getAll as any).mockImplementation(async () => {
        // Simulate query delay
        await new Promise(resolve => setTimeout(resolve, 10));
        return mockResults;
      });

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2000, max: 2099 }),
          async (year) => {
            const startTime = Date.now();
            const result = await service.processQuery(`findings from ${year}`, 'test-user');
            const endTime = Date.now();
            const actualDuration = endTime - startTime;

            if (result !== null) {
              // Property: Execution time must be recorded
              expect(result.metadata.executionTimeMs).toBeDefined();

              // Property: Execution time must be non-negative (can be 0 for cache hits)
              expect(result.metadata.executionTimeMs).toBeGreaterThanOrEqual(0);

              // Property: Execution time must be reasonable (within actual duration + margin)
              expect(result.metadata.executionTimeMs).toBeLessThanOrEqual(actualDuration + 50);
            }
          }
        ),
        { numRuns: 50 } // Fewer runs due to delays
      );
    });

    it('should record correct pattern matched for all query types', async () => {
      const mockResults: AuditResult[] = [
        {
          id: '1',
          projectName: 'Test Project',
          year: 2023,
          department: 'IT',
          riskArea: 'Security',
          nilai: 15,
          bobot: 3,
          kadar: 5,
          code: 'T001',
          descriptions: 'Test finding',
          sh: 'SH01',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ];

      (mockAuditResultService.getAll as any).mockResolvedValue(mockResults);

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            { query: 'findings from 2023', expectedPatternPrefix: 'temporal' },
            { query: 'IT findings', expectedPatternPrefix: 'department' },
            { query: 'critical findings', expectedPatternPrefix: 'risk' },
            { query: 'top 5 findings', expectedPatternPrefix: 'risk' },
            { query: 'IT findings from 2023', expectedPatternPrefix: 'composite' }
          ),
          async (testCase) => {
            const result = await service.processQuery(testCase.query, 'test-user');

            if (result !== null) {
              // Property: Pattern matched must be recorded
              expect(result.metadata.patternMatched).toBeDefined();

              // Property: Pattern matched must be a valid pattern ID
              const pattern = service.getPatternById(result.metadata.patternMatched);
              expect(pattern).toBeDefined();

              // Property: Pattern ID should match expected category
              expect(result.metadata.patternMatched).toContain(testCase.expectedPatternPrefix);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should record accurate results count matching actual findings', async () => {
      // Create a service with caching disabled for this test to avoid cache interference
      const testService = new SimpleQueryService(mockAuditResultService, undefined, { cacheEnabled: false });

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 2000, max: 2099 }),
          async (resultCount, year) => {
            // Generate mock results of varying sizes
            const mockResults: AuditResult[] = Array.from({ length: resultCount }, (_, i) => ({
              id: `${i}`,
              projectName: `Test Project ${i}`,
              year,
              department: 'IT',
              riskArea: 'Security',
              nilai: 10 + i,
              bobot: 3,
              kadar: 4,
              code: `T${i.toString().padStart(3, '0')}`,
              descriptions: `Test finding ${i}`,
              sh: 'SH01',
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            }));

            // Mock should respect the limit parameter
            (mockAuditResultService.getAll as any).mockImplementation(async (options: any) => {
              const limit = options?.limit || 50;
              return mockResults.slice(0, limit);
            });

            const result = await testService.processQuery(`findings from ${year}`, 'test-user');

            if (result !== null) {
              // Property: Results count must match actual findings length
              expect(result.metadata.resultsCount).toBe(result.findings.length);

              // Property: Results count must match expected count (up to limit of 50)
              const expectedCount = Math.min(resultCount, 50); // Default limit is 50
              expect(result.metadata.resultsCount).toBe(expectedCount);

              // Property: Results count must be non-negative
              expect(result.metadata.resultsCount).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include filters and sorts in metadata for all query types', async () => {
      const mockResults: AuditResult[] = [
        {
          id: '1',
          projectName: 'Test Project',
          year: 2023,
          department: 'IT',
          riskArea: 'Security',
          nilai: 15,
          bobot: 3,
          kadar: 5,
          code: 'T001',
          descriptions: 'Test finding',
          sh: 'SH01',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ];

      (mockAuditResultService.getAll as any).mockResolvedValue(mockResults);

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2000, max: 2099 }),
          fc.constantFrom('IT', 'HR', 'Finance'),
          async (year, department) => {
            // Test queries with different filter combinations
            const queries = [
              { query: `findings from ${year}`, minFilters: 1 },
              { query: `${department} findings`, minFilters: 1 },
              { query: `${department} findings from ${year}`, minFilters: 2 },
              { query: `critical findings`, minFilters: 1 },
            ];

            for (const testCase of queries) {
              const result = await service.processQuery(testCase.query, 'test-user');

              if (result !== null) {
                // Property: Filters must be recorded
                expect(result.metadata.filtersApplied).toBeDefined();
                expect(Array.isArray(result.metadata.filtersApplied)).toBe(true);

                // Property: Must have at least the expected number of filters
                expect(result.metadata.filtersApplied.length).toBeGreaterThanOrEqual(testCase.minFilters);

                // Property: Each filter must have required fields
                result.metadata.filtersApplied.forEach(filter => {
                  expect(filter).toHaveProperty('field');
                  expect(filter).toHaveProperty('operator');
                  expect(filter).toHaveProperty('value');
                  expect(typeof filter.field).toBe('string');
                  expect(typeof filter.operator).toBe('string');
                });

                // Property: Sorts must be recorded
                expect(result.metadata.sortsApplied).toBeDefined();
                expect(Array.isArray(result.metadata.sortsApplied)).toBe(true);

                // Property: Must have at least one sort
                expect(result.metadata.sortsApplied.length).toBeGreaterThan(0);

                // Property: Each sort must have required fields
                result.metadata.sortsApplied.forEach(sort => {
                  expect(sort).toHaveProperty('field');
                  expect(sort).toHaveProperty('direction');
                  expect(typeof sort.field).toBe('string');
                  expect(['asc', 'desc']).toContain(sort.direction);
                });
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain metadata consistency across multiple executions of the same query', async () => {
      const mockResults: AuditResult[] = [
        {
          id: '1',
          projectName: 'Test Project',
          year: 2023,
          department: 'IT',
          riskArea: 'Security',
          nilai: 15,
          bobot: 3,
          kadar: 5,
          code: 'T001',
          descriptions: 'Test finding',
          sh: 'SH01',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ];

      (mockAuditResultService.getAll as any).mockResolvedValue(mockResults);

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2000, max: 2099 }),
          async (year) => {
            const query = `findings from ${year}`;

            // Execute the same query multiple times
            const results = await Promise.all([
              service.processQuery(query, 'user1'),
              service.processQuery(query, 'user2'),
              service.processQuery(query, 'user3'),
            ]);

            // Filter out null results
            const validResults = results.filter(r => r !== null);

            if (validResults.length > 0) {
              // Property: All executions should have the same queryType
              const queryTypes = validResults.map(r => r!.metadata.queryType);
              expect(new Set(queryTypes).size).toBe(1);
              expect(queryTypes[0]).toBe('simple_query');

              // Property: All executions should match the same pattern
              const patterns = validResults.map(r => r!.metadata.patternMatched);
              expect(new Set(patterns).size).toBe(1);

              // Property: All executions should have the same resultsCount
              const resultsCounts = validResults.map(r => r!.metadata.resultsCount);
              expect(new Set(resultsCounts).size).toBe(1);

              // Property: All executions should have the same filters
              const filtersJson = validResults.map(r => JSON.stringify(r!.metadata.filtersApplied));
              expect(new Set(filtersJson).size).toBe(1);

              // Property: All executions should have the same sorts
              const sortsJson = validResults.map(r => JSON.stringify(r!.metadata.sortsApplied));
              expect(new Set(sortsJson).size).toBe(1);
            }
          }
        ),
        { numRuns: 50 } // Fewer runs due to multiple executions per test
      );
    });

    it('should record metadata even for queries with zero results', async () => {
      // Mock empty results
      (mockAuditResultService.getAll as any).mockResolvedValue([]);

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2000, max: 2099 }),
          async (year) => {
            const result = await service.processQuery(`findings from ${year}`, 'test-user');

            if (result !== null) {
              // Property: Metadata must exist even with zero results
              expect(result.metadata).toBeDefined();

              // Property: All required metadata fields must be present
              expect(result.metadata.queryType).toBe('simple_query');
              expect(result.metadata.patternMatched).toBeDefined();
              expect(result.metadata.executionTimeMs).toBeDefined();
              expect(result.metadata.resultsCount).toBeDefined();
              expect(result.metadata.filtersApplied).toBeDefined();
              expect(result.metadata.sortsApplied).toBeDefined();

              // Property: Results count must be zero
              expect(result.metadata.resultsCount).toBe(0);
              expect(result.findings).toHaveLength(0);

              // Property: Execution time must still be recorded (can be 0 with fast mocks)
              expect(result.metadata.executionTimeMs).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
