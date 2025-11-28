/**
 * Services barrel export
 * Provides centralized access to all application services
 */

export { default as authService } from './AuthService';
export type { User, AuthStateChangeCallback } from './AuthService';

export { DatabaseService, DatabaseError, DatabaseErrorType } from './DatabaseService';
export type {
  QueryFilter,
  QuerySort,
  QueryOptions,
  RetryConfig,
} from './DatabaseService';

export { FindingsService } from './FindingsService';
export { default as findingsService } from './FindingsService';

export { PseudonymizationService, pseudonymizationService } from './PseudonymizationService';
export type {
  PseudonymizeRequest,
  PseudonymizeResponse,
  DepseudonymizeRequest,
  DepseudonymizeResponse,
} from './PseudonymizationService';

export { AuditService, auditService } from './AuditService';

export { default as chatSessionService } from './ChatSessionService';
export type { ChatSession, ChatMessage } from '../types/chat.types';

export { 
  QueryClassifier, 
  queryClassifier,
  SIMPLE_PATTERNS,
  COMPLEX_PATTERNS,
  HYBRID_PATTERNS,
  PROJECT_TYPE_ALIASES as QUERY_CLASSIFIER_PROJECT_TYPE_ALIASES,
  SEVERITY_ALIASES as QUERY_CLASSIFIER_SEVERITY_ALIASES,
  STATUS_ALIASES as QUERY_CLASSIFIER_STATUS_ALIASES,
} from './QueryClassifier';
export type { IQueryClassifier } from './QueryClassifier';

export { 
  FilterExtractor, 
  filterExtractor,
} from './FilterExtractor';

export {
  ContextBuilder,
  contextBuilder,
} from './ContextBuilder';

export {
  ResponseFormatter,
  responseFormatter,
} from './ResponseFormatter';

export {
  QueryRouterService,
  queryRouterService,
} from './QueryRouterService';
export type { IQueryRouterService } from './QueryRouterService';
