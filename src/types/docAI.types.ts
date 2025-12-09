import { Timestamp } from 'firebase/firestore';

/**
 * DocAI Session - Tracks user chat sessions (one per user session)
 * Relationship: One session has many chats
 */
export interface DocSession {
  id?: string;
  userId: string;
  title?: string; // Auto-generated title based on first message
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActivityAt: Timestamp;
  anonymizationMap: Record<string, string>; // Maps real values to anonymized versions
  sessionMetadata?: {
    deviceInfo?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  isActive: boolean;
  messageCount: number;
}

/**
 * DocAI Chat - Stores individual chat messages with full context
 * Relationship: Many chats belong to one session
 */
export interface DocChat {
  id?: string;
  sessionId: string; // Foreign key to doc_sessions (one-to-many)
  userId: string; // Denormalized for quick access
  role: 'user' | 'assistant';
  message: string; // User's original message or assistant's response
  timestamp: Timestamp;
  
  // AI Response metadata (for assistant messages)
  thinkingMode?: 'low' | 'high' | 'none'; // Gemini thinking mode used (none for simple queries)
  responseTime?: number; // milliseconds
  modelVersion?: string;
  tokensUsed?: number;
  
  // Query analytics (consolidated from query logs)
  intent?: string; // Detected user intent
  filtersUsed?: Record<string, any>; // Filters extracted from query
  queryType?: 'search' | 'analysis' | 'statistics' | 'general' | 'simple_query';
  resultsCount?: number; // Number of results returned
  dataSourcesQueried?: string[]; // Collections queried (projects, audit_results, etc)
  
  // Execution status
  success?: boolean; // Query execution success
  errorMessage?: string; // Error if failed
  
  // Context used
  contextUsed?: {
    projectsCount?: number;
    auditResultsCount?: number;
    findingsCount?: number;
  };
  
  // Additional metadata (for simple queries and other extensions)
  metadata?: Record<string, any>;
}

/**
 * Create a new doc session
 */
export const createDocSession = (userId: string): Omit<DocSession, 'id'> => {
  const now = Timestamp.now();
  return {
    userId,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
    anonymizationMap: {},
    isActive: true,
    messageCount: 0,
  };
};

/**
 * Create a new chat entry
 */
export const createDocChat = (
  sessionId: string,
  userId: string,
  role: 'user' | 'assistant',
  message: string,
  options?: {
    thinkingMode?: 'low' | 'high' | 'none';
    responseTime?: number;
    modelVersion?: string;
    tokensUsed?: number;
    intent?: string;
    filtersUsed?: Record<string, any>;
    queryType?: DocChat['queryType'];
    resultsCount?: number;
    dataSourcesQueried?: string[];
    success?: boolean;
    errorMessage?: string;
    contextUsed?: DocChat['contextUsed'];
    metadata?: Record<string, any>;
  }
): Omit<DocChat, 'id'> => {
  return {
    sessionId,
    userId,
    role,
    message,
    timestamp: Timestamp.now(),
    ...options,
  };
};
