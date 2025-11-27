/**
 * Types for pseudonymization service
 */

export type MappingType = 'names' | 'ids' | 'amounts' | 'locations';

export interface PseudonymMapping {
  id: string;
  sessionId: string; // Chat session ID - ensures isolation between different chat sessions
  batchId: string; // Deprecated: kept for backward compatibility
  mappingType: MappingType;
  originalValue: string; // encrypted with AES-256-GCM
  pseudonymValue: string;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp; // auto-delete after 30 days
  usageCount: number; // tracks how many times this mapping has been used
  lastAccessedAt?: FirebaseFirestore.Timestamp; // tracks last access for audit purposes
  createdBy: string; // user ID who created the mapping
}

export interface PseudonymizeRequest {
  findings: any[];
  sessionId: string; // Required: Chat session ID for isolation
  batchId?: string; // Deprecated: kept for backward compatibility
}

export interface PseudonymizeResponse {
  pseudonymizedFindings: any[];
  sessionId: string; // Session ID for this pseudonymization
  batchId: string; // Deprecated: kept for backward compatibility (same as sessionId)
  mappingsCreated: number;
}

export interface DepseudonymizeRequest {
  data: any;
  sessionId: string; // Required: Chat session ID to retrieve correct mappings
  batchId?: string; // Deprecated: kept for backward compatibility
}

export interface DepseudonymizeResponse {
  depseudonymizedData: any;
}
