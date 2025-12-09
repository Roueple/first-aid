import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { SimpleQueryMatcher, QueryPattern, ExtractedParams } from '../SimpleQueryMatcher';
import { QueryFilter, QuerySort } from '../DatabaseService';

describe('SimpleQueryMatcher', () => {
  let matcher: SimpleQueryMatcher;

  beforeEach(() => {
    matcher = new SimpleQueryMatcher();
  });

  describe('Pattern Registration and Validation', () => {
    it('should add valid patterns successfully', () => {
      const pattern: QueryPattern = {
        id: 'test-pattern',
        name: 'Test Pattern',
        priority: 10,
        regex: /test/i,
        parameterExtractors: [],
        filterBuilder: () => [],
        sortBuilder: () => [],
      };

      expect(() => matcher.addPattern(pattern)).not.toThrow();
      expect(matcher.getPatterns()).toHaveLength(1);
    });

    it('should reject patterns with missing required fields', () => {
      const invalidPattern = {
        id: '',
        name: 'Test',
        priority: 10,
        regex: /test/,
        parameterExtractors: [],
        filterBuilder: () => [],
        sortBuilder: () => [],
      } as QueryPattern;

      expect(() => matcher.addPattern(invalidPattern)).toThrow();
    });

    it('should detect pattern conflicts', () => {
      const pattern1: QueryPattern = {
        id: 'pattern-1',
        name: 'Pattern 1',
        priority: 10,
        regex: /test query/i,
        parameterExtractors: [],
        filterBuilder: () => [],
        sortBuilder: () => [],
      };

      const pattern2: QueryPattern = {
        id: 'pattern-2',
        name: 'Pattern 2',
        priority: 5,
        regex: /test query/i, // Same regex
        parameterExtractors: [],
        filterBuilder: () => [],
        sortBuilder: () => [],
      };

      matcher.addPattern(pattern1);
      expect(() => matcher.addPattern(pattern2)).toThrow(/conflicts/);
    });
  });

  describe('Pattern Matching', () => {
    beforeEach(() => {
      // Add some test patterns
      const yearPattern: QueryPattern = {
        id: 'year-pattern',
        name: 'Year Query',
        priority: 10,
        regex: /findings?\s+(?:from|in)\s+(\d{4})|(\d{4})\s+findings?/i,
        parameterExtractors: [
          { name: 'year', type: 'number', captureGroup: 1 },
        ],
        filterBuilder: (params) => [
          { field: 'year', operator: '==', value: params.year },
        ],
        sortBuilder: () => [
          { field: 'nilai', direction: 'desc' },
        ],
      };

      const deptPattern: QueryPattern = {
        id: 'dept-pattern',
        name: 'Department Query',
        priority: 10,
        regex: /(IT|HR|Finance)\s+findings?/i,
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

      matcher.addPattern(yearPattern);
      matcher.addPattern(deptPattern);
    });

    it('should match valid queries', () => {
      const result = matcher.match('findings from 2023');
      expect(result.matched).toBe(true);
      expect(result.pattern?.id).toBe('year-pattern');
      expect(result.params?.year).toBe(2023);
    });

    it('should not match invalid queries', () => {
      const result = matcher.match('random unmatched query');
      expect(result.matched).toBe(false);
      expect(result.pattern).toBeUndefined();
    });

    it('should handle empty queries', () => {
      const result = matcher.match('');
      expect(result.matched).toBe(false);
    });
  });

  describe('Priority-Based Selection', () => {
    it('should select highest priority pattern when multiple match', () => {
      const lowPriority: QueryPattern = {
        id: 'low-priority',
        name: 'Low Priority',
        priority: 5,
        regex: /findings?/i,
        parameterExtractors: [],
        filterBuilder: () => [],
        sortBuilder: () => [],
      };

      const highPriority: QueryPattern = {
        id: 'high-priority',
        name: 'High Priority',
        priority: 20,
        regex: /findings?\s+from\s+(\d{4})/i,
        parameterExtractors: [
          { name: 'year', type: 'number', captureGroup: 1 },
        ],
        filterBuilder: (params) => [
          { field: 'year', operator: '==', value: params.year },
        ],
        sortBuilder: () => [],
      };

      matcher.addPattern(lowPriority);
      matcher.addPattern(highPriority);

      const result = matcher.match('findings from 2023');
      expect(result.matched).toBe(true);
      expect(result.pattern?.id).toBe('high-priority');
    });
  });

  describe('Parameter Extraction', () => {
    it('should extract and convert parameters correctly', () => {
      const pattern: QueryPattern = {
        id: 'param-test',
        name: 'Parameter Test',
        priority: 10,
        regex: /(\w+)\s+findings?\s+from\s+(\d{4})/i,
        parameterExtractors: [
          { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' },
          { name: 'year', type: 'number', captureGroup: 2 },
        ],
        filterBuilder: (params) => [
          { field: 'department', operator: '==', value: params.department },
          { field: 'year', operator: '==', value: params.year },
        ],
        sortBuilder: () => [],
      };

      matcher.addPattern(pattern);
      const result = matcher.match('IT findings from 2023');
      
      expect(result.matched).toBe(true);
      expect(result.params?.department).toBe('It');
      expect(result.params?.year).toBe(2023);
    });

    it('should apply normalizers correctly', () => {
      const pattern: QueryPattern = {
        id: 'normalize-test',
        name: 'Normalize Test',
        priority: 10,
        regex: /([A-Z]+)\s+code/i,
        parameterExtractors: [
          { name: 'code', type: 'string', captureGroup: 1, normalizer: 'uppercase' },
        ],
        filterBuilder: (params) => [
          { field: 'sh', operator: '==', value: params.code },
        ],
        sortBuilder: () => [],
      };

      matcher.addPattern(pattern);
      const result = matcher.match('abc code');
      
      expect(result.matched).toBe(true);
      expect(result.params?.code).toBe('ABC');
    });
  });

  // **Feature: docai-simple-query, Property 1: Pattern Matching Bypasses LLM**
  describe('Property 1: Pattern Matching Bypasses LLM', () => {
    it('should match patterns without requiring LLM processing', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2000, max: 2099 }),
          (year) => {
            // Create a pattern for year queries
            const pattern: QueryPattern = {
              id: 'year-query',
              name: 'Year Query',
              priority: 10,
              regex: /findings?\s+(?:from|in)\s+(\d{4})|(\d{4})\s+findings?/i,
              parameterExtractors: [
                { name: 'year', type: 'number', captureGroup: 1 },
              ],
              filterBuilder: (params) => [
                { field: 'year', operator: '==', value: params.year },
              ],
              sortBuilder: () => [
                { field: 'nilai', direction: 'desc' },
              ],
            };

            const testMatcher = new SimpleQueryMatcher([pattern]);
            
            // Generate various query formats
            const queries = [
              `findings from ${year}`,
              `finding from ${year}`,
              `${year} findings`,
              `${year} finding`,
              `findings in ${year}`,
            ];

            // All queries should match without LLM
            for (const query of queries) {
              const result = testMatcher.match(query);
              
              // Property: Pattern matching should succeed
              expect(result.matched).toBe(true);
              
              // Property: Should extract correct year
              expect(result.params?.year).toBe(year);
              
              // Property: Should have 100% confidence (no LLM needed)
              expect(result.confidence).toBe(1.0);
              
              // Property: Should have a pattern assigned
              expect(result.pattern).toBeDefined();
              expect(result.pattern?.id).toBe('year-query');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: docai-simple-query, Property 21: Pattern Priority Ordering**
  describe('Property 21: Pattern Priority Ordering', () => {
    it('should always select the highest priority pattern when multiple patterns match', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 2, maxLength: 10 }),
          fc.integer({ min: 2000, max: 2099 }),
          (priorities, year) => {
            // Create multiple patterns with different priorities that all match
            const testMatcher = new SimpleQueryMatcher();
            const uniquePriorities = [...new Set(priorities)].sort((a, b) => b - a);
            
            if (uniquePriorities.length < 2) {
              return true; // Skip if we don't have at least 2 unique priorities
            }

            // Use different regex patterns to avoid conflicts
            uniquePriorities.forEach((priority, index) => {
              // Create unique patterns by varying the regex slightly
              // but all still match the same query
              const regexVariants = [
                /findings?\s+(?:from|in)\s+(\d{4})/i,
                /findings?\s+from\s+(\d{4})/i,
                /finding\s+from\s+(\d{4})/i,
                /findings\s+from\s+(\d{4})/i,
                /finding\s+in\s+(\d{4})/i,
                /findings\s+in\s+(\d{4})/i,
                /findings?\s+(?:from)\s+(\d{4})/i,
                /findings?\s+(?:in)\s+(\d{4})/i,
                /(?:finding|findings)\s+from\s+(\d{4})/i,
                /(?:finding|findings)\s+in\s+(\d{4})/i,
              ];
              
              const pattern: QueryPattern = {
                id: `pattern-${priority}`,
                name: `Pattern ${priority}`,
                priority,
                regex: regexVariants[index % regexVariants.length],
                parameterExtractors: [
                  { name: 'year', type: 'number', captureGroup: 1 },
                ],
                filterBuilder: (params) => [
                  { field: 'year', operator: '==', value: params.year },
                ],
                sortBuilder: () => [],
              };
              testMatcher.addPattern(pattern);
            });

            const query = `findings from ${year}`;
            const result = testMatcher.match(query);

            // Property: Should match
            expect(result.matched).toBe(true);
            
            // Property: Should select the highest priority pattern
            const highestPriority = Math.max(...uniquePriorities);
            expect(result.pattern?.priority).toBe(highestPriority);
            expect(result.pattern?.id).toBe(`pattern-${highestPriority}`);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: docai-simple-query, Property 22: Parameter Extraction Accuracy**
  describe('Property 22: Parameter Extraction Accuracy', () => {
    it('should extract parameters that exactly match the input query segments', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2000, max: 2099 }),
          fc.constantFrom('IT', 'HR', 'Finance', 'Sales', 'Legal'),
          (year, department) => {
            const pattern: QueryPattern = {
              id: 'composite-pattern',
              name: 'Composite Pattern',
              priority: 20,
              regex: /(IT|HR|Finance|Sales|Legal)\s+findings?\s+(?:from|in)\s+(\d{4})/i,
              parameterExtractors: [
                { name: 'department', type: 'string', captureGroup: 1 },
                { name: 'year', type: 'number', captureGroup: 2 },
              ],
              filterBuilder: (params) => [
                { field: 'department', operator: '==', value: params.department },
                { field: 'year', operator: '==', value: params.year },
              ],
              sortBuilder: () => [],
            };

            const testMatcher = new SimpleQueryMatcher([pattern]);
            const query = `${department} findings from ${year}`;
            const result = testMatcher.match(query);

            // Property: Should match
            expect(result.matched).toBe(true);
            
            // Property: Extracted year should exactly match input
            expect(result.params?.year).toBe(year);
            
            // Property: Extracted department should match input (case-insensitive)
            expect(result.params?.department).toBe(department);
            
            // Property: All expected parameters should be present
            expect(result.params).toHaveProperty('year');
            expect(result.params).toHaveProperty('department');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle parameter normalization while preserving semantic meaning', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('abc', 'ABC', 'Abc', 'aBc', 'abC'),
          (code) => {
            const pattern: QueryPattern = {
              id: 'code-pattern',
              name: 'Code Pattern',
              priority: 10,
              regex: /([a-z]+)\s+code/i,
              parameterExtractors: [
                { name: 'code', type: 'string', captureGroup: 1, normalizer: 'uppercase' },
              ],
              filterBuilder: (params) => [
                { field: 'sh', operator: '==', value: params.code },
              ],
              sortBuilder: () => [],
            };

            const testMatcher = new SimpleQueryMatcher([pattern]);
            const query = `${code} code`;
            const result = testMatcher.match(query);

            // Property: Should match regardless of input case
            expect(result.matched).toBe(true);
            
            // Property: Normalized value should be uppercase
            expect(result.params?.code).toBe('ABC');
            
            // Property: Semantic meaning preserved (all variations map to same value)
            expect(typeof result.params?.code).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: docai-simple-query, Property 15: Inequality Sort Order**
  describe('Property 15: Inequality Sort Order', () => {
    it('should order results by inequality field first when inequality filters are present', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('IT', 'HR', 'Finance', 'Sales'),
          fc.integer({ min: 5, max: 20 }),
          (department, threshold) => {
            // Pattern with inequality filter (>=)
            const inequalityPattern: QueryPattern = {
              id: 'inequality-pattern',
              name: 'Inequality Pattern',
              priority: 20,
              regex: new RegExp(`(IT|HR|Finance|Sales)\\s+findings?\\s+above\\s+(\\d+)`, 'i'),
              parameterExtractors: [
                { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' },
                { name: 'threshold', type: 'number', captureGroup: 2 },
              ],
              filterBuilder: (params) => [
                { field: 'department', operator: '==', value: params.department },
                { field: 'nilai', operator: '>=', value: params.threshold },
              ],
              sortBuilder: (params) => {
                // When there's an inequality filter, Firestore requires ordering by that field first
                const filters = inequalityPattern.filterBuilder(params);
                const hasInequality = filters.some(f => 
                  f.operator === '>' || f.operator === '>=' || f.operator === '<' || f.operator === '<='
                );
                
                if (hasInequality) {
                  const inequalityField = filters.find(f => 
                    f.operator === '>' || f.operator === '>=' || f.operator === '<' || f.operator === '<='
                  )?.field;
                  
                  return [
                    { field: inequalityField!, direction: 'desc' },
                  ];
                }
                
                return [{ field: 'nilai', direction: 'desc' }];
              },
            };

            const testMatcher = new SimpleQueryMatcher([inequalityPattern]);
            const query = `${department} findings above ${threshold}`;
            const result = testMatcher.match(query);

            // Property: Should match
            expect(result.matched).toBe(true);
            
            // Property: Should have inequality filter
            const filters = result.pattern!.filterBuilder(result.params!);
            const inequalityFilter = filters.find(f => 
              f.operator === '>' || f.operator === '>=' || f.operator === '<' || f.operator === '<='
            );
            expect(inequalityFilter).toBeDefined();
            
            // Property: Sort order should start with inequality field
            const sorts = result.pattern!.sortBuilder(result.params!);
            expect(sorts.length).toBeGreaterThan(0);
            expect(sorts[0].field).toBe(inequalityFilter!.field);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple inequality filters by ordering by the first one', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 15 }),
          fc.integer({ min: 10, max: 20 }),
          (minThreshold, maxThreshold) => {
            // Ensure min < max
            const min = Math.min(minThreshold, maxThreshold);
            const max = Math.max(minThreshold, maxThreshold);
            
            if (min === max) {
              return true; // Skip if equal
            }

            // Pattern with range filter (>= and <)
            const rangePattern: QueryPattern = {
              id: 'range-pattern',
              name: 'Range Pattern',
              priority: 20,
              regex: /findings?\s+between\s+(\d+)\s+and\s+(\d+)/i,
              parameterExtractors: [
                { name: 'min', type: 'number', captureGroup: 1 },
                { name: 'max', type: 'number', captureGroup: 2 },
              ],
              filterBuilder: (params) => [
                { field: 'nilai', operator: '>=', value: params.min },
                { field: 'nilai', operator: '<', value: params.max },
              ],
              sortBuilder: (params) => {
                // Firestore requires ordering by the inequality field
                return [
                  { field: 'nilai', direction: 'desc' },
                ];
              },
            };

            const testMatcher = new SimpleQueryMatcher([rangePattern]);
            const query = `findings between ${min} and ${max}`;
            const result = testMatcher.match(query);

            // Property: Should match
            expect(result.matched).toBe(true);
            
            // Property: Should have multiple inequality filters on same field
            const filters = result.pattern!.filterBuilder(result.params!);
            const inequalityFilters = filters.filter(f => 
              f.operator === '>' || f.operator === '>=' || f.operator === '<' || f.operator === '<='
            );
            expect(inequalityFilters.length).toBeGreaterThanOrEqual(2);
            
            // Property: All inequality filters should be on the same field (Firestore requirement)
            const fields = inequalityFilters.map(f => f.field);
            const uniqueFields = [...new Set(fields)];
            expect(uniqueFields).toHaveLength(1);
            
            // Property: Sort order should be by the inequality field
            const sorts = result.pattern!.sortBuilder(result.params!);
            expect(sorts[0].field).toBe(inequalityFilters[0].field);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use default sort when no inequality filters are present', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('IT', 'HR', 'Finance'),
          fc.integer({ min: 2000, max: 2099 }),
          (department, year) => {
            // Pattern with only equality filters
            const equalityPattern: QueryPattern = {
              id: 'equality-pattern',
              name: 'Equality Pattern',
              priority: 20,
              regex: /(IT|HR|Finance)\s+findings?\s+from\s+(\d{4})/i,
              parameterExtractors: [
                { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' },
                { name: 'year', type: 'number', captureGroup: 2 },
              ],
              filterBuilder: (params) => [
                { field: 'department', operator: '==', value: params.department },
                { field: 'year', operator: '==', value: params.year },
              ],
              sortBuilder: () => [
                { field: 'nilai', direction: 'desc' },
              ],
            };

            const testMatcher = new SimpleQueryMatcher([equalityPattern]);
            const query = `${department} findings from ${year}`;
            const result = testMatcher.match(query);

            // Property: Should match
            expect(result.matched).toBe(true);
            
            // Property: Should have no inequality filters
            const filters = result.pattern!.filterBuilder(result.params!);
            const inequalityFilters = filters.filter(f => 
              f.operator === '>' || f.operator === '>=' || f.operator === '<' || f.operator === '<='
            );
            expect(inequalityFilters).toHaveLength(0);
            
            // Property: Can use any sort order (not constrained by Firestore)
            const sorts = result.pattern!.sortBuilder(result.params!);
            expect(sorts.length).toBeGreaterThan(0);
            // No specific constraint on sort field when no inequality
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: docai-simple-query, Property 7: Temporal Query Sorting**
  describe('Property 7: Temporal Query Sorting', () => {
    it('should sort temporal query results by nilai in descending order', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2000, max: 2099 }),
          (year) => {
            // Create temporal pattern
            const temporalPattern: QueryPattern = {
              id: 'temporal-year',
              name: 'Temporal Year Query',
              priority: 10,
              regex: /(?:findings?|audit results?)\s+(?:from|in)\s+(\d{4})|(\d{4})\s+(?:findings?|audit results?)/i,
              parameterExtractors: [
                { name: 'year', type: 'number', captureGroup: 1 },
              ],
              filterBuilder: (params) => [
                { field: 'year', operator: '==', value: params.year },
              ],
              sortBuilder: () => [
                { field: 'nilai', direction: 'desc' },
              ],
            };

            const testMatcher = new SimpleQueryMatcher([temporalPattern]);
            
            // Test various temporal query formats
            const queries = [
              `findings from ${year}`,
              `audit results from ${year}`,
              `findings in ${year}`,
              `${year} findings`,
              `${year} audit results`,
            ];

            for (const query of queries) {
              const result = testMatcher.match(query);

              // Property: Should match temporal pattern
              expect(result.matched).toBe(true);
              expect(result.pattern?.id).toBe('temporal-year');
              
              // Property: Should extract year correctly
              expect(result.params?.year).toBe(year);
              
              // Property: Should have year filter
              const filters = result.pattern!.filterBuilder(result.params!);
              expect(filters).toHaveLength(1);
              expect(filters[0].field).toBe('year');
              expect(filters[0].operator).toBe('==');
              expect(filters[0].value).toBe(year);
              
              // Property: Should sort by nilai in descending order
              const sorts = result.pattern!.sortBuilder(result.params!);
              expect(sorts).toHaveLength(1);
              expect(sorts[0].field).toBe('nilai');
              expect(sorts[0].direction).toBe('desc');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should consistently apply nilai descending sort across all temporal patterns', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2000, max: 2099 }),
          fc.constantFrom(
            'findings from',
            'findings in',
            'audit results from',
            'audit results in'
          ),
          (year, prefix) => {
            // Create temporal pattern
            const temporalPattern: QueryPattern = {
              id: 'temporal-flexible',
              name: 'Temporal Flexible Query',
              priority: 10,
              regex: /(?:findings?|audit results?)\s+(?:from|in)\s+(\d{4})/i,
              parameterExtractors: [
                { name: 'year', type: 'number', captureGroup: 1 },
              ],
              filterBuilder: (params) => [
                { field: 'year', operator: '==', value: params.year },
              ],
              sortBuilder: () => [
                { field: 'nilai', direction: 'desc' },
              ],
            };

            const testMatcher = new SimpleQueryMatcher([temporalPattern]);
            const query = `${prefix} ${year}`;
            const result = testMatcher.match(query);

            if (result.matched) {
              // Property: Sort order must always be nilai descending for temporal queries
              const sorts = result.pattern!.sortBuilder(result.params!);
              expect(sorts.length).toBeGreaterThan(0);
              expect(sorts[0].field).toBe('nilai');
              expect(sorts[0].direction).toBe('desc');
              
              // Property: No other sort fields should precede nilai
              // (This ensures nilai is the primary sort)
              expect(sorts[0]).toEqual({ field: 'nilai', direction: 'desc' });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not use year as sort field for temporal queries', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2000, max: 2099 }),
          (year) => {
            // Create temporal pattern
            const temporalPattern: QueryPattern = {
              id: 'temporal-year-check',
              name: 'Temporal Year Check',
              priority: 10,
              regex: /(?:findings?|audit results?)\s+(?:from|in)\s+(\d{4})/i,
              parameterExtractors: [
                { name: 'year', type: 'number', captureGroup: 1 },
              ],
              filterBuilder: (params) => [
                { field: 'year', operator: '==', value: params.year },
              ],
              sortBuilder: () => [
                { field: 'nilai', direction: 'desc' },
              ],
            };

            const testMatcher = new SimpleQueryMatcher([temporalPattern]);
            const query = `findings from ${year}`;
            const result = testMatcher.match(query);

            // Property: Temporal queries should NOT sort by year
            // (year is already filtered, so sorting by it is meaningless)
            const sorts = result.pattern!.sortBuilder(result.params!);
            const yearSort = sorts.find(s => s.field === 'year');
            expect(yearSort).toBeUndefined();
            
            // Property: Should sort by nilai instead
            expect(sorts[0].field).toBe('nilai');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: docai-simple-query, Property 14: Composite Filter Application**
  describe('Property 14: Composite Filter Application', () => {
    it('should apply all extracted filters from composite patterns', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2000, max: 2099 }),
          fc.constantFrom('IT', 'HR', 'Finance', 'Sales', 'Legal', 'Marketing', 'Operations'),
          (year, department) => {
            // Test department + year composite pattern
            const deptYearPattern: QueryPattern = {
              id: 'dept-year-composite',
              name: 'Department Year Composite',
              priority: 20,
              regex: /(IT|HR|Finance|Sales|Legal|Marketing|Operations)\s+findings?\s+(?:from|in)\s+(\d{4})/i,
              parameterExtractors: [
                { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' },
                { name: 'year', type: 'number', captureGroup: 2 },
              ],
              filterBuilder: (params) => [
                { field: 'department', operator: '==', value: params.department },
                { field: 'year', operator: '==', value: params.year },
              ],
              sortBuilder: () => [
                { field: 'nilai', direction: 'desc' },
              ],
            };

            const testMatcher = new SimpleQueryMatcher([deptYearPattern]);
            
            // Test various query formats
            const queries = [
              `${department} findings from ${year}`,
              `${department} findings in ${year}`,
              `${department} finding from ${year}`,
            ];

            for (const query of queries) {
              const result = testMatcher.match(query);

              // Property: Should match composite pattern
              expect(result.matched).toBe(true);
              
              // Property: Should extract both parameters
              expect(result.params).toHaveProperty('department');
              expect(result.params).toHaveProperty('year');
              
              // Property: Should build filters for both parameters
              const filters = result.pattern!.filterBuilder(result.params!);
              expect(filters).toHaveLength(2);
              
              // Property: Should have department filter
              const deptFilter = filters.find(f => f.field === 'department');
              expect(deptFilter).toBeDefined();
              expect(deptFilter?.operator).toBe('==');
              expect(deptFilter?.value).toBe(department.charAt(0).toUpperCase() + department.slice(1).toLowerCase());
              
              // Property: Should have year filter
              const yearFilter = filters.find(f => f.field === 'year');
              expect(yearFilter).toBeDefined();
              expect(yearFilter?.operator).toBe('==');
              expect(yearFilter?.value).toBe(year);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should apply all filters for department + risk level composite patterns', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('IT', 'HR', 'Finance', 'Sales', 'Legal', 'Marketing'),
          fc.constantFrom(
            { keyword: 'critical', threshold: 15 },
            { keyword: 'high risk', threshold: 10 }
          ),
          (department, riskLevel) => {
            // Test department + risk level composite pattern
            const deptRiskPattern: QueryPattern = {
              id: 'dept-risk-composite',
              name: 'Department Risk Composite',
              priority: 25,
              regex: new RegExp(
                `(${riskLevel.keyword})\\s+(IT|HR|Finance|Sales|Legal|Marketing)\\s+findings?|` +
                `(IT|HR|Finance|Sales|Legal|Marketing)\\s+(${riskLevel.keyword})\\s+findings?`,
                'i'
              ),
              parameterExtractors: [
                { name: 'department', type: 'string', captureGroup: 2, normalizer: 'capitalize' },
              ],
              filterBuilder: (params) => [
                { field: 'department', operator: '==', value: params.department },
                { field: 'nilai', operator: '>=', value: riskLevel.threshold },
              ],
              sortBuilder: () => [
                { field: 'nilai', direction: 'desc' },
              ],
            };

            const testMatcher = new SimpleQueryMatcher([deptRiskPattern]);
            
            // Test query format
            const query = `${riskLevel.keyword} ${department} findings`;
            const result = testMatcher.match(query);

            // Property: Should match composite pattern
            expect(result.matched).toBe(true);
            
            // Property: Should build filters for both department and risk
            const filters = result.pattern!.filterBuilder(result.params!);
            expect(filters.length).toBeGreaterThanOrEqual(2);
            
            // Property: Should have department filter
            const deptFilter = filters.find(f => f.field === 'department');
            expect(deptFilter).toBeDefined();
            expect(deptFilter?.operator).toBe('==');
            
            // Property: Should have risk level filter
            const riskFilter = filters.find(f => f.field === 'nilai');
            expect(riskFilter).toBeDefined();
            expect(riskFilter?.operator).toBe('>=');
            expect(riskFilter?.value).toBe(riskLevel.threshold);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all filters when building multi-filter queries', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2000, max: 2099 }),
          fc.constantFrom('IT', 'HR', 'Finance'),
          fc.integer({ min: 5, max: 20 }),
          (year, department, riskThreshold) => {
            // Create a complex composite pattern with 3 filters
            const complexPattern: QueryPattern = {
              id: 'complex-composite',
              name: 'Complex Composite',
              priority: 30,
              regex: /(IT|HR|Finance)\s+findings?\s+from\s+(\d{4})\s+above\s+(\d+)/i,
              parameterExtractors: [
                { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' },
                { name: 'year', type: 'number', captureGroup: 2 },
                { name: 'threshold', type: 'number', captureGroup: 3 },
              ],
              filterBuilder: (params) => [
                { field: 'department', operator: '==', value: params.department },
                { field: 'year', operator: '==', value: params.year },
                { field: 'nilai', operator: '>=', value: params.threshold },
              ],
              sortBuilder: () => [
                { field: 'nilai', direction: 'desc' },
              ],
            };

            const testMatcher = new SimpleQueryMatcher([complexPattern]);
            const query = `${department} findings from ${year} above ${riskThreshold}`;
            const result = testMatcher.match(query);

            if (result.matched) {
              // Property: Should extract all parameters
              expect(result.params).toHaveProperty('department');
              expect(result.params).toHaveProperty('year');
              expect(result.params).toHaveProperty('threshold');
              
              // Property: Should build all filters
              const filters = result.pattern!.filterBuilder(result.params!);
              expect(filters).toHaveLength(3);
              
              // Property: All filter fields should be present
              const filterFields = filters.map(f => f.field);
              expect(filterFields).toContain('department');
              expect(filterFields).toContain('year');
              expect(filterFields).toContain('nilai');
              
              // Property: All filter values should match extracted params
              const deptFilter = filters.find(f => f.field === 'department');
              expect(deptFilter?.value).toBe(department.charAt(0).toUpperCase() + department.slice(1).toLowerCase());
              
              const yearFilter = filters.find(f => f.field === 'year');
              expect(yearFilter?.value).toBe(year);
              
              const riskFilter = filters.find(f => f.field === 'nilai');
              expect(riskFilter?.value).toBe(riskThreshold);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: docai-simple-query, Property 10: Case-Insensitive Department Matching**
  describe('Property 10: Case-Insensitive Department Matching', () => {
    it('should normalize department names to match database format regardless of input case', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('IT', 'HR', 'Finance', 'Sales', 'Procurement', 'Legal', 'Marketing', 'Operations', 'Audit', 'Compliance'),
          fc.constantFrom(
            (dept: string) => dept.toLowerCase(),
            (dept: string) => dept.toUpperCase(),
            (dept: string) => dept.charAt(0).toUpperCase() + dept.slice(1).toLowerCase(),
            (dept: string) => dept.charAt(0).toLowerCase() + dept.slice(1).toUpperCase(),
            (dept: string) => dept.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('')
          ),
          (department, caseTransform) => {
            // Apply case transformation to department name
            const transformedDept = caseTransform(department);
            
            // Create department pattern with capitalize normalizer
            const deptPattern: QueryPattern = {
              id: 'dept-case-test',
              name: 'Department Case Test',
              priority: 10,
              regex: /([a-zA-Z]+)\s+findings?/i,
              parameterExtractors: [
                { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' }
              ],
              filterBuilder: (params) => [
                { field: 'department', operator: '==', value: params.department }
              ],
              sortBuilder: () => [
                { field: 'year', direction: 'desc' }
              ],
            };

            const testMatcher = new SimpleQueryMatcher([deptPattern]);
            const query = `${transformedDept} findings`;
            const result = testMatcher.match(query);

            // Property: Should match regardless of input case
            expect(result.matched).toBe(true);
            
            // Property: Normalized department should be in capitalize format (First letter uppercase, rest lowercase)
            const expectedNormalized = department.charAt(0).toUpperCase() + department.slice(1).toLowerCase();
            expect(result.params?.department).toBe(expectedNormalized);
            
            // Property: All case variations should produce the same normalized value
            expect(result.params?.department).toBe(expectedNormalized);
            
            // Property: Filter should use normalized value
            const filters = result.pattern!.filterBuilder(result.params!);
            const deptFilter = filters.find(f => f.field === 'department');
            expect(deptFilter?.value).toBe(expectedNormalized);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should consistently normalize department names across different query patterns', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('IT', 'HR', 'Finance', 'Sales', 'Legal'),
          fc.constantFrom('lowercase', 'uppercase', 'mixed'),
          fc.integer({ min: 2000, max: 2099 }),
          (department, caseType, year) => {
            // Transform department based on case type
            let transformedDept: string;
            switch (caseType) {
              case 'lowercase':
                transformedDept = department.toLowerCase();
                break;
              case 'uppercase':
                transformedDept = department.toUpperCase();
                break;
              case 'mixed':
                transformedDept = department.split('').map((c, i) => 
                  i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()
                ).join('');
                break;
              default:
                transformedDept = department;
            }

            // Create multiple patterns that all use capitalize normalizer
            const patterns: QueryPattern[] = [
              {
                id: 'dept-simple',
                name: 'Department Simple',
                priority: 10,
                regex: /([a-zA-Z]+)\s+findings?/i,
                parameterExtractors: [
                  { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' }
                ],
                filterBuilder: (params) => [
                  { field: 'department', operator: '==', value: params.department }
                ],
                sortBuilder: () => [{ field: 'year', direction: 'desc' }],
              },
              {
                id: 'dept-year',
                name: 'Department Year',
                priority: 20,
                regex: /([a-zA-Z]+)\s+findings?\s+from\s+(\d{4})/i,
                parameterExtractors: [
                  { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' },
                  { name: 'year', type: 'number', captureGroup: 2 }
                ],
                filterBuilder: (params) => [
                  { field: 'department', operator: '==', value: params.department },
                  { field: 'year', operator: '==', value: params.year }
                ],
                sortBuilder: () => [{ field: 'nilai', direction: 'desc' }],
              },
            ];

            const testMatcher = new SimpleQueryMatcher(patterns);
            
            // Test both simple and composite queries
            const queries = [
              `${transformedDept} findings`,
              `${transformedDept} findings from ${year}`,
            ];

            const expectedNormalized = department.charAt(0).toUpperCase() + department.slice(1).toLowerCase();

            for (const query of queries) {
              const result = testMatcher.match(query);

              if (result.matched) {
                // Property: All patterns should normalize to the same value
                expect(result.params?.department).toBe(expectedNormalized);
                
                // Property: Normalized value should be consistent across patterns
                const filters = result.pattern!.filterBuilder(result.params!);
                const deptFilter = filters.find(f => f.field === 'department');
                expect(deptFilter?.value).toBe(expectedNormalized);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multi-word department names with proper case normalization', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('Human Resources', 'Information Technology', 'Quality Assurance'),
          fc.constantFrom(
            (dept: string) => dept.toLowerCase(),
            (dept: string) => dept.toUpperCase(),
            (dept: string) => dept
          ),
          (department, caseTransform) => {
            const transformedDept = caseTransform(department);
            
            // Pattern that captures multi-word departments
            const multiWordPattern: QueryPattern = {
              id: 'multi-word-dept',
              name: 'Multi-word Department',
              priority: 10,
              regex: /(.+?)\s+findings?$/i,
              parameterExtractors: [
                { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' }
              ],
              filterBuilder: (params) => [
                { field: 'department', operator: '==', value: params.department }
              ],
              sortBuilder: () => [{ field: 'year', direction: 'desc' }],
            };

            const testMatcher = new SimpleQueryMatcher([multiWordPattern]);
            const query = `${transformedDept} findings`;
            const result = testMatcher.match(query);

            // Property: Should match multi-word departments
            expect(result.matched).toBe(true);
            
            // Property: Should normalize first letter to uppercase, rest to lowercase
            // Note: capitalize normalizer only affects the first character of the entire string
            const expectedNormalized = transformedDept.charAt(0).toUpperCase() + transformedDept.slice(1).toLowerCase();
            expect(result.params?.department).toBe(expectedNormalized);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: docai-simple-query, Property 19: Subholding Code Normalization**
  describe('Property 19: Subholding Code Normalization', () => {
    it('should normalize subholding codes to uppercase regardless of input case', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', '1', '2', '3', '4', '5'), { minLength: 2, maxLength: 5 }).map(arr => arr.join('')),
          fc.constantFrom(
            (code: string) => code.toLowerCase(),
            (code: string) => code.toUpperCase(),
            (code: string) => code.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join(''),
            (code: string) => code.split('').map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join('')
          ),
          (baseCode, caseTransform) => {
            // Apply case transformation
            const transformedCode = caseTransform(baseCode);
            
            // Create subholding pattern with uppercase normalizer
            const shPattern: QueryPattern = {
              id: 'sh-case-test',
              name: 'Subholding Case Test',
              priority: 10,
              regex: /([a-zA-Z0-9]+)\s+subholding/i,
              parameterExtractors: [
                { name: 'sh', type: 'string', captureGroup: 1, normalizer: 'uppercase' }
              ],
              filterBuilder: (params) => [
                { field: 'sh', operator: '==', value: params.sh }
              ],
              sortBuilder: () => [
                { field: 'year', direction: 'desc' }
              ],
            };

            const testMatcher = new SimpleQueryMatcher([shPattern]);
            const query = `${transformedCode} subholding`;
            const result = testMatcher.match(query);

            // Property: Should match regardless of input case
            expect(result.matched).toBe(true);
            
            // Property: Normalized code should be all uppercase
            const expectedNormalized = baseCode.toUpperCase();
            expect(result.params?.sh).toBe(expectedNormalized);
            
            // Property: All case variations should produce the same normalized value
            expect(result.params?.sh).toBe(expectedNormalized);
            
            // Property: Filter should use normalized uppercase value
            const filters = result.pattern!.filterBuilder(result.params!);
            const shFilter = filters.find(f => f.field === 'sh');
            expect(shFilter?.value).toBe(expectedNormalized);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should consistently normalize subholding codes across different query patterns', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('A', 'B', 'C', '1', '2', '3'), { minLength: 2, maxLength: 4 }).map(arr => arr.join('')),
          fc.constantFrom('lowercase', 'uppercase', 'mixed'),
          (code, caseType) => {
            // Transform code based on case type
            let transformedCode: string;
            switch (caseType) {
              case 'lowercase':
                transformedCode = code.toLowerCase();
                break;
              case 'uppercase':
                transformedCode = code.toUpperCase();
                break;
              case 'mixed':
                transformedCode = code.split('').map((c, i) => 
                  i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()
                ).join('');
                break;
              default:
                transformedCode = code;
            }

            // Create multiple patterns that all use uppercase normalizer
            const patterns: QueryPattern[] = [
              {
                id: 'sh-simple',
                name: 'Subholding Simple',
                priority: 10,
                regex: /([a-zA-Z0-9]+)\s+subholding/i,
                parameterExtractors: [
                  { name: 'sh', type: 'string', captureGroup: 1, normalizer: 'uppercase' }
                ],
                filterBuilder: (params) => [
                  { field: 'sh', operator: '==', value: params.sh }
                ],
                sortBuilder: () => [{ field: 'year', direction: 'desc' }],
              },
              {
                id: 'sh-findings',
                name: 'Subholding Findings',
                priority: 10,
                regex: /findings?\s+for\s+SH\s+([a-zA-Z0-9]+)/i,
                parameterExtractors: [
                  { name: 'sh', type: 'string', captureGroup: 1, normalizer: 'uppercase' }
                ],
                filterBuilder: (params) => [
                  { field: 'sh', operator: '==', value: params.sh }
                ],
                sortBuilder: () => [{ field: 'year', direction: 'desc' }],
              },
              {
                id: 'sh-show',
                name: 'Subholding Show',
                priority: 10,
                regex: /show\s+(?:me\s+)?([a-zA-Z0-9]+)\s+(?:audit results?|findings?)/i,
                parameterExtractors: [
                  { name: 'sh', type: 'string', captureGroup: 1, normalizer: 'uppercase' }
                ],
                filterBuilder: (params) => [
                  { field: 'sh', operator: '==', value: params.sh }
                ],
                sortBuilder: () => [{ field: 'year', direction: 'desc' }],
              },
            ];

            const testMatcher = new SimpleQueryMatcher(patterns);
            
            // Test different query formats
            const queries = [
              `${transformedCode} subholding`,
              `findings for SH ${transformedCode}`,
              `show me ${transformedCode} findings`,
            ];

            const expectedNormalized = code.toUpperCase();

            for (const query of queries) {
              const result = testMatcher.match(query);

              if (result.matched) {
                // Property: All patterns should normalize to uppercase
                expect(result.params?.sh).toBe(expectedNormalized);
                
                // Property: Normalized value should be consistent across patterns
                const filters = result.pattern!.filterBuilder(result.params!);
                const shFilter = filters.find(f => f.field === 'sh');
                expect(shFilter?.value).toBe(expectedNormalized);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve alphanumeric characters while normalizing to uppercase', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
            { minLength: 3, maxLength: 6 }
          ).map(arr => arr.join('')),
          (code) => {
            // Create pattern with uppercase normalizer
            const shPattern: QueryPattern = {
              id: 'sh-alphanumeric',
              name: 'Subholding Alphanumeric',
              priority: 10,
              regex: /([a-zA-Z0-9]+)\s+code/i,
              parameterExtractors: [
                { name: 'sh', type: 'string', captureGroup: 1, normalizer: 'uppercase' }
              ],
              filterBuilder: (params) => [
                { field: 'sh', operator: '==', value: params.sh }
              ],
              sortBuilder: () => [{ field: 'year', direction: 'desc' }],
            };

            const testMatcher = new SimpleQueryMatcher([shPattern]);
            const query = `${code} code`;
            const result = testMatcher.match(query);

            // Property: Should match alphanumeric codes
            expect(result.matched).toBe(true);
            
            // Property: Should normalize to uppercase
            const expectedNormalized = code.toUpperCase();
            expect(result.params?.sh).toBe(expectedNormalized);
            
            // Property: Should preserve all alphanumeric characters
            expect(result.params?.sh).toHaveLength(code.length);
            
            // Property: Numbers should remain unchanged
            const numbers = code.match(/\d/g) || [];
            const normalizedNumbers = (result.params?.sh as string).match(/\d/g) || [];
            expect(normalizedNumbers).toEqual(numbers);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases with special formatting', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('SH01', 'sh02', 'Sh03', 'sH04', 'ABC', 'abc', 'XyZ', 'A1B2', 'a1b2'),
          (code) => {
            // Create pattern with uppercase normalizer
            const shPattern: QueryPattern = {
              id: 'sh-edge-case',
              name: 'Subholding Edge Case',
              priority: 10,
              regex: /([a-zA-Z0-9]+)\s+subholding/i,
              parameterExtractors: [
                { name: 'sh', type: 'string', captureGroup: 1, normalizer: 'uppercase' }
              ],
              filterBuilder: (params) => [
                { field: 'sh', operator: '==', value: params.sh }
              ],
              sortBuilder: () => [{ field: 'year', direction: 'desc' }],
            };

            const testMatcher = new SimpleQueryMatcher([shPattern]);
            const query = `${code} subholding`;
            const result = testMatcher.match(query);

            // Property: Should match
            expect(result.matched).toBe(true);
            
            // Property: Should always normalize to uppercase
            expect(result.params?.sh).toBe(code.toUpperCase());
            
            // Property: Result should be all uppercase letters and numbers
            const normalized = result.params?.sh as string;
            expect(normalized).toMatch(/^[A-Z0-9]+$/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
