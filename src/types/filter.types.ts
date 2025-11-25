import { z } from 'zod';
import { FindingSeverity, FindingStatus } from './finding.types';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort field options for findings
 */
export type FindingSortField = 
  | 'dateIdentified' 
  | 'dateDue' 
  | 'dateCreated' 
  | 'dateUpdated' 
  | 'severity' 
  | 'status' 
  | 'location' 
  | 'title'
  | 'riskLevel';

/**
 * Date range filter
 */
export interface DateRangeFilter {
  start?: Date;
  end?: Date;
}

/**
 * Finding filters interface
 */
export interface FindingFilters {
  severity?: FindingSeverity[];
  status?: FindingStatus[];
  location?: string[];
  category?: string[];
  department?: string[];
  responsiblePerson?: string[];
  dateIdentified?: DateRangeFilter;
  dateDue?: DateRangeFilter;
  riskLevel?: {
    min?: number;
    max?: number;
  };
  tags?: string[];
  searchText?: string;
  isOverdue?: boolean;
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
 * Zod schema for finding filters validation
 */
export const FindingFiltersSchema = z.object({
  severity: z.array(z.enum(['Critical', 'High', 'Medium', 'Low'])).optional(),
  status: z.array(z.enum(['Open', 'In Progress', 'Closed', 'Deferred'])).optional(),
  location: z.array(z.string()).optional(),
  category: z.array(z.string()).optional(),
  department: z.array(z.string()).optional(),
  responsiblePerson: z.array(z.string()).optional(),
  dateIdentified: DateRangeFilterSchema.optional(),
  dateDue: DateRangeFilterSchema.optional(),
  riskLevel: z.object({
    min: z.number().min(1).max(10).optional(),
    max: z.number().min(1).max(10).optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
  searchText: z.string().optional(),
  isOverdue: z.boolean().optional(),
});

/**
 * Zod schema for pagination validation
 */
export const PaginationSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1'),
  pageSize: z.number().int().min(1).max(100, 'Page size must be between 1 and 100'),
  sortBy: z.enum([
    'dateIdentified',
    'dateDue',
    'dateCreated',
    'dateUpdated',
    'severity',
    'status',
    'location',
    'title',
    'riskLevel',
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
 * Default pagination values
 */
export const DEFAULT_PAGINATION: Pagination = {
  page: 1,
  pageSize: 20,
  sortBy: 'dateCreated',
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
