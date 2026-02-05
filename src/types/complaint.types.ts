import { Timestamp } from 'firebase/firestore';

/**
 * Complaint Status
 */
export type ComplaintStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';

/**
 * Complaint Priority
 */
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Complaint Category
 */
export type ComplaintCategory = 
  | 'incorrect_response'
  | 'slow_response'
  | 'inappropriate_content'
  | 'technical_error'
  | 'feature_request'
  | 'other';

/**
 * Complaint - User reports about chat sessions
 * Linked to felix_sessions and contains full chat history
 */
export interface Complaint {
  id?: string;
  sessionId: string; // Foreign key to felix_sessions
  userId: string;
  userEmail: string;
  
  // Complaint details
  category: ComplaintCategory;
  priority: ComplaintPriority;
  subject: string;
  description: string;
  
  // Chat context (snapshot at time of complaint)
  chatHistory: Array<{
    role: 'user' | 'assistant';
    message: string;
    timestamp: string;
  }>;
  
  // Status tracking
  status: ComplaintStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp;
  
  // Admin response
  adminNotes?: string;
  resolvedBy?: string;
  
  // Metadata
  metadata?: {
    deviceInfo?: string;
    userAgent?: string;
    appVersion?: string;
  };
}

/**
 * Create a new complaint
 */
export const createComplaint = (
  sessionId: string,
  userId: string,
  userEmail: string,
  category: ComplaintCategory,
  subject: string,
  description: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; message: string; timestamp: string }>,
  metadata?: Complaint['metadata']
): Omit<Complaint, 'id'> => {
  const now = Timestamp.now();
  
  // Auto-assign priority based on category
  let priority: ComplaintPriority = 'medium';
  if (category === 'technical_error' || category === 'inappropriate_content') {
    priority = 'high';
  } else if (category === 'feature_request') {
    priority = 'low';
  }
  
  return {
    sessionId,
    userId,
    userEmail,
    category,
    priority,
    subject,
    description,
    chatHistory,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    metadata,
  };
};
