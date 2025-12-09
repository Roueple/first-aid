import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { SimpleQueryMatcher } from '../SimpleQueryMatcher';
import {
  temporalPatterns,
  departmentPatterns,
  projectPatterns,
  subholdingPatterns,
} from '../queryPatterns';

describe('Query Pattern Definitions', () => {
  // **Feature: docai-simple-query, Property 6: Year Pattern Extraction**
  // **Validates: Requirements 2.1, 2.2, 2.3**
  describe('Property 6: Year Pattern Extraction', () => {
    it('should extract year from "findings from [year]" pattern', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2000, max: 2099 }),
          (year) => {
            const matcher = new SimpleQueryMatcher(temporalPatterns);
            
            // Test various query formats
            const queries = [
              `findings from ${year}`,
              `finding from ${year}`,
              `audit results from ${year}`,
              `audit result from ${year}`,
            ];

            for (const query of queries) {
              const result = matcher.match(query);
              
              // Property: Should match the pattern
              expect(result.matched).toBe(true);
              
              // Property: Should extract the correct year
              expect(result.params?.year).toBe(year);
              
              // Property: Should construct filter WHERE year == [year]
              const filters = result.pattern?.filterBuilder(result.params!);
              expect(filters).toBeDefined();
              expect(filters).toHaveLength(1);
              expect(filters![0].field).toBe('year');
              expect(filters![0].operator).toBe('==');
              expect(filters![0].value).toBe(year);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract year from "[year] findings" pattern', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2000, max: 2099 }),
          (year) => {
            const matcher = new SimpleQueryMatcher(temporalPatterns);
            
            // Test various query formats
            const queries = [
              `${year} findings`,
              `${year} finding`,
              `${year} audit results`,
              `${year} audit result`,
            ];

            for (const query of queries) {
              const result = matcher.match(query);
              
              // Property: Should match the pattern
              expect(result.matched).toBe(true);
              
              // Property: Should extract the correct year
              expect(result.params?.year).toBe(year);
              
              // Property: Should construct filter WHERE year == [year]
              const filters = result.pattern?.filterBuilder(result.params!);
              expect(filters).toBeDefined();
              expect(filters).toHaveLength(1);
              expect(filters![0].field).toBe('year');
              expect(filters![0].operator).toBe('==');
              expect(filters![0].value).toBe(year);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract year from "show me [year] audit results" pattern', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2000, max: 2099 }),
          (year) => {
            const matcher = new SimpleQueryMatcher(temporalPatterns);
            
            // Test various query formats
            const queries = [
              `show me ${year} findings`,
              `show me ${year} audit results`,
              `show ${year} findings`,
              `show ${year} audit results`,
            ];

            for (const query of queries) {
              const result = matcher.match(query);
              
              // Property: Should match the pattern
              expect(result.matched).toBe(true);
              
              // Property: Should extract the correct year
              expect(result.params?.year).toBe(year);
              
              // Property: Should construct filter WHERE year == [year]
              const filters = result.pattern?.filterBuilder(result.params!);
              expect(filters).toBeDefined();
              expect(filters).toHaveLength(1);
              expect(filters![0].field).toBe('year');
              expect(filters![0].operator).toBe('==');
              expect(filters![0].value).toBe(year);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: docai-simple-query, Property 8: Department Pattern Extraction**
  // **Validates: Requirements 3.1, 3.2, 3.3**
  describe('Property 8: Department Pattern Extraction', () => {
    it('should extract department from "[department] findings" pattern', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('IT', 'HR', 'Finance', 'Sales', 'Procurement', 'Legal', 'Marketing', 'Operations', 'Audit', 'Compliance'),
          (department) => {
            const matcher = new SimpleQueryMatcher(departmentPatterns);
            
            // Test various query formats
            const queries = [
              `${department} findings`,
              `${department} finding`,
              `${department} department findings`,
              `${department} department finding`,
            ];

            for (const query of queries) {
              const result = matcher.match(query);
              
              // Property: Should match the pattern
              expect(result.matched).toBe(true);
              
              // Property: Should extract the department (normalized to capitalize)
              expect(result.params?.department).toBe(department.charAt(0).toUpperCase() + department.slice(1).toLowerCase());
              
              // Property: Should construct filter WHERE department == [department]
              const filters = result.pattern?.filterBuilder(result.params!);
              expect(filters).toBeDefined();
              expect(filters).toHaveLength(1);
              expect(filters![0].field).toBe('department');
              expect(filters![0].operator).toBe('==');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract department from "show me [department] department" pattern', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('IT', 'HR', 'Finance', 'Sales', 'Procurement', 'Legal', 'Marketing', 'Operations', 'Audit', 'Compliance'),
          (department) => {
            const matcher = new SimpleQueryMatcher(departmentPatterns);
            
            // Test various query formats
            const queries = [
              `show me ${department}`,
              `show me ${department} department`,
              `show ${department}`,
              `show ${department} department`,
            ];

            for (const query of queries) {
              const result = matcher.match(query);
              
              // Property: Should match the pattern
              expect(result.matched).toBe(true);
              
              // Property: Should extract the department (normalized to capitalize)
              expect(result.params?.department).toBe(department.charAt(0).toUpperCase() + department.slice(1).toLowerCase());
              
              // Property: Should construct filter WHERE department == [department]
              const filters = result.pattern?.filterBuilder(result.params!);
              expect(filters).toBeDefined();
              expect(filters).toHaveLength(1);
              expect(filters![0].field).toBe('department');
              expect(filters![0].operator).toBe('==');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract department from "findings from [department]" pattern', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('IT', 'HR', 'Finance', 'Sales', 'Procurement', 'Legal', 'Marketing', 'Operations', 'Audit', 'Compliance'),
          (department) => {
            const matcher = new SimpleQueryMatcher(departmentPatterns);
            
            // Test various query formats
            const queries = [
              `findings from ${department}`,
              `finding from ${department}`,
              `audit results from ${department}`,
              `audit result from ${department}`,
            ];

            for (const query of queries) {
              const result = matcher.match(query);
              
              // Property: Should match the pattern
              expect(result.matched).toBe(true);
              
              // Property: Should extract the department (normalized to capitalize)
              expect(result.params?.department).toBe(department.charAt(0).toUpperCase() + department.slice(1).toLowerCase());
              
              // Property: Should construct filter WHERE department == [department]
              const filters = result.pattern?.filterBuilder(result.params!);
              expect(filters).toBeDefined();
              expect(filters).toHaveLength(1);
              expect(filters![0].field).toBe('department');
              expect(filters![0].operator).toBe('==');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: docai-simple-query, Property 12: Project Name Pattern Extraction**
  // **Validates: Requirements 5.1, 5.2, 5.3, 5.5**
  describe('Property 12: Project Name Pattern Extraction', () => {
    it('should extract complete project name including spaces from "findings for [projectName]" pattern', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'Citraland Pekanbaru',
            'Mall Taman Anggrek',
            'Grand Indonesia',
            'Pacific Place',
            'Senayan City',
            'Plaza Indonesia'
          ),
          (projectName) => {
            const matcher = new SimpleQueryMatcher(projectPatterns);
            
            // Test various query formats
            const queries = [
              `findings for ${projectName}`,
              `audit results for ${projectName}`,
              `findings for ${projectName} project`,
              `audit results for ${projectName} project`,
            ];

            for (const query of queries) {
              const result = matcher.match(query);
              
              // Property: Should match the pattern
              expect(result.matched).toBe(true);
              
              // Property: Should extract the complete project name (including spaces)
              expect(result.params?.projectName).toBe(projectName);
              
              // Property: Should construct filter WHERE projectName == [projectName]
              const filters = result.pattern?.filterBuilder(result.params!);
              expect(filters).toBeDefined();
              expect(filters).toHaveLength(1);
              expect(filters![0].field).toBe('projectName');
              expect(filters![0].operator).toBe('==');
              expect(filters![0].value).toBe(projectName);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract project name from "[projectName] findings" pattern', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'Citraland Pekanbaru',
            'Mall Taman Anggrek',
            'Grand Indonesia',
            'Pacific Place',
            'Senayan City',
            'Plaza Indonesia'
          ),
          (projectName) => {
            const matcher = new SimpleQueryMatcher(projectPatterns);
            
            // Test various query formats
            const queries = [
              `${projectName} findings`,
              `${projectName} project findings`,
            ];

            for (const query of queries) {
              const result = matcher.match(query);
              
              // Property: Should match the pattern
              expect(result.matched).toBe(true);
              
              // Property: Should extract the complete project name (including spaces)
              expect(result.params?.projectName).toBe(projectName);
              
              // Property: Should construct filter WHERE projectName == [projectName]
              const filters = result.pattern?.filterBuilder(result.params!);
              expect(filters).toBeDefined();
              expect(filters).toHaveLength(1);
              expect(filters![0].field).toBe('projectName');
              expect(filters![0].operator).toBe('==');
              expect(filters![0].value).toBe(projectName);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract project name from "show me [projectName] audit results" pattern', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'Citraland Pekanbaru',
            'Mall Taman Anggrek',
            'Grand Indonesia',
            'Pacific Place',
            'Senayan City',
            'Plaza Indonesia'
          ),
          (projectName) => {
            const matcher = new SimpleQueryMatcher(projectPatterns);
            
            // Test various query formats
            const queries = [
              `show me ${projectName} audit results`,
              `show me ${projectName} findings`,
              `show ${projectName} audit results`,
              `show ${projectName} findings`,
            ];

            for (const query of queries) {
              const result = matcher.match(query);
              
              // Property: Should match the pattern
              expect(result.matched).toBe(true);
              
              // Property: Should extract the complete project name (including spaces)
              expect(result.params?.projectName).toBe(projectName);
              
              // Property: Should construct filter WHERE projectName == [projectName]
              const filters = result.pattern?.filterBuilder(result.params!);
              expect(filters).toBeDefined();
              expect(filters).toHaveLength(1);
              expect(filters![0].field).toBe('projectName');
              expect(filters![0].operator).toBe('==');
              expect(filters![0].value).toBe(projectName);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: docai-simple-query, Property 17: Subholding Pattern Extraction**
  // **Validates: Requirements 8.1, 8.2, 8.3**
  describe('Property 17: Subholding Pattern Extraction', () => {
    it('should extract subholding code from "findings for SH [code]" pattern', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'),
          (code) => {
            const matcher = new SimpleQueryMatcher(subholdingPatterns);
            
            // Test various query formats
            const queries = [
              `findings for SH ${code}`,
              `audit results for SH ${code}`,
              `finding for SH ${code}`,
              `audit result for SH ${code}`,
            ];

            for (const query of queries) {
              const result = matcher.match(query);
              
              // Property: Should match the pattern
              expect(result.matched).toBe(true);
              
              // Property: Should extract the code and normalize to uppercase
              expect(result.params?.sh).toBe(code.toUpperCase());
              
              // Property: Should construct filter WHERE sh == [code]
              const filters = result.pattern?.filterBuilder(result.params!);
              expect(filters).toBeDefined();
              expect(filters).toHaveLength(1);
              expect(filters![0].field).toBe('sh');
              expect(filters![0].operator).toBe('==');
              expect(filters![0].value).toBe(code.toUpperCase());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract subholding code from "[code] subholding findings" pattern', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'),
          (code) => {
            const matcher = new SimpleQueryMatcher(subholdingPatterns);
            
            // Test various query formats
            const queries = [
              `${code} subholding findings`,
              `${code} subholding finding`,
            ];

            for (const query of queries) {
              const result = matcher.match(query);
              
              // Property: Should match the pattern
              expect(result.matched).toBe(true);
              
              // Property: Should extract the code and normalize to uppercase
              expect(result.params?.sh).toBe(code.toUpperCase());
              
              // Property: Should construct filter WHERE sh == [code]
              const filters = result.pattern?.filterBuilder(result.params!);
              expect(filters).toBeDefined();
              expect(filters).toHaveLength(1);
              expect(filters![0].field).toBe('sh');
              expect(filters![0].operator).toBe('==');
              expect(filters![0].value).toBe(code.toUpperCase());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract subholding code from "show me [code] audit results" pattern', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'),
          (code) => {
            const matcher = new SimpleQueryMatcher(subholdingPatterns);
            
            // Test various query formats
            const queries = [
              `show me ${code} audit results`,
              `show me ${code} findings`,
              `show ${code} audit results`,
              `show ${code} findings`,
            ];

            for (const query of queries) {
              const result = matcher.match(query);
              
              // Property: Should match the pattern
              expect(result.matched).toBe(true);
              
              // Property: Should extract the code and normalize to uppercase
              expect(result.params?.sh).toBe(code.toUpperCase());
              
              // Property: Should construct filter WHERE sh == [code]
              const filters = result.pattern?.filterBuilder(result.params!);
              expect(filters).toBeDefined();
              expect(filters).toHaveLength(1);
              expect(filters![0].field).toBe('sh');
              expect(filters![0].operator).toBe('==');
              expect(filters![0].value).toBe(code.toUpperCase());
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
