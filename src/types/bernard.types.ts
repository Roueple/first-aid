import { Timestamp } from 'firebase/firestore';

/**
 * Bernard Session - Tracks user chat sessions
 * Relationship: One session has many chats
 */
export interface BernardSession {
  id?: string;
  userId: string;
  title?: string; // Auto-generated title based on first message
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActivityAt: Timestamp;
  isActive: boolean;
  messageCount: number;
  deletedAt?: Timestamp | null; // Soft delete timestamp
  sessionMetadata?: {
    deviceInfo?: string;
    userAgent?: string;
  };
}

/**
 * Bernard Chat - Stores individual chat messages
 * Relationship: Many chats belong to one session
 */
export interface BernardChat {
  id?: string;
  sessionId: string; // Foreign key to bernard_sessions
  userId: string; // Denormalized for quick access
  role: 'user' | 'assistant';
  message: string;
  timestamp: Timestamp;
  deletedAt?: Timestamp | null; // Soft delete timestamp
  
  // AI Response metadata (for assistant messages)
  responseTime?: number; // milliseconds
  modelVersion?: string;
  tokensUsed?: number;
  
  // Query result data (for preserving tables/charts in history)
  queryResult?: {
    resultsCount?: number;
    results?: any[];
    aggregatedResults?: AggregationResult[];
    table?: string;
    needsConfirmation?: boolean;
    suggestions?: Array<{ name: string; score: number }>;
    originalQuery?: string;
    isAggregated?: boolean;
    aggregationType?: string;
    groupByField?: string | string[];
    yearAggregation?: AggregationResult[];
  };
  
  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Create a new Bernard session
 */
export const createBernardSession = (userId: string): Omit<BernardSession, 'id'> => {
  const now = Timestamp.now();
  return {
    userId,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
    isActive: true,
    messageCount: 0,
  };
};

/**
 * Create a new Bernard chat entry
 */
export const createBernardChat = (
  sessionId: string,
  userId: string,
  role: 'user' | 'assistant',
  message: string,
  options?: {
    responseTime?: number;
    modelVersion?: string;
    tokensUsed?: number;
    queryResult?: BernardChat['queryResult'];
    metadata?: Record<string, any>;
  }
): Omit<BernardChat, 'id'> => {
  return {
    sessionId,
    userId,
    role,
    message,
    timestamp: Timestamp.now(),
    ...options,
  };
};

/**
 * Aggregation Result - For pivot table / group by queries
 * Supports both single and multi-dimensional aggregations
 */
export interface AggregationResult {
  groupBy: string | string[]; // Single field or array of fields for multi-dimensional
  groupValue: string | number | Record<string, string | number>; // Single value or object for multi-dimensional
  count: number;
  sum?: number;
  avg?: number;
  min?: number;
  max?: number;
  [key: string]: any;
}
