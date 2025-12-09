# DocAI - 2-Table Architecture

## Quick Start

DocAI is an intelligent document assistant with a simplified **2-table database structure** for optimal performance.

---

## Architecture

### Database Structure

```
┌─────────────────┐
│  doc_sessions   │  ← User sessions (one per user session)
│                 │
│  - userId       │
│  - isActive     │
│  - messageCount │
│  - createdAt    │
└────────┬────────┘
         │
         │ one-to-many
         │
         ▼
┌─────────────────┐
│   doc_chats     │  ← Chat messages with analytics (many per session)
│                 │
│  - sessionId    │  (FK to doc_sessions)
│  - role         │  (user | assistant)
│  - message      │
│  - timestamp    │
│                 │
│  Analytics:     │
│  - queryType    │
│  - resultsCount │
│  - success      │
│  - responseTime │
└─────────────────┘
```

---

## Installation

### Fresh Installation

```bash
# 1. Create tables
node create-docai-2-tables.mjs

# 2. Verify
node verify-docai-2-tables.mjs

# 3. Deploy indexes
firebase deploy --only firestore:indexes
```

### Or use the deployment script:

```bash
# Windows
deploy-docai-2-tables.bat

# Manual
node create-docai-2-tables.mjs && node verify-docai-2-tables.mjs && firebase deploy --only firestore:indexes
```

---

## Usage

### Send a Query

```typescript
import { sendDocQuery } from './services/DocAIService';

const response = await sendDocQuery(
  'What projects are in Jakarta?',
  'user-123',
  'low' // thinking mode: 'low' | 'high'
);
```

### Get Session History

```typescript
import { getSessionHistory } from './services/DocAIService';

const { session, chats } = await getSessionHistory('session-id');

console.log(`Session has ${chats.length} messages`);
chats.forEach(chat => {
  console.log(`${chat.role}: ${chat.message}`);
});
```

### Get Analytics

```typescript
import { getSessionAnalytics, getUserAnalytics } from './services/DocAIService';

// Session analytics
const sessionStats = await getSessionAnalytics('session-id');
console.log('Total chats:', sessionStats.totalChats);
console.log('Success rate:', sessionStats.successfulQueries / sessionStats.totalChats);
console.log('Avg response time:', sessionStats.averageResponseTime);

// User analytics
const userStats = await getUserAnalytics('user-123');
console.log('Total sessions:', userStats.totalSessions);
console.log('Total queries:', userStats.totalQueries);
console.log('Success rate:', userStats.successRate);
```

### Create New Session

```typescript
import { createNewSession, startNewSession } from './services/DocAIService';

// Create new session (keeps old ones active)
const sessionId = await createNewSession('user-123');

// Start new session (deactivates old ones)
const newSessionId = await startNewSession('user-123');
```

### Delete Session

```typescript
import { deleteSession } from './services/DocAIService';

// Deletes session and all its chats
await deleteSession('session-id');
```

---

## Services

### `DocAIService`
Main integration service - use this for most operations

**Methods**:
- `initializeDocAI()` - Initialize service
- `sendDocQuery()` - Send message with full tracking
- `getSessionHistory()` - Get session + chats
- `getSessionAnalytics()` - Get session stats
- `getUserAnalytics()` - Get user stats
- `createNewSession()` - Create new session
- `startNewSession()` - Start fresh session
- `deleteSession()` - Delete session + chats
- `cleanupOldSessions()` - Remove old sessions

### `DocSessionService`
Session management

**Methods**:
- `createSession()` - Create new session
- `getActiveSession()` - Get user's active session
- `getOrCreateSession()` - Get or create session
- `updateActivity()` - Update last activity
- `incrementMessageCount()` - Increment message count
- `updateAnonymizationMap()` - Update anonymization
- `deactivateSession()` - Mark session inactive
- `getUserSessions()` - Get user's sessions
- `deleteOldSessions()` - Cleanup old sessions

### `DocChatService`
Chat message management with inline analytics

