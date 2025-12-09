/**
 * Query Router Types and Interfaces
 * 
 * Types for the Smart Query Router system that classifies and routes
 * user queries to the appropriate execution path (simple, complex, or hybrid).
 * 
 * @see .kiro/specs/smart-query-router/design.md
 * @see .kiro/specs/smart-query-router/requirements.md
 */

import { z } from 'zod';
import { 
  FindingSeverity, 
  FindingStatus, 
  ProjectType,
  Finding 
} from './finding.types';

// ============================================================================
// Query Type Enum
// ============================================================================

/**
 * Query type classification
 * - 'simple': Direct database lookup using structured filters
 * - 'complex': AI reasoning with RAG context
 * - 'hybrid': Database retrieval followed by AI analysis
 */
export type QueryType = 'simple' | 'complex' | 'hybrid';

// ============================================================================
// Extracted Filters
// ============================================================================

/**
 * Structured filter parameters extracted from natural language queries
 */
export interface ExtractedFilters {
  /** Year filter (e.g., "2024") - stored as string in Firestore */
  year?: string;
  /** Project type filter */
  projectType?: ProjectType;
  /** Severity levels to include */
  severity?: FindingSeverity[];
  /** Status values to include */
  status?: FindingStatus[];
  /** Department filter */
  department?: string;
  /** Keywords for text search */
  keywords?: string[];
  /** Date range filter */
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

// ============================================================================
// Query Intent
// ============================================================================

/**
 * Classified query intent with extracted parameters
 */
export interface QueryIntent {
  /** Classified query type */
  type: QueryType;
  /** Classification confidence score (0-1) */
  confidence: number;
  /** Extracted filter parameters */
  extractedFilters: ExtractedFilters;
  /** Whether AI analysis is required */
  requiresAI: boolean;
  /** Keywords that triggered complex classification */
  analysisKeywords: string[];
}

// ============================================================================
// Query Metadata
// ============================================================================

/**
 * Metadata about query execution
 */
export interface QueryMetadata {
  /** Type of query that was executed */
  queryType: QueryType;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Number of findings analyzed */
  findingsAnalyzed: number;
  /** Estimated token usage (for AI queries) */
  tokensUsed?: number;
  /** Classification confidence score */
  confidence: number;
  /** Filters that were extracted and applied */
  extractedFilters: ExtractedFilters;
}

// ============================================================================
// Finding Summary
// ============================================================================

/**
 * Summarized finding for query responses
 */
export interface FindingSummary {
  /** Finding ID */
  id: string;
  /** Finding title */
  title: string;
  /** Severity level */
  severity: FindingSeverity;
  /** Current status */
  status: FindingStatus;
  /** Project type */
  projectType: ProjectType;
  /** Audit year */
  year: number;
}

// ============================================================================
// Query Response
// ============================================================================

/**
 * Successful query response
 */
export interface QueryResponse {
  /** Type of query that was executed */
  type: QueryType;
  /** Answer text (formatted results or AI response) */
  answer: string;
  /** Finding summaries (for simple and hybrid queries) */
  findings?: FindingSummary[];
  /** Full findings for Excel export (not just summaries) */
  fullFindings?: Finding[];
  /** Query execution metadata */
  metadata: QueryMetadata;
  /** Pagination info for large result sets */
  pagination?: PaginationInfo;
}

/**
 * Pagination information for large result sets
 */
export interface PaginationInfo {
  /** Total number of results */
  totalCount: number;
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Number of results per page */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there are more results */
  hasMore: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes for query router errors
 */
export type QueryRouterErrorCode = 
  | 'CLASSIFICATION_ERROR'
  | 'DATABASE_ERROR'
  | 'AI_ERROR'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT_ERROR';

/**
 * Error response from query router
 */
export interface QueryRouterError {
  /** Error code */
  code: QueryRouterErrorCode;
  /** Human-readable error message */
  message: string;
  /** Suggestion for user to resolve the issue */
  suggestion?: string;
  /** Fallback data if available */
  fallbackData?: Finding[];
}

/**
 * Error response wrapper
 */
export interface QueryErrorResponse {
  /** Always false for error responses */
  success: false;
  /** Error details */
  error: QueryRouterError;
  /** Metadata about the failed query */
  metadata: QueryMetadata;
}

// ============================================================================
// Query Options
// ============================================================================

/**
 * Options for query execution
 */
export interface QueryOptions {
  /** AI thinking mode */
  thinkingMode?: 'low' | 'high';
  /** Maximum number of results to return */
  maxResults?: number;
  /** Whether to include metadata in response */
  includeMetadata?: boolean;
  /** Session ID for context */
  sessionId?: string;
  /** Page number for pagination (1-indexed) */
  page?: number;
  /** Override query type classification */
  forceQueryType?: QueryType;
}

// ============================================================================
// Validation Result
// ============================================================================

/**
 * Result of filter validation
 */
export interface FilterValidationResult {
  /** Whether all filters are valid */
  valid: boolean;
  /** Validation error messages */
  errors: string[];
  /** Sanitized filters with invalid values removed */
  sanitizedFilters: ExtractedFilters;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

/**
 * Zod schema for QueryType
 */
export const QueryTypeSchema = z.enum(['simple', 'complex', 'hybrid']);

/**
 * Zod schema for ExtractedFilters
 */
export const ExtractedFiltersSchema = z.object({
  year: z.string().regex(/^20\d{2}$/).optional(),
  projectType: z.enum([
    'Hotel', 'Landed House', 'Apartment', 'School', 'University',
    'Insurance', 'Hospital', 'Clinic', 'Mall', 'Office Building',
    'Mixed-Use Development'
  ]).optional(),
  severity: z.array(z.enum(['Critical', 'High', 'Medium', 'Low'])).optional(),
  status: z.array(z.enum(['Open', 'In Progress', 'Closed', 'Deferred'])).optional(),
  department: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.date().optional(),
    end: z.date().optional(),
  }).optional(),
});

/**
 * Zod schema for QueryIntent
 */
export const QueryIntentSchema = z.object({
  type: QueryTypeSchema,
  confidence: z.number().min(0).max(1),
  extractedFilters: ExtractedFiltersSchema,
  requiresAI: z.boolean(),
  analysisKeywords: z.array(z.string()),
});

/**
 * Zod schema for QueryMetadata
 */
export const QueryMetadataSchema = z.object({
  queryType: QueryTypeSchema,
  executionTimeMs: z.number().nonnegative(),
  findingsAnalyzed: z.number().int().nonnegative(),
  tokensUsed: z.number().int().nonnegative().optional(),
  confidence: z.number().min(0).max(1),
  extractedFilters: ExtractedFiltersSchema,
});

/**
 * Zod schema for FindingSummary
 */
export const FindingSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']),
  status: z.enum(['Open', 'In Progress', 'Closed', 'Deferred']),
  projectType: z.enum([
    'Hotel', 'Landed House', 'Apartment', 'School', 'University',
    'Insurance', 'Hospital', 'Clinic', 'Mall', 'Office Building',
    'Mixed-Use Development'
  ]),
  year: z.number().int(),
});

