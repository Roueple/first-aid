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
import { calculateFindingTotal, calculatePriorityLevel } from '../types/finding.constants';
import { auditService } from './AuditService';

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

    // Priority level filter (check both new and legacy field names)
    const severityFilter = filters.priorityLevel || filters.severity;
    if (severityFilter && severityFilter.length > 0) {
      queryFilters.push({
        field: 'priorityLevel',
        operator: 'in',
        value: severityFilter,
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

    // Subholding filter (check both new and legacy field names)
    const subholdingFilter = filters.subholding || filters.location;
    if (subholdingFilter && subholdingFilter.length > 0) {
      queryFilters.push({
        field: 'subholding',
        operator: 'in',
        value: subholdingFilter,
      });
    }

    // Process area filter (check both new and legacy field names)
    const processAreaFilter = filters.processArea || filters.category;
    if (processAreaFilter && processAreaFilter.length > 0) {
      queryFilters.push({
        field: 'processArea',
        operator: 'in',
        value: processAreaFilter,
      });
    }

    // Department filter (check both new and legacy field names)
    const departmentFilter = filters.findingDepartment || filters.department;
    if (departmentFilter && departmentFilter.length > 0) {
      queryFilters.push({
        field: 'findingDepartment',
        operator: 'in',
        value: departmentFilter,
      });
    }

    // Project type filter
    if (filters.projectType && filters.projectType.length > 0) {
      queryFilters.push({
        field: 'projectType',
        operator: 'in',
        value: filters.projectType,
      });
    }

    // Audit year filter
    if (filters.auditYear && filters.auditYear.length > 0) {
      queryFilters.push({
        field: 'auditYear',
        operator: 'in',
        value: filters.auditYear,
      });
    }

    // Executor filter (check both new and legacy field names)
    const executorFilter = filters.executor || filters.responsiblePerson;
    if (executorFilter && executorFilter.length > 0) {
      queryFilters.push({
        field: 'executor',
        operator: 'in',
        value: executorFilter,
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

    // Finding total filter (check both new and legacy field names)
    const riskLevelFilter = filters.findingTotal || filters.riskLevel;
    if (riskLevelFilter) {
      if (riskLevelFilter.min !== undefined) {
        queryFilters.push({
          field: 'findingTotal',
          operator: '>=',
          value: riskLevelFilter.min,
        });
      }
      if (riskLevelFilter.max !== undefined) {
        queryFilters.push({
          field: 'findingTotal',
          operator: '<=',
          value: riskLevelFilter.max,
        });
      }
    }

    // Tags filter (check both new and legacy field names)
    const tagsFilter = filters.secondaryTags || filters.tags;
    if (tagsFilter && tagsFilter.length > 0) {
      queryFilters.push({
        field: 'secondaryTags',
        operator: 'array-contains-any',
        value: tagsFilter,
      });
    }

    return { filters: queryFilters };
  }

  /**
   * Client-side text search across title, description, executor, and other fields
   * Uses word boundary matching to avoid false positives (e.g., "IT" won't match "duties")
   */
  private searchInFindings(findings: (Finding & { id: string })[], searchText: string): (Finding & { id: string })[] {
    if (!searchText || searchText.trim() === '') {
      return findings;
    }

    const searchLower = searchText.toLowerCase().trim();
    
    // Create regex with word boundaries for each search term
    // Split by spaces to handle multiple keywords
    const searchTerms = searchLower.split(/\s+/).filter(term => term.length > 0);
    const regexPatterns = searchTerms.map(term => {
      // Escape special regex characters
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Use word boundary \b for whole word matching
      return new RegExp(`\\b${escapedTerm}`, 'i');
    });
    
    return findings.filter((finding) => {
      const searchableText = [
        finding.findingTitle,
        finding.findingDescription,
        finding.executor,
        finding.projectName,
        finding.findingDepartment,
      ].join(' ').toLowerCase();
      
      // All search terms must match (AND logic)
      return regexPatterns.every(regex => regex.test(searchableText));
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
      console.warn(`⚠️ CLIENT-SIDE FILTER: searchText="${filters.searchText}" (fetched ${itemsWithComputed.length} docs from Firestore)`);
      filteredItems = this.searchInFindings(itemsWithComputed, filters.searchText);
      console.log(`   → Filtered to ${filteredItems.length} results`);
    }

    // Apply client-side overdue filter if specified
    if (filters?.isOverdue) {
      console.warn(`⚠️ CLIENT-SIDE FILTER: isOverdue=true (processing ${filteredItems.length} docs)`);
      filteredItems = this.filterOverdue(filteredItems);
      console.log(`   → Filtered to ${filteredItems.length} results`);
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

    // Calculate findingTotal and priorityLevel
    const findingTotal = calculateFindingTotal(validatedInput.findingBobot, validatedInput.findingKadar);
    const priorityLevel = calculatePriorityLevel(findingTotal);

    // Convert dates to Timestamps
    const data = {
      ...validatedInput,
      findingTotal,
      priorityLevel,
      dateIdentified: this.toTimestamp(validatedInput.dateIdentified),
      dateDue: validatedInput.dateDue ? this.toTimestamp(validatedInput.dateDue) : undefined,
      secondaryTags: validatedInput.secondaryTags || [],
      importBatch: validatedInput.originalSource, // Use originalSource as importBatch for now
      modifiedBy: 'system', // Will be updated with actual user
    };

    const findingId = await this.create(data);

    // Log finding creation
    await auditService.logFindingCreate(findingId, {
      title: validatedInput.findingTitle,
      priorityLevel,
      status: validatedInput.status,
    });

    return findingId;
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

    // Recalculate findingTotal and priorityLevel if bobot or kadar changed
    if (validatedInput.findingBobot !== undefined || validatedInput.findingKadar !== undefined) {
      // Get current finding to get missing values
      const currentFinding = await this.getById(id);
      if (currentFinding) {
        const bobot = validatedInput.findingBobot ?? currentFinding.findingBobot;
        const kadar = validatedInput.findingKadar ?? currentFinding.findingKadar;
        data.findingTotal = calculateFindingTotal(bobot, kadar);
        data.priorityLevel = calculatePriorityLevel(data.findingTotal);
      }
    }

    data.modifiedBy = 'system'; // Will be updated with actual user

    await this.update(id, data);

    // Log finding update with changed fields
    const changedFields = Object.keys(validatedInput);
    await auditService.logFindingUpdate(id, changedFields);
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
    await this.delete(id);

    // Log finding deletion
    await auditService.logFindingDelete(id);
  }
}

// Create singleton instance
const findingsService = new FindingsService();

export default findingsService;