**Methods**:
- `addUserMessage()` - Add user message
- `addAssistantResponse()` - Add assistant response with analytics
- `getSessionChats()` - Get all chats for session
- `getRecentChats()` - Get recent chats for context
- `getFormattedHistory()` - Get history for Gemini API
- `getUserChats()` - Get user's chats across sessions
- `countSessionChats()` - Count chats in session
- `deleteSessionChats()` - Delete all session chats
- `getFailedQueries()` - Get failed queries for debugging
- `getSessionAnalytics()` - Get session analytics
- `getUserAnalytics()` - Get user analytics
- `updateMetadata()` - Update chat metadata

---

## Data Models

### DocSession

```typescript
interface DocSession {
  id?: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActivityAt: Timestamp;
  anonymizationMap: Record<string, string>;
  sessionMetadata?: {
    deviceInfo?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  isActive: boolean;
  messageCount: number;
}
```

### DocChat

```typescript
interface DocChat {
  id?: string;
  sessionId: string;                    // FK to doc_sessions
  userId: string;
  role: 'user' | 'assistant';
  message: string;
  timestamp: Timestamp;
  
  // AI Response metadata
  thinkingMode?: 'low' | 'high';
  responseTime?: number;
  modelVersion?: string;
  tokensUsed?: number;
  
  // Query analytics (inline)
  intent?: string;
  filtersUsed?: Record<string, any>;
  queryType?: 'search' | 'analysis' | 'statistics' | 'general';
  resultsCount?: number;
  dataSourcesQueried?: string[];
  
  // Execution status
  success?: boolean;
  errorMessage?: string;
  
  // Context used
  contextUsed?: {
    projectsCount?: number;
    auditResultsCount?: number;
    findingsCount?: number;
  };
}
```

---

## Firestore Indexes

Required indexes (auto-deployed with `firebase deploy --only firestore:indexes`):

**doc_sessions**:
- `userId + isActive + lastActivityAt` (DESC)
- `userId + createdAt` (DESC)
- `isActive + lastActivityAt` (ASC)

**doc_chats**:
- `sessionId + timestamp` (ASC)
- `sessionId + timestamp` (DESC)
- `userId + timestamp` (DESC)
- `sessionId + role + timestamp` (ASC)
- `role + success + timestamp` (DESC)
- `userId + role + timestamp` (DESC)

---

## Migration from 3-Table Structure

If you have existing data in the old structure:

```bash
# 1. Backup data first!

# 2. Run migration
node migrate-docai-to-2-tables.mjs

# 3. Verify
node verify-docai-2-tables.mjs

# 4. Deploy indexes
firebase deploy --only firestore:indexes

# 5. Test thoroughly

# 6. Delete old collections after verification
```

See [DOCAI-2-TABLE-MIGRATION.md](./DOCAI-2-TABLE-MIGRATION.md) for detailed migration guide.

---

## Benefits

✅ **Simpler**: 2 tables instead of 3  
✅ **Faster**: No joins needed  
✅ **Cleaner**: All message data in one place  
✅ **Efficient**: Single query for chat + analytics  
✅ **Maintainable**: Less code, fewer services  
✅ **Scalable**: Better performance  

---

## UI Integration

The Doc Assistant UI automatically uses the 2-table structure:

```typescript
// DocPage.tsx automatically:
// 1. Loads session history on mount
// 2. Creates/reuses sessions
// 3. Stores messages with analytics
// 4. Displays conversation history
```

---

## Troubleshooting

### Messages not appearing?
- Check Firestore console for `doc_chats` collection
- Verify indexes are deployed
- Check browser console for errors

### Session not loading?
- Verify `doc_sessions` collection exists
- Check user authentication
- Verify session is active

### Analytics not working?
- Ensure assistant responses include analytics fields
- Check `success` field is set
- Verify `queryType` is provided

---

## Scripts

- `create-docai-2-tables.mjs` - Create fresh 2-table structure
- `verify-docai-2-tables.mjs` - Verify structure and data
- `migrate-docai-to-2-tables.mjs` - Migrate from 3-table structure
- `deploy-docai-2-tables.bat` - Complete deployment script

---

## Documentation

- [Architecture](./docai-2-table-architecture.md) - Detailed architecture
- [Migration Guide](./DOCAI-2-TABLE-MIGRATION.md) - Migration from 3 tables
- [API Reference](./docai-api-reference.md) - Complete API docs

---

## Support

For issues or questions:
1. Check verification script output
2. Review Firestore console
3. Check browser console
4. Verify indexes are deployed
5. Test with fresh session
