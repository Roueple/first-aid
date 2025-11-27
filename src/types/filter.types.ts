import { z } from 'zod';
import { FindingSeverity, FindingStatus } from './finding.types';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort field options for findings (NEW SCHEMA)
 */
export type FindingSortField = 
  | 'dateIdentified' 
  | 'dateDue' 
  | 'creationTimestamp'
  | 'lastModifiedDate' 
  | 'priorityLevel'
  | 'status' 
  | 'subholding'
  | 'findingTitle'
  | 'findingTotal'
  | 'auditYear';

/**
 * Date range filter
 */
export interface DateRangeFilter {
  start?: Date;
  end?: Date;
}

/**
 * Finding filters interface (NEW SCHEMA)
 */
export interface FindingFilters {
  // Priority (was severity)
  priorityLevel?: FindingSeverity[];
  status?: FindingStatus[];
  
  // Organizational (new schema)
  subholding?: string[];
  projectType?: string[];
  projectName?: string[];
  findingDepartment?: string[];
  
  // Audit team
  executor?: string[];
  reviewer?: string[];
  manager?: string[];
  
  // Classification
  controlCategory?: string[];
  processArea?: string[];
  
  // Dates
  dateIdentified?: DateRangeFilter;
  dateDue?: DateRangeFilter;
  auditYear?: number[];
  
  // Scoring
  findingTotal?: {
    min?: number;
    max?: number;
  };
  findingBobot?: number[];
  findingKadar?: number[];
  
  // Tags
  primaryTag?: string[];
  secondaryTags?: string[];
  
  // Search
  searchText?: string;
  isOverdue?: boolean;
  
  // Backward compatibility (mapped internally)
  severity?: FindingSeverity[]; // Maps to priorityLevel
  location?: string[]; // Maps to subholding
  category?: string[]; // Maps to processArea
  department?: string[]; // Maps to findingDepartment
  responsiblePerson?: string[]; // Maps to executor
  riskLevel?: { min?: number; max?: number }; // Maps to findingTotal
  tags?: string[]; // Maps to secondaryTags
}

/**
 * Pagination parameters
 */
export interface Pagination {
  page: number;
  pageSize: number;
  sortBy?: FindingSortField;
  sortDirection?: SortDirection;
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Findings result with pagination
 */
export interface FindingsResult extends PaginatedResult<any> {
  filters?: FindingFilters;
}

/**
 * Search query parameters
 */
export interface SearchParams {
  query: string;
  filters?: FindingFilters;
  pagination?: Pagination;
}

/**
 * Zod schema for date range filter validation
 */
export const DateRangeFilterSchema = z.object({
  start: z.date().optional(),
  end: z.date().optional(),
}).refine(
  (data) => {
    if (data.start && data.end) {
      return data.start <= data.end;
    }
    return true;
  },
  {
    message: 'Start date must be before or equal to end date',
  }
);

/**
 * Zod schema for finding filters validation (NEW SCHEMA)
 */
export const FindingFiltersSchema = z.object({
  // Priority
  priorityLevel: z.array(z.enum(['Critical', 'High', 'Medium', 'Low'])).optional(),
  status: z.array(z.enum(['Open', 'In Progress', 'Closed', 'Deferred'])).optional(),
  
  // Organizational
  subholding: z.array(z.string()).optional(),
  projectType: z.array(z.string()).optional(),
  projectName: z.array(z.string()).optional(),
  findingDepartment: z.array(z.string()).optional(),
  
  // Audit team
  executor: z.array(z.string()).optional(),
  reviewer: z.array(z.string()).optional(),
  manager: z.array(z.string()).optional(),
  
  // Classification
  controlCategory: z.array(z.string()).optional(),
  processArea: z.array(z.string()).optional(),
  
  // Dates
  dateIdentified: DateRangeFilterSchema.optional(),
  dateDue: DateRangeFilterSchema.optional(),
  auditYear: z.array(z.number()).optional(),
  
  // Scoring
  findingTotal: z.object({
    min: z.number().min(1).max(20).optional(),
    max: z.number().min(1).max(20).optional(),
  }).optional(),
  findingBobot: z.array(z.number().min(1).max(4)).optional(),
  findingKadar: z.array(z.number().min(1).max(5)).optional(),
  
  // Tags
  primaryTag: z.array(z.string()).optional(),
  secondaryTags: z.array(z.string()).optional(),
  
  // Search
  searchText: z.string().optional(),
  isOverdue: z.boolean().optional(),
  
  // Backward compatibility
  severity: z.array(z.enum(['Critical', 'High', 'Medium', 'Low'])).optional(),
  location: z.array(z.string()).optional(),
  category: z.array(z.string()).optional(),
  department: z.array(z.string()).optional(),
  responsiblePerson: z.array(z.string()).optional(),
  riskLevel: z.object({
    min: z.number().min(1).max(20).optional(),
    max: z.number().min(1).max(20).optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Zod schema for pagination validation (NEW SCHEMA)
 */
export const PaginationSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1'),
  pageSize: z.number().int().min(1).max(100, 'Page size must be between 1 and 100'),
  sortBy: z.enum([
    'dateIdentified',
    'dateDue',
    'creationTimestamp',
    'lastModifiedDate',
    'priorityLevel',
    'status',
    'subholding',
    'findingTitle',
    'findingTotal',
    'auditYear',
  ]).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
});

/**
 * Zod schema for search params validation
 */
export const SearchParamsSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  filters: FindingFiltersSchema.optional(),
  pagination: PaginationSchema.optional(),
});

/**
 * Default pagination values (NEW SCHEMA)
 */
export const DEFAULT_PAGINATION: Pagination = {
  page: 1,
  pageSize: 20,
  sortBy: 'creationTimestamp',
  sortDirection: 'desc',
};

/**
 * Helper function to create paginated result
 */
export function createPaginatedResult<T>(
  items: T[],
  total: number,
  pagination: Pagination
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / pagination.pageSize);
  
  return {
    items,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages,
    hasNextPage: pagination.page < totalPages,
    hasPreviousPage: pagination.page > 1,
  };
}
