# DocAI 2-Table Architecture

## Overview

DocAI has been simplified from a 3-table structure to a **2-table structure** for better maintainability and performance.

## Database Schema

### 1. `doc_sessions` Collection
**Purpose**: Track user chat sessions (one per user session)

**Fields**:
```typescript
{
  id: string;                              // Auto-generated
  userId: string;                          // User identifier
  createdAt: Timestamp;                    // Session creation time
  updatedAt: Timestamp;                    // Last update time
  lastActivityAt: Timestamp;               // Last activity timestamp
  anonymizationMap: Record<string, string>; // Maps real values to anonymized versions
  sessionMetadata?: {                      // Optional session metadata
    deviceInfo?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  isActive: boolean;                       // Session active status
  messageCount: number;                    // Total messages in session
}
```

**Indexes**:
- `userId + isActive + lastActivityAt` (DESC)
- `userId + createdAt` (DESC)
- `isActive + lastActivityAt` (ASC)

---

### 2. `doc_chats` Collection
**Purpose**: Store all chat messages with inline analytics (many per session)

**Fields**:
```typescript
{
  id: string;                              // Auto-generated
  sessionId: string;                       // Foreign key to doc_sessions
  userId: string;                          // Denormalized for quick access
  role: 'user' | 'assistant';              // Message role
  message: string;                         // Message content
  timestamp: Timestamp;                    // Message timestamp
  
  // AI Response Metadata (for assistant messages)
  thinkingMode?: 'low' | 'high';           // Gemini thinking mode
  responseTime?: number;                   // Response time in milliseconds
  modelVersion?: string;                   // AI model version
  tokensUsed?: number;                     // Tokens consumed
  
  // Query Analytics (consolidated from old query_logs)
  intent?: string;                         // Detected user intent
  filtersUsed?: Record<string, any>;       // Filters extracted
  queryType?: 'search' | 'analysis' | 'statistics' | 'general';
  resultsCount?: number;                   // Number of results
  dataSourcesQueried?: string[];           // Collections queried
  
  // Execution Status
  success?: boolean;                       // Query success status
  errorMessage?: string;                   // Error message if failed
  
  // Context Used
  contextUsed?: {
    projectsCount?: number;
    auditResultsCount?: number;
    findingsCount?: number;
  };
}
```

**Indexes**:
- `sessionId + timestamp` (ASC)
- `sessionId + timestamp` (DESC)
- `userId + timestamp` (DESC)
- `sessionId + role + timestamp` (ASC)
- `role + success + timestamp` (DESC)
- `userId + role + timestamp` (DESC)

---

## Relationship

```
doc_sessions (1) ──────< (many) doc_chats
     │                         │
     │                         ├─ User messages
     │                         ├─ Assistant responses
     │                         └─ Query analytics (inline)
     │
     └─ Session metadata
```

**One-to-Many**: One session has many chats

---

## Key Changes from 3-Table Structure

### Old Structure (3 tables):
1. `doc_sessions` - Session tracking
2. `doc_chat_history` - Chat messages
3. `doc_query_logs` - Query analytics (separate)

### New Structure (2 tables):
1. `doc_sessions` - Session tracking (unchanged)
2. `doc_chats` - Chat messages + analytics (consolidated)

### Benefits:
- ✅ **Simpler**: Fewer collections to manage
- ✅ **Faster**: No need to join query logs with chat history
- ✅ **Cleaner**: All message data in one place
- ✅ **Efficient**: Single query for chat + analytics
- ✅ **Maintainable**: Less code, fewer services

---

## Services

### `DocSessionService`
Manages user sessions:
- Create/get sessions
- Track activity
- Manage anonymization maps
- Session lifecycle

### `DocChatService`
Manages chat messages with analytics:
- Add user messages
- Add assistant responses with metadata
- Get conversation history
- Query analytics
- Failed query tracking

### `DocAIService`
Main integration service:
- Coordinates session + chat services
- Handles Gemini API calls
- Provides unified analytics
- Session management

---

## Usage Examples

### Send a Query
```typescript
import { sendDocQuery } from './services/DocAIService';

const response = await sendDocQuery(
  'What projects are in Jakarta?',
  'user-123',
  'low' // thinking mode
);
```

### Get Session History
```typescript
import { getSessionHistory } from './services/DocAIService';

const { session, chats } = await getSessionHistory('session-id');
```

### Get Analytics
```typescript
import { getSessionAnalytics, getUserAnalytics } from './services/DocAIService';

// Session analytics
const sessionStats = await getSessionAnalytics('session-id');

// User analytics
const userStats = await getUserAnalytics('user-123');
```

---

## Migration

If you have existing data in the old 3-table structure:

```bash
# Migrate from 3 tables to 2 tables
node migrate-docai-to-2-tables.mjs

# Verify migration
node verify-docai-2-tables.mjs

# Deploy new indexes
firebase deploy --only firestore:indexes
```

---

## Creating Fresh Tables

If starting from scratch:

```bash
# Create new 2-table structure
node create-docai-2-tables.mjs

# Verify structure
node verify-docai-2-tables.mjs

# Deploy indexes
firebase deploy --only firestore:indexes
```

---

## Query Patterns

### Get Recent Chats for Context
```typescript
const recentChats = await docChatService.getRecentChats(sessionId, 10);
```

### Get Failed Queries
```typescript
const failedQueries = await docChatService.getFailedQueries(userId, 20);
```

### Get Session Analytics
```typescript
const analytics = await docChatService.getSessionAnalytics(sessionId);
// Returns: totalChats, userMessages, assistantResponses, 
//          successfulQueries, failedQueries, averageResponseTime,
//          queryTypes, dataSourcesUsed
```

---

## Best Practices

1. **Always use DocAIService** for high-level operations
2. **Store analytics inline** when adding assistant responses
3. **Track success/failure** for all queries
4. **Update session activity** after each message
5. **Clean up old sessions** periodically
6. **Use proper indexes** for efficient queries

---

## Performance Considerations

- **Denormalized userId**: Faster user-level queries
- **Inline analytics**: No joins needed
- **Proper indexes**: Optimized for common query patterns
- **Batch operations**: Use batches for bulk updates
- **Pagination**: Use limits for large result sets

---

## Security Rules

```javascript
// doc_sessions
match /doc_sessions/{sessionId} {
  allow read, write: if request.auth != null && 
                        request.auth.uid == resource.data.userId;
}

// doc_chats
match /doc_chats/{chatId} {
  allow read, write: if request.auth != null && 
                        request.auth.uid == resource.data.userId;
}
```
