# DocAI Database Schema

Complete database schema for DocAI chat functionality with session tracking, conversation history, and query analytics.

## Overview

The DocAI system uses three interconnected Firestore collections to provide a complete chat experience with full tracking and analytics:

1. **doc_sessions** - User chat sessions with anonymization
2. **doc_chat_history** - Conversation messages and responses
3. **doc_query_logs** - Query analytics and debugging

## Table Relationships

```
doc_sessions (1) ──────< (many) doc_chat_history
     │
     └──────< (many) doc_query_logs
                │
                └──────< (optional) doc_chat_history
```

## 1. doc_sessions

Tracks user chat sessions with anonymization mapping and session metadata.

### Schema

```typescript
interface DocSession {
  id: string;                              // Auto-generated document ID
  userId: string;                          // User ID (from Auth)
  createdAt: Timestamp;                    // Session creation time
  updatedAt: Timestamp;                    // Last update time
  lastActivityAt: Timestamp;               // Last user activity
  anonymizationMap: Record<string, string>; // Maps real → anonymized values
  sessionMetadata?: {
    deviceInfo?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  isActive: boolean;                       // Session active status
  messageCount: number;                    // Total messages in session
}
```

### Indexes

```json
// Query active sessions by user
{ "userId": "ASC", "isActive": "ASC", "lastActivityAt": "DESC" }

// Query user sessions by creation date
{ "userId": "ASC", "createdAt": "DESC" }

// Cleanup old inactive sessions
{ "isActive": "ASC", "lastActivityAt": "ASC" }
```

### Key Features

- **Session Management**: Automatically creates/retrieves active sessions
- **Anonymization**: Stores mapping of real values to anonymized versions
- **Activity Tracking**: Updates `lastActivityAt` on every interaction
- **Message Counting**: Tracks total messages for analytics

### Service Methods

```typescript
// Create new session
await docSessionService.createSession(userId, metadata?);

// Get or create active session
await docSessionService.getOrCreateSession(userId, metadata?);

// Get active session
await docSessionService.getActiveSession(userId);

// Update activity timestamp
await docSessionService.updateActivity(sessionId);

// Increment message count
await docSessionService.incrementMessageCount(sessionId);

// Update anonymization map
await docSessionService.updateAnonymizationMap(sessionId, newMappings);

// Deactivate session
await docSessionService.deactivateSession(sessionId);

// Get user sessions
await docSessionService.getUserSessions(userId, limit?);

// Cleanup old sessions
await docSessionService.deleteOldSessions(daysOld);
```

## 2. doc_chat_history

Stores all conversation messages between users and the AI assistant.

### Schema

```typescript
interface DocChatHistory {
  id: string;                    // Auto-generated document ID
  sessionId: string;             // Foreign key → doc_sessions
  userId: string;                // Denormalized for quick access
  role: 'user' | 'assistant';    // Message sender
  message: string;               // User's original message
  response?: string;             // AI's response (assistant only)
  timestamp: Timestamp;          // Message timestamp
  thinkingMode?: 'low' | 'high'; // Gemini thinking mode used
  metadata?: {
    tokensUsed?: number;
    responseTime?: number;       // milliseconds
    modelVersion?: string;
  };
}
```

### Indexes

```json
// Get session history (chronological)
{ "sessionId": "ASC", "timestamp": "ASC" }

// Get recent messages (reverse chronological)
{ "sessionId": "ASC", "timestamp": "DESC" }

// Get user messages across sessions
{ "userId": "ASC", "timestamp": "DESC" }

// Filter by role
{ "sessionId": "ASC", "role": "ASC", "timestamp": "ASC" }
```

### Key Features

- **Full Conversation History**: Stores both user messages and AI responses
- **Performance Metrics**: Tracks response time and token usage
- **Context Retrieval**: Provides formatted history for Gemini API
- **Thinking Mode Tracking**: Records which mode was used for each response

### Service Methods

```typescript
// Add user message
await docChatHistoryService.addUserMessage(sessionId, userId, message);

// Add assistant response
await docChatHistoryService.addAssistantResponse(
  sessionId, userId, message, response, thinkingMode?, metadata?
);

// Get session history
await docChatHistoryService.getSessionHistory(sessionId, limit?);

// Get recent messages for context
await docChatHistoryService.getRecentMessages(sessionId, count);

// Get formatted history for Gemini
await docChatHistoryService.getFormattedHistory(sessionId, limit?);

// Get user messages across all sessions
await docChatHistoryService.getUserMessages(userId, limit?);

// Count session messages
await docChatHistoryService.countSessionMessages(sessionId);

// Update message metadata
await docChatHistoryService.updateMetadata(messageId, metadata);

// Get average response time
await docChatHistoryService.getAverageResponseTime(sessionId);

// Delete session history
await docChatHistoryService.deleteSessionHistory(sessionId);
```

## 3. doc_query_logs

Analytics and debugging logs for query execution.

### Schema

```typescript
interface DocQueryLog {
  id: string;                           // Auto-generated document ID
  sessionId: string;                    // Foreign key → doc_sessions
  userId: string;                       // Denormalized for quick access
  chatHistoryId?: string;               // Optional link → doc_chat_history
  timestamp: Timestamp;                 // Query execution time
  
  // Query analysis
  intent?: string;                      // Detected user intent
  filtersUsed?: Record<string, any>;    // Extracted filters
  queryType?: 'search' | 'analysis' | 'statistics' | 'general';
  
  // Results
  resultsCount?: number;                // Number of results returned
  dataSourcesQueried?: string[];        // Collections queried
  
  // Performance
  executionTimeMs?: number;             // Query execution time
  success: boolean;                     // Query success status
  errorMessage?: string;                // Error details if failed
  
  // Context
  contextUsed?: {
    projectsCount?: number;
    auditResultsCount?: number;
    findingsCount?: number;
  };
}
```

