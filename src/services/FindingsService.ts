import { Timestamp } from 'firebase/firestore';
import { DatabaseService, QueryFilter, QueryOptions } from './DatabaseService';
import {
  Finding,
  CreateFindingInput,
  UpdateFindingInput,
  CreateFindingSchema,
  UpdateFindingSchema,
} from '../types/finding.types';
import {
  FindingFilters,
  Pagination,
  PaginatedResult,
  FindingsResult,
  DEFAULT_PAGINATION,
} from '../types/filter.types';

/**
 * FindingsService extends DatabaseService with specialized queries for findings
 * Implements filtering, pagination, search, and specialized queries for overdue and high-risk findings
 */
export class FindingsService extends DatabaseService<Finding> {
  constructor() {
    super('findings');
  }

  /**
   * Convert Date to Firestore Timestamp
   */
  private toTimestamp(date: Date | Timestamp): Timestamp {
    // Check if it's already a Timestamp by checking for toDate method
    if (date && typeof (date as any).toDate === 'function') {
      return date as Timestamp;
    }
    return Timestamp.fromDate(date as Date);
  }

  /**
   * Calculate computed fields for a finding
   */
  private addComputedFields(finding: Finding & { id: string }): Finding & { id: string } {
    const now = new Date();
    
    // Calculate isOverdue
    if (finding.dateDue && finding.status !== 'Closed') {
      const dueDate = finding.dateDue.toDate();
      finding.isOverdue = dueDate < now;
    } else {
      finding.isOverdue = false;
    }

    // Calculate daysOpen
    if (finding.dateIdentified) {
      const identifiedDate = finding.dateIdentified.toDate();
      const endDate = finding.dateCompleted ? finding.dateCompleted.toDate() : now;
      finding.daysOpen = Math.floor((endDate.getTime() - identifiedDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    return finding;
  }

  /**
   * Convert FindingFilters to QueryOptions
   */
  private buildQueryOptions(filters?: FindingFilters): QueryOptions {
    const queryFilters: QueryFilter[] = [];

    if (!filters) {
      return { filters: queryFilters };
    }

    // Severity filter
    if (filters.severity && filters.severity.length > 0) {
      queryFilters.push({
        field: 'severity',
        operator: 'in',
        value: filters.severity,
      });
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      queryFilters.push({
        field: 'status',
        operator: 'in',
        value: filters.status,
      });
    }

    // Location filter
    if (filters.location && filters.location.length > 0) {
      queryFilters.push({
        field: 'location',
        operator: 'in',
        value: filters.location,
      });
    }

    // Category filter
    if (filters.category && filters.category.length > 0) {
      queryFilters.push({
        field: 'category',
        operator: 'in',
        value: filters.category,
      });
    }

    // Department filter
    if (filters.department && filters.department.length > 0) {
      queryFilters.push({
        field: 'department',
        operator: 'in',
        value: filters.department,
      });
    }

    // Responsible person filter
    if (filters.responsiblePerson && filters.responsiblePerson.length > 0) {
      queryFilters.push({
        field: 'responsiblePerson',
        operator: 'in',
        value: filters.responsiblePerson,
      });
    }

    // Date identified range filter
    if (filters.dateIdentified) {
      if (filters.dateIdentified.start) {
        queryFilters.push({
          field: 'dateIdentified',
          operator: '>=',
          value: this.toTimestamp(filters.dateIdentified.start),
        });
      }
      if (filters.dateIdentified.end) {
        queryFilters.push({
          field: 'dateIdentified',
          operator: '<=',
          value: this.toTimestamp(filters.dateIdentified.end),
        });
      }
    }

    // Date due range filter
    if (filters.dateDue) {
      if (filters.dateDue.start) {
        queryFilters.push({
          field: 'dateDue',
          operator: '>=',
          value: this.toTimestamp(filters.dateDue.start),
        });
      }
      if (filters.dateDue.end) {
        queryFilters.push({
          field: 'dateDue',
          operator: '<=',
          value: this.toTimestamp(filters.dateDue.end),
        });
      }
    }

    // Risk level filter
    if (filters.riskLevel) {
      if (filters.riskLevel.min !== undefined) {
        queryFilters.push({
          field: 'riskLevel',
          operator: '>=',
          value: filters.riskLevel.min,
        });
      }
      if (filters.riskLevel.max !== undefined) {
        queryFilters.push({
          field: 'riskLevel',
          operator: '<=',
          value: filters.riskLevel.max,
        });
      }
    }

    // Tags filter (array-contains-any)
    if (filters.tags && filters.tags.length > 0) {
      queryFilters.push({
        field: 'tags',
        operator: 'array-contains-any',
        value: filters.tags,
      });
    }

    return { filters: queryFilters };
  }

  /**
   * Client-side text search across title, description, and responsible person
   */
  private searchInFindings(findings: (Finding & { id: string })[], searchText: string): (Finding & { id: string })[] {
    if (!searchText || searchText.trim() === '') {
      return findings;
    }

    const searchLower = searchText.toLowerCase().trim();
    
    return findings.filter((finding) => {
      const titleMatch = finding.title.toLowerCase().includes(searchLower);
      const descriptionMatch = finding.description.toLowerCase().includes(searchLower);
      const responsiblePersonMatch = finding.responsiblePerson.toLowerCase().includes(searchLower);
      
      return titleMatch || descriptionMatch || responsiblePersonMatch;
    });
  }

  /**
   * Client-side filter for overdue findings
   */
  private filterOverdue(findings: (Finding & { id: string })[]): (Finding & { id: string })[] {
    const now = new Date();
    
    return findings.filter((finding) => {
      if (!finding.dateDue || finding.status === 'Closed') {
        return false;
      }
      const dueDate = finding.dateDue.toDate();
      return dueDate < now;
    });
  }

  /**
   * Get findings with filters and pagination
   * Implements Requirements 3.1, 3.2, 3.5
   */
  async getFindings(
    filters?: FindingFilters,
    pagination: Pagination = DEFAULT_PAGINATION
  ): Promise<FindingsResult> {
    // Build query options from filters
    const queryOptions = this.buildQueryOptions(filters);

    // Get paginated results
    const result = await this.getPaginated(pagination, queryOptions);

    // Add computed fields to each finding
    const itemsWithComputed = result.items.map((item) => this.addComputedFields(item));

    // Apply client-side search if searchText is provided
    let filteredItems = itemsWithComputed;
    if (filters?.searchText) {
      filteredItems = this.searchInFindings(itemsWithComputed, filters.searchText);
    }

    // Apply client-side overdue filter if specified
    if (filters?.isOverdue) {
      filteredItems = this.filterOverdue(filteredItems);
    }

    // Recalculate pagination if client-side filtering was applied
    const total = filters?.searchText || filters?.isOverdue ? filteredItems.length : result.total;
    const totalPages = Math.ceil(total / pagination.pageSize);

    return {
      items: filteredItems,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1,
      filters,
    };
  }

  /**
   * Get overdue findings
   * Implements Requirements 3.1, 3.2
   */
  async getOverdueFindings(pagination: Pagination = DEFAULT_PAGINATION): Promise<PaginatedResult<Finding & { id: string }>> {
    // Get all open findings with due dates
    const queryOptions = this.buildQueryOptions({
      status: ['Open', 'In Progress'],
    });

    // Get all matching findings (we'll filter client-side for overdue)
    const allFindings = await this.getAll(queryOptions);

    // Add computed fields and filter for overdue
    const findingsWithComputed = allFindings.map((item) => this.addComputedFields(item));
    const overdueFindings = this.filterOverdue(findingsWithComputed);

    // Apply pagination manually
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    const paginatedItems = overdueFindings.slice(startIndex, endIndex);

    const total = overdueFindings.length;
    const totalPages = Math.ceil(total / pagination.pageSize);

    return {
      items: paginatedItems,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1,
    };
  }

  /**
   * Get high-risk findings (Critical and High severity)
   * Implements Requirements 3.1, 3.2
   */
  async getHighRiskFindings(pagination: Pagination = DEFAULT_PAGINATION): Promise<PaginatedResult<Finding & { id: string }>> {
    const queryOptions = this.buildQueryOptions({
      severity: ['Critical', 'High'],
    });

    const result = await this.getPaginated(pagination, queryOptions);

    // Add computed fields
    const itemsWithComputed = result.items.map((item) => this.addComputedFields(item));

    return {
      ...result,
      items: itemsWithComputed,
    };
  }

  /**
   * Search findings with text matching
   * Implements Requirements 3.3
   */
  async searchFindings(
    searchText: string,
    filters?: FindingFilters,
    pagination: Pagination = DEFAULT_PAGINATION
  ): Promise<FindingsResult> {
    // Combine search text with filters
    const combinedFilters: FindingFilters = {
      ...filters,
      searchText,
    };

    return this.getFindings(combinedFilters, pagination);
  }

  /**
   * Create a new finding with validation
   * Implements Requirements 3.4
   */
  async createFinding(input: CreateFindingInput): Promise<string> {
    // Validate input
    const validatedInput = CreateFindingSchema.parse(input);

    // Convert dates to Timestamps
    const data = {
      ...validatedInput,
      dateIdentified: this.toTimestamp(validatedInput.dateIdentified),
      dateDue: validatedInput.dateDue ? this.toTimestamp(validatedInput.dateDue) : undefined,
      tags: validatedInput.tags || [],
      importBatch: validatedInput.originalSource, // Use originalSource as importBatch for now
    };

    return this.create(data);
  }

  /**
   * Update a finding with validation
   * Implements Requirements 3.4
   */
  async updateFinding(id: string, input: UpdateFindingInput): Promise<void> {
    // Validate input
    const validatedInput = UpdateFindingSchema.parse(input);

    // Convert dates to Timestamps if provided
    const data: any = { ...validatedInput };
    if (validatedInput.dateIdentified) {
      data.dateIdentified = this.toTimestamp(validatedInput.dateIdentified);
    }
    if (validatedInput.dateDue) {
      data.dateDue = this.toTimestamp(validatedInput.dateDue);
    }
    if (validatedInput.dateCompleted) {
      data.dateCompleted = this.toTimestamp(validatedInput.dateCompleted);
    }

    return this.update(id, data);
  }

  /**
   * Get a finding by ID with computed fields
   */
  async getFindingById(id: string): Promise<(Finding & { id: string }) | null> {
    const finding = await this.getById(id);
    
    if (!finding) {
      return null;
    }

    return this.addComputedFields(finding);
  }

  /**
   * Delete a finding
   */
  async deleteFinding(id: string): Promise<void> {
    return this.delete(id);
  }
}

// Create singleton instance
const findingsService = new FindingsService();

export default findingsService;
