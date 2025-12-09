# DocAI Quick Start Guide

Get started with DocAI's session tracking and conversation management in minutes.

## Overview

DocAI now includes complete session tracking with three interconnected tables:
- **doc_sessions** - User chat sessions
- **doc_chat_history** - Conversation messages
- **doc_query_logs** - Query analytics

## Setup

### 1. Deploy Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

This will create all necessary composite indexes for efficient queries.

### 2. Deploy Security Rules

```bash
firebase deploy --only firestore:rules
```

This ensures users can only access their own data.

### 3. Verify Setup

The services are automatically initialized when you import them. No manual setup needed!

## Basic Usage

### Send a Message (Automatic Tracking)

```typescript
import { sendDocQuery } from '../../services/DocAIService';

// Everything is tracked automatically!
const response = await sendDocQuery(
  'Show me high priority findings',
  userId,
  'low' // thinking mode
);
```

This single call:
1. ✅ Creates/retrieves session
2. ✅ Loads conversation history
3. ✅ Adds user message to history
4. ✅ Sends to Gemini with context
5. ✅ Stores AI response
6. ✅ Logs query execution
7. ✅ Updates session activity

### Get Session History

```typescript
import { getSessionHistory } from '../../services/DocAIService';

const { session, messages } = await getSessionHistory(sessionId);

console.log(`Session created: ${session.createdAt}`);
console.log(`Total messages: ${messages.length}`);
```

### Get Analytics

```typescript
import { getSessionAnalytics, getUserAnalytics } from '../../services/DocAIService';

// Session-level analytics
const sessionStats = await getSessionAnalytics(sessionId);
console.log(`Success rate: ${sessionStats.successfulQueries / sessionStats.totalQueries * 100}%`);

// User-level analytics
const userStats = await getUserAnalytics(userId);
console.log(`Total queries: ${userStats.totalQueries}`);
console.log(`Success rate: ${userStats.successRate}%`);
console.log(`Most used intent: ${userStats.mostUsedIntent}`);
```

## Advanced Usage

### Manual Session Management

```typescript
import docSessionService from '../../services/DocSessionService';

// Create new session
const sessionId = await docSessionService.createSession(userId, {
  deviceInfo: 'Desktop',
  userAgent: navigator.userAgent,
});

// Get active session
const activeSession = await docSessionService.getActiveSession(userId);

// Start new conversation (deactivate old, create new)
import { startNewSession } from '../../services/DocAIService';
const newSessionId = await startNewSession(userId);
```

### Direct History Access

```typescript
import docChatHistoryService from '../../services/DocChatHistoryService';

// Get recent messages for context
const recentMessages = await docChatHistoryService.getRecentMessages(sessionId, 10);

// Get formatted for Gemini API
const formattedHistory = await docChatHistoryService.getFormattedHistory(sessionId);

// Get average response time
const avgTime = await docChatHistoryService.getAverageResponseTime(sessionId);
```

### Query Logging

```typescript
import docQueryLogService from '../../services/DocQueryLogService';

// Log successful query
await docQueryLogService.logSuccess(sessionId, userId, {
  intent: 'search',
  queryType: 'search',
  filtersUsed: { priority: 'high' },
  resultsCount: 15,
  dataSourcesQueried: ['audit-results', 'projects'],
  executionTimeMs: 1250,
});

// Log failed query
await docQueryLogService.logFailure(
  sessionId,
  userId,
  'Database connection timeout',
  { intent: 'search', executionTimeMs: 5000 }
);

// Get failed queries for debugging
const failures = await docQueryLogService.getFailedQueries(userId, 20);
```

## Integration with DocPage

The DocPage component is already integrated! It automatically:

1. **Loads session history** on mount
2. **Tracks all messages** in Firestore
3. **Provides conversation context** to AI
4. **Logs query performance**

```typescript
// In DocPage.tsx
useEffect(() => {
  const initialized = initializeDocAI();
  setAiReady(initialized);
  
  if (initialized && currentUser?.uid) {
    loadSessionHistory(); // Loads existing conversation
  }
}, [currentUser]);
```

## Maintenance Tasks

### Cleanup Old Sessions

Run periodically (e.g., weekly cron job):

```typescript
import { cleanupOldSessions } from '../../services/DocAIService';

// Delete sessions inactive for 30+ days
const deletedCount = await cleanupOldSessions(30);
console.log(`Cleaned up ${deletedCount} old sessions`);
```

### Monitor Failed Queries

