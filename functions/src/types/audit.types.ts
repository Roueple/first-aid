/**
 * Audit logging types for Cloud Functions
 * 
 * These types define the structure for audit log requests and responses
 * used by the logAuditEvent callable function.
 */

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
  | 'pseudonymize'
  | 'depseudonymize'
  | 'cleanup_mappings'
  | 'mapping_create'
  | 'mapping_retrieve'
  | 'mapping_delete';

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
  | 'mapping'
  | 'ai_result';

/**
 * Request payload for logAuditEvent callable function
 */
export interface LogAuditEventRequest {
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details?: Record<string, any>;
}

/**
 * Response from logAuditEvent callable function
 */
export interface LogAuditEventResponse {
  success: boolean;
  logId: string;
  timestamp: string;
}

/**
 * Internal audit log document structure in Firestore
 */
export interface AuditLogDocument {
  userId: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  timestamp: FirebaseFirestore.FieldValue;
}
