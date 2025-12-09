import { AuditResultService, AuditResult } from './AuditResultService';
import { QueryFilter, QuerySort, QueryOptions } from './DatabaseService';
import { QueryPattern, ExtractedParams } from './SimpleQueryMatcher';
import departmentService from './DepartmentService';

/**
 * Simple query result with metadata
 */
export interface SimpleQueryResult {
  type: 'simple_query';
  answer: string;
  findings: AuditResult[];
  metadata: {
    queryType: 'simple_query';
    patternMatched: string;
    executionTimeMs: number;
    resultsCount: number;
    filtersApplied: QueryFilter[];
    sortsApplied: QuerySort[];
  };
}

/**
 * SimpleQueryExecutor - Executes Firebase queries and formats results
 * 
 * Responsibilities:
 * - Build Firebase queries from patterns and parameters
 * - Execute queries through AuditResultService
 * - Format results in consistent, readable format
 * - Track execution metrics
 */
export class SimpleQueryExecutor {
  constructor(private auditResultService: AuditResultService) {}

  /**
   * Execute a simple query based on pattern and extracted parameters
   */
  async execute(
    pattern: QueryPattern,
    params: ExtractedParams
  ): Promise<SimpleQueryResult> {
    const startTime = Date.now();

    try {
      // Build filters and sorts from pattern
      let filters = pattern.filterBuilder(params);
      const sorts = pattern.sortBuilder(params);

      // If query includes department filter, normalize it using department table
      const departmentFilter = filters.find(f => f.field === 'department');
      if (departmentFilter && departmentFilter.value) {
        const normalizedDepartments = await this.normalizeDepartmentFilter(
          departmentFilter.value as string
        );
        
        // If we found normalized departments, update the filter
        if (normalizedDepartments.length > 0) {
          // Remove the original department filter
          filters = filters.filter(f => f.field !== 'department');
          
          // Note: Firestore doesn't support 'in' operator with other filters easily
          // So we'll fetch results for each department and merge them
          // This is handled below in the execution logic
        } else {
          // No matching department found - return empty results
          return {
            type: 'simple_query',
            answer: this.formatEmptyResults(pattern, params),
            findings: [],
            metadata: {
              queryType: 'simple_query',
              patternMatched: pattern.id,
              executionTimeMs: Date.now() - startTime,
              resultsCount: 0,
              filtersApplied: filters,
              sortsApplied: sorts,
            },
          };
        }
      }

      // Handle Firestore inequality constraint ordering
      const orderedSorts = this.orderSortsForInequality(filters, sorts);

      // Determine limit - use params.limit if available (for top N queries), otherwise default to 50
      let queryLimit = 50; // default
      if (params.limit !== undefined && params.limit !== null) {
        const limitValue = typeof params.limit === 'number' ? params.limit : Number(params.limit);
        if (!isNaN(limitValue) && limitValue > 0 && isFinite(limitValue)) {
          queryLimit = Math.floor(limitValue); // Ensure integer
        }
      }

      // Execute query
      let findings: AuditResult[];
      
      if (departmentFilter && departmentFilter.value) {
        // Department query - fetch using normalized department names
        const normalizedDepartments = await this.normalizeDepartmentFilter(
          departmentFilter.value as string
        );
        
        // Fetch results for each normalized department name
        const allFindings: AuditResult[] = [];
        for (const deptName of normalizedDepartments) {
          const deptFilters: QueryFilter[] = [
            ...filters,
            { field: 'department', operator: '==', value: deptName } as QueryFilter
          ];
          
          const queryOptions: QueryOptions = {
            filters: deptFilters,
            sorts: orderedSorts,
            limit: queryLimit,
          };
          
          const deptFindings = await this.auditResultService.getAll(queryOptions);
          allFindings.push(...deptFindings);
        }
        
        // Sort and limit the combined results
        findings = this.sortAndLimitFindings(allFindings, orderedSorts, queryLimit);
      } else {
        // Non-department query - execute normally
        const queryOptions: QueryOptions = {
          filters,
          sorts: orderedSorts,
          limit: queryLimit,
        };
        
        findings = await this.auditResultService.getAll(queryOptions);
      }

      // Calculate execution time
      const executionTimeMs = Date.now() - startTime;

      // Format results
      const answer = this.formatResults(findings, pattern, params);

      return {
        type: 'simple_query',
        answer,
        findings,
        metadata: {
          queryType: 'simple_query',
          patternMatched: pattern.id,
          executionTimeMs,
          resultsCount: findings.length,
          filtersApplied: filters,
          sortsApplied: orderedSorts,
        },
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      
      // Return error result
      return {
        type: 'simple_query',
        answer: this.formatError(error, pattern),
        findings: [],
        metadata: {
          queryType: 'simple_query',
          patternMatched: pattern.id,
          executionTimeMs,
          resultsCount: 0,
          filtersApplied: pattern.filterBuilder(params),
          sortsApplied: pattern.sortBuilder(params),
        },
      };
    }
  }

  /**
   * Normalize department filter value using department table
   * Returns all original department names that match the normalized department
   */
  private async normalizeDepartmentFilter(departmentValue: string): Promise<string[]> {
    try {
      // Try to find by category first (e.g., "IT" → all IT departments)
      let departments = await departmentService.getByCategory(departmentValue);
      
      // If no category match, search by name
      if (departments.length === 0) {
        departments = await departmentService.searchByName(departmentValue);
      }
      
      if (departments.length === 0) {
        // Try to find or create department
        const dept = await departmentService.findOrCreate(departmentValue);
        return dept.originalNames;
      }
      
      // Collect all original names from matching departments
      const originalNames = new Set<string>();
      departments.forEach((dept) => {
        dept.originalNames.forEach((name) => originalNames.add(name));
      });
      
      return Array.from(originalNames);
    } catch (error) {
      console.error('Error normalizing department filter:', error);
      // Fallback to original value
      return [departmentValue];
    }
  }

  /**
   * Sort and limit findings according to sort criteria
   */
  private sortAndLimitFindings(
    findings: AuditResult[],
    sorts: QuerySort[],
    limit: number
  ): AuditResult[] {
    // Apply sorts
    const sorted = [...findings].sort((a, b) => {
      for (const sort of sorts) {
        const aVal = a[sort.field as keyof AuditResult];
        const bVal = b[sort.field as keyof AuditResult];
        
        if (aVal === bVal) continue;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        const comparison = aVal > bVal ? 1 : -1;
        return sort.direction === 'asc' ? comparison : -comparison;
      }
      return 0;
    });
    
    // Apply limit
    return sorted.slice(0, limit);
  }

  /**
   * Order sorts to comply with Firestore inequality constraint rules
   * When using inequality filters (>, >=, <, <=), the first orderBy must be on the inequality field
   */
  private orderSortsForInequality(
    filters: QueryFilter[],
    sorts: QuerySort[]
  ): QuerySort[] {
    // Find inequality filters
    const inequalityOperators = ['>', '>=', '<', '<='];
    const inequalityFilter = filters.find(f => 
      inequalityOperators.includes(f.operator)
    );

    if (!inequalityFilter) {
      // No inequality filter, return sorts as-is
      return sorts;
    }

    // Check if inequality field is already first in sorts
    if (sorts.length > 0 && sorts[0].field === inequalityFilter.field) {
      return sorts;
    }

    // Move inequality field to first position in sorts
    const inequalitySort = sorts.find(s => s.field === inequalityFilter.field);
    const otherSorts = sorts.filter(s => s.field !== inequalityFilter.field);

    if (inequalitySort) {
      // Inequality field already in sorts, move to first
      return [inequalitySort, ...otherSorts];
    } else {
      // Add inequality field as first sort (descending by default for risk queries)
      return [
        { field: inequalityFilter.field, direction: 'desc' },
        ...otherSorts,
      ];
    }
  }

  /**
   * Format query results into readable text
   */
  private formatResults(
    findings: AuditResult[],
    pattern: QueryPattern,
    params: ExtractedParams
  ): string {
    if (findings.length === 0) {
      return this.formatEmptyResults(pattern, params);
    }

    const lines: string[] = [];

    // Add summary header
    lines.push(this.formatSummaryHeader(findings, pattern, params));
    lines.push('');

    // Add results
    lines.push('**Results:**');
    lines.push('');

    findings.forEach((finding, index) => {
      lines.push(this.formatFinding(finding, index + 1));
      lines.push('');
    });

    // Add footer with metadata
    lines.push('---');
    lines.push(`*Query executed in ${Date.now()} ms*`);

    return lines.join('\n');
  }

  /**
   * Format summary header based on query type
   */
  private formatSummaryHeader(
    findings: AuditResult[],
    _pattern: QueryPattern,
    params: ExtractedParams
  ): string {
    const count = findings.length;
    const totalNilai = findings.reduce((sum, f) => sum + f.nilai, 0);
    const avgNilai = count > 0 ? (totalNilai / count).toFixed(2) : '0';

    const lines: string[] = [];
    lines.push(`# Query Results`);
    lines.push('');
    lines.push(`Found **${count}** audit result${count !== 1 ? 's' : ''}${this.formatQueryContext(params)}`);
    lines.push('');
    lines.push(`**Summary Statistics:**`);
    lines.push(`- Total Results: ${count}`);
    lines.push(`- Total Risk Value (Nilai): ${totalNilai}`);
    lines.push(`- Average Risk Value: ${avgNilai}`);

    return lines.join('\n');
  }

  /**
   * Format query context from parameters
   */
  private formatQueryContext(params: ExtractedParams): string {
    const contexts: string[] = [];

    if (params.year) {
      contexts.push(`in year ${params.year}`);
    }

    if (params.department) {
      contexts.push(`for ${params.department} department`);
    }

    if (params.projectName) {
      contexts.push(`for project "${params.projectName}"`);
    }

    if (params.sh) {
      contexts.push(`for subholding ${params.sh}`);
    }

    if (params.minNilai) {
      contexts.push(`with nilai >= ${params.minNilai}`);
    }

    return contexts.length > 0 ? ` ${contexts.join(', ')}` : '';
  }

  /**
   * Format a single finding
   */
  private formatFinding(finding: AuditResult, index: number): string {
    const lines: string[] = [];
    
    lines.push(`### ${index}. ${finding.projectName} (${finding.year})`);
    lines.push(`- **Department:** ${finding.department}`);
    lines.push(`- **Risk Area:** ${finding.riskArea}`);
    lines.push(`- **Risk Value (Nilai):** ${finding.nilai} (Bobot: ${finding.bobot}, Kadar: ${finding.kadar})`);
    
    if (finding.code) {
      lines.push(`- **Code:** ${finding.code}`);
    }
    
    lines.push(`- **Description:** ${finding.descriptions}`);
    
    if (finding.sh) {
      lines.push(`- **Subholding:** ${finding.sh}`);
    }

    return lines.join('\n');
  }

  /**
   * Format empty results message
   */
  private formatEmptyResults(_pattern: QueryPattern, params: ExtractedParams): string {
    const lines: string[] = [];
    
    lines.push(`# No Results Found`);
    lines.push('');
    lines.push(`No audit results found${this.formatQueryContext(params)}.`);
    lines.push('');
    lines.push('**Suggestions:**');
    lines.push('- Try adjusting your search criteria');
    lines.push('- Check if the year, department, or project name is correct');
    lines.push('- Try a broader search without specific filters');

    return lines.join('\n');
  }

  /**
   * Format error message
   */
  private formatError(error: any, _pattern: QueryPattern): string {
    const lines: string[] = [];
    
    lines.push(`# Query Error`);
    lines.push('');
    lines.push(`An error occurred while executing your query.`);
    lines.push('');
    lines.push(`**Error:** ${error.message || 'Unknown error'}`);
    lines.push('');
    lines.push('**Suggestions:**');
    lines.push('- Try rephrasing your query');
    lines.push('- Check your network connection');
    lines.push('- Contact support if the problem persists');

    return lines.join('\n');
  }
}