/**
 * Zod schema for PaginationInfo
 */
export const PaginationInfoSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  currentPage: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

/**
 * Zod schema for QueryResponse
 */
export const QueryResponseSchema = z.object({
  type: QueryTypeSchema,
  answer: z.string(),
  findings: z.array(FindingSummarySchema).optional(),
  metadata: QueryMetadataSchema,
  pagination: PaginationInfoSchema.optional(),
});

/**
 * Zod schema for QueryRouterErrorCode
 */
export const QueryRouterErrorCodeSchema = z.enum([
  'CLASSIFICATION_ERROR',
  'DATABASE_ERROR',
  'AI_ERROR',
  'VALIDATION_ERROR',
  'RATE_LIMIT_ERROR',
]);

/**
 * Zod schema for QueryRouterError
 */
export const QueryRouterErrorSchema = z.object({
  code: QueryRouterErrorCodeSchema,
  message: z.string(),
  suggestion: z.string().optional(),
  // fallbackData is not validated here as it uses the Finding type
});

// ============================================================================
// Serialization Helpers
// ============================================================================

/**
 * Serialize a QueryIntent to JSON string
 * @param intent - QueryIntent object to serialize
 * @returns JSON string representation
 */
export function serializeQueryIntent(intent: QueryIntent): string {
  // Handle date serialization in extractedFilters
  const serializable = {
    ...intent,
    extractedFilters: {
      ...intent.extractedFilters,
      dateRange: intent.extractedFilters.dateRange ? {
        start: intent.extractedFilters.dateRange.start?.toISOString(),
        end: intent.extractedFilters.dateRange.end?.toISOString(),
      } : undefined,
    },
  };
  return JSON.stringify(serializable);
}

/**
 * Deserialize a JSON string to QueryIntent
 * @param json - JSON string to deserialize
 * @returns QueryIntent object
 * @throws Error if JSON is invalid or doesn't match schema
 */
export function deserializeQueryIntent(json: string): QueryIntent {
  const parsed = JSON.parse(json);
  
  // Convert date strings back to Date objects
  if (parsed.extractedFilters?.dateRange) {
    if (parsed.extractedFilters.dateRange.start) {
      parsed.extractedFilters.dateRange.start = new Date(parsed.extractedFilters.dateRange.start);
    }
    if (parsed.extractedFilters.dateRange.end) {
      parsed.extractedFilters.dateRange.end = new Date(parsed.extractedFilters.dateRange.end);
    }
  }
  
  // Validate against schema
  const result = QueryIntentSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid QueryIntent JSON: ${result.error.message}`);
  }
  
  return result.data;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a response is an error response
 */
export function isQueryErrorResponse(
  response: QueryResponse | QueryErrorResponse
): response is QueryErrorResponse {
  return 'success' in response && response.success === false;
}

/**
 * Type guard to check if a value is a valid QueryType
 */
export function isValidQueryType(value: unknown): value is QueryType {
  return value === 'simple' || value === 'complex' || value === 'hybrid';
}
