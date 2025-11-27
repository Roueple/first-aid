import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * Audit action types
 */
export type AuditAction = 
  | 'login' 
  | 'logout' 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'export' 
  | 'ai_query'
  | 'import'
  | 'report_generate'
  | 'report_download'
  | 'error';

/**
 * Resource types that can be audited
 */
export type ResourceType = 
  | 'finding' 
  | 'report' 
  | 'chat' 
  | 'user' 
  | 'pattern'
  | 'session'
  | 'system';

/**
 * Audit log interface
 * Represents a logged action in the system
 */
export interface AuditLog {
  id: string;
  userId: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  timestamp: Timestamp;
}

/**
 * Input type for creating an audit log
 */
export interface CreateAuditLogInput {
  userId: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

/**
 * Audit log filter options
 */
export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction[];
  resourceType?: ResourceType[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Zod schema for audit log validation
 */
export const AuditLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  action: z.enum([
    'login',
    'logout',
    'create',
    'update',
    'delete',
    'export',
    'ai_query',
    'import',
    'report_generate',
    'report_download',
    'error',
  ]),
  resourceType: z.enum(['finding', 'report', 'chat', 'user', 'pattern', 'session', 'system']),
  resourceId: z.string().optional(),
  details: z.record(z.string(), z.any()),
  ipAddress: z.string().optional(),
  timestamp: z.any(), // Timestamp type
});

/**
 * Zod schema for creating an audit log
 */
export const CreateAuditLogSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  action: z.enum([
    'login',
    'logout',
    'create',
    'update',
    'delete',
    'export',
    'ai_query',
    'import',
    'report_generate',
    'report_download',
    'error',
  ]),
  resourceType: z.enum(['finding', 'report', 'chat', 'user', 'pattern', 'session', 'system']),
  resourceId: z.string().optional(),
  details: z.record(z.string(), z.any()).optional(),
  ipAddress: z.string().optional(),
});

/**
 * Zod schema for audit log filters
 */
export const AuditLogFiltersSchema = z.object({
  userId: z.string().optional(),
  action: z.array(z.enum([
    'login',
    'logout',
    'create',
    'update',
    'delete',
    'export',
    'ai_query',
    'import',
    'report_generate',
    'report_download',
    'error',
  ])).optional(),
  resourceType: z.array(z.enum(['finding', 'report', 'chat', 'user', 'pattern', 'session', 'system'])).optional(),
  dateRange: z.object({
    start: z.date(),
    end: z.date(),
  }).optional(),
});