```typescript
import docQueryLogService from '../../services/DocQueryLogService';

const failures = await docQueryLogService.getFailedQueries(undefined, 50);
failures.forEach(log => {
  console.error(`[${log.timestamp.toDate()}] ${log.errorMessage}`);
  console.log(`  Session: ${log.sessionId}`);
  console.log(`  Intent: ${log.intent}`);
  console.log(`  Execution time: ${log.executionTimeMs}ms`);
});
```

### Export User Data

```typescript
import docChatHistoryService from '../../services/DocChatHistoryService';
import docSessionService from '../../services/DocSessionService';

// Get all user data
const sessions = await docSessionService.getUserSessions(userId, 100);
const messages = await docChatHistoryService.getUserMessages(userId, 1000);

// Export to JSON
const userData = {
  sessions,
  messages,
  exportedAt: new Date().toISOString(),
};

console.log(JSON.stringify(userData, null, 2));
```

## Common Patterns

### Pattern 1: Session with Context

```typescript
// User starts chatting
const response1 = await sendDocQuery('Show me projects', userId);

// Next message has context from previous
const response2 = await sendDocQuery('Which ones are high priority?', userId);
// AI knows "ones" refers to projects from previous message
```

### Pattern 2: Analytics Dashboard

```typescript
const userAnalytics = await getUserAnalytics(userId);

return (
  <div>
    <h2>Your DocAI Usage</h2>
    <p>Total Queries: {userAnalytics.totalQueries}</p>
    <p>Success Rate: {userAnalytics.successRate.toFixed(1)}%</p>
    <p>Avg Response Time: {userAnalytics.averageExecutionTime}ms</p>
    <p>Most Used: {userAnalytics.mostUsedIntent}</p>
  </div>
);
```

### Pattern 3: Error Recovery

```typescript
try {
  const response = await sendDocQuery(message, userId);
  // Success - automatically logged
} catch (error) {
  // Error - automatically logged
  console.error('Query failed:', error);
  
  // Get recent failures for debugging
  const failures = await docQueryLogService.getFailedQueries(userId, 5);
  console.log('Recent failures:', failures);
}
```

## Testing

### Test Session Creation

```typescript
import docSessionService from '../../services/DocSessionService';

const sessionId = await docSessionService.createSession('test-user-123');
console.log('Created session:', sessionId);

const session = await docSessionService.getById(sessionId);
console.log('Session data:', session);
```

### Test Message Storage

```typescript
import docChatHistoryService from '../../services/DocChatHistoryService';

const messageId = await docChatHistoryService.addUserMessage(
  sessionId,
  'test-user-123',
  'Test message'
);

const responseId = await docChatHistoryService.addAssistantResponse(
  sessionId,
  'test-user-123',
  'Test message',
  'Test response',
  'low',
  { responseTime: 1000 }
);

const history = await docChatHistoryService.getSessionHistory(sessionId);
console.log('History:', history);
```

### Test Query Logging

```typescript
import docQueryLogService from '../../services/DocQueryLogService';

await docQueryLogService.logSuccess(sessionId, 'test-user-123', {
  intent: 'test',
  queryType: 'general',
  resultsCount: 10,
  executionTimeMs: 500,
});

const stats = await docQueryLogService.getSessionStats(sessionId);
console.log('Stats:', stats);
```

## Troubleshooting

### Issue: "Permission denied"

**Solution**: Deploy security rules
```bash
firebase deploy --only firestore:rules
```

### Issue: "Index not found"

**Solution**: Deploy indexes
```bash
firebase deploy --only firestore:indexes
```

Wait 5-10 minutes for indexes to build.

### Issue: "Session not loading"

**Solution**: Check user authentication
```typescript
const { currentUser } = useAuth();
if (!currentUser?.uid) {
  console.error('User not authenticated');
}
```

### Issue: "Messages not persisting"

**Solution**: Check Firestore connection
```typescript
import { connectionMonitor } from '../utils/connectionMonitor';

const status = connectionMonitor.getStatus();
console.log('Connection status:', status);
```

## Next Steps

1. ✅ Deploy indexes and rules
2. ✅ Test with DocPage
3. ✅ Monitor analytics
4. ✅ Set up cleanup job
5. ✅ Build analytics dashboard

## Resources

- [Full Schema Documentation](./docai-database-schema.md)
- [Architecture Diagrams](./docai-architecture-diagram.md)
- [Firestore Indexes](../firestore.indexes.json)
- [Security Rules](../firestore.rules)

## Support

For issues or questions:
1. Check diagnostics: `getDiagnostics(['src/services/DocAIService.ts'])`
2. Review logs in browser console
3. Check Firestore console for data
4. Verify indexes are built in Firebase Console