### Indexes

```json
// Get session logs
{ "sessionId": "ASC", "timestamp": "DESC" }

// Get user logs
{ "userId": "ASC", "timestamp": "DESC" }

// Get failed queries
{ "success": "ASC", "timestamp": "DESC" }

// Get user failed queries
{ "userId": "ASC", "success": "ASC", "timestamp": "DESC" }
```

### Key Features

- **Query Analytics**: Track intent, filters, and query types
- **Performance Monitoring**: Measure execution time and success rate
- **Error Tracking**: Log failures for debugging
- **Data Source Tracking**: Know which collections were queried
- **Context Awareness**: Record what data was available

### Service Methods

```typescript
// Log query execution
await docQueryLogService.logQuery(sessionId, userId, queryData);

// Log successful query
await docQueryLogService.logSuccess(sessionId, userId, {
  intent, filtersUsed, queryType, resultsCount, dataSourcesQueried,
  executionTimeMs, contextUsed, chatHistoryId
});

// Log failed query
await docQueryLogService.logFailure(sessionId, userId, errorMessage, data?);

// Get session logs
await docQueryLogService.getSessionLogs(sessionId, limit?);

// Get user logs
await docQueryLogService.getUserLogs(userId, limit?);

// Get failed queries
await docQueryLogService.getFailedQueries(userId?, limit?);

// Get session statistics
await docQueryLogService.getSessionStats(sessionId);

// Get user analytics
await docQueryLogService.getUserAnalytics(userId);

// Delete session logs
await docQueryLogService.deleteSessionLogs(sessionId);
```

## Integrated DocAI Service

The `DocAIService` coordinates all three services for seamless operation.

### Usage Example

```typescript
import { sendDocQuery, getSessionAnalytics } from '../../services/DocAIService';

// Send a query (automatically handles session, history, and logging)
const response = await sendDocQuery(
  'Show me high priority audit findings',
  userId,
  'low', // thinking mode
  sessionId? // optional, will create if not provided
);

// Get session analytics
const analytics = await getSessionAnalytics(sessionId);
console.log(analytics);
// {
//   totalQueries: 15,
//   successfulQueries: 14,
//   failedQueries: 1,
//   averageExecutionTime: 1250,
//   averageResponseTime: 1180,
//   queryTypes: { search: 8, analysis: 5, general: 2 },
//   dataSourcesUsed: { 'audit-results': 10, projects: 8 }
// }

// Get user analytics
const userAnalytics = await getUserAnalytics(userId);
console.log(userAnalytics);
// {
//   totalSessions: 5,
//   activeSessions: 1,
//   totalQueries: 47,
//   successRate: 95.7,
//   averageExecutionTime: 1180,
//   mostUsedIntent: 'search',
//   mostQueriedDataSource: 'audit-results'
// }
```

## Data Flow

### 1. User Sends Message

```
User Input → DocPage
  ↓
sendDocQuery(message, userId)
  ↓
1. Get/Create Session (doc_sessions)
2. Get Conversation History (doc_chat_history)
3. Add User Message (doc_chat_history)
4. Send to Gemini API
5. Add Assistant Response (doc_chat_history)
6. Log Query (doc_query_logs)
7. Update Session Activity (doc_sessions)
  ↓
Response → DocPage → User
```

### 2. Session Lifecycle

```
New User Chat
  ↓
Create Session (isActive: true)
  ↓
Multiple Messages
  ↓
Update lastActivityAt on each message
  ↓
User Ends Chat / Starts New Session
  ↓
Deactivate Session (isActive: false)
  ↓
After 30 days
  ↓
Cleanup Old Sessions (delete)
```

## Security Rules

Add these to `firestore.rules`:

```javascript
// DocAI Sessions
match /doc_sessions/{sessionId} {
  allow read, write: if request.auth != null && 
    request.auth.uid == resource.data.userId;
}

// DocAI Chat History
match /doc_chat_history/{messageId} {
  allow read, write: if request.auth != null && 
    request.auth.uid == resource.data.userId;
}

// DocAI Query Logs
match /doc_query_logs/{logId} {
  allow read, write: if request.auth != null && 
    request.auth.uid == resource.data.userId;
}
```

## Maintenance

### Cleanup Old Sessions

Run periodically (e.g., weekly):

```typescript
import { cleanupOldSessions } from './services/DocAIService';

// Delete sessions inactive for 30+ days
const deletedCount = await cleanupOldSessions(30);
console.log(`Cleaned up ${deletedCount} old sessions`);
```

### Monitor Failed Queries

```typescript
import docQueryLogService from './services/DocQueryLogService';

// Get recent failures
const failures = await docQueryLogService.getFailedQueries(undefined, 50);
failures.forEach(log => {
  console.error(`Failed query: ${log.errorMessage}`);
  console.log(`Session: ${log.sessionId}, Intent: ${log.intent}`);
});
```

## Benefits

1. **Complete Tracking**: Every message, query, and session is recorded
2. **Analytics Ready**: Built-in analytics for performance and usage
3. **Debugging**: Failed queries are logged with full context
4. **Privacy**: Anonymization map supports data masking
5. **Scalable**: Indexed for efficient queries at scale
6. **Context Aware**: Conversation history enables better AI responses
7. **Performance Monitoring**: Track response times and execution metrics

## Next Steps

1. Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
2. Update security rules: `firebase deploy --only firestore:rules`
3. Test with DocPage component
4. Monitor analytics dashboard
5. Set up automated cleanup job
