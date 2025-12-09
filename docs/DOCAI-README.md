# DocAI - Complete Documentation

Complete documentation for the DocAI system with session tracking, conversation history, and analytics.

## 📚 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [Usage Examples](#usage-examples)
7. [Deployment](#deployment)
8. [Maintenance](#maintenance)
9. [Troubleshooting](#troubleshooting)

## Overview

DocAI is an intelligent assistant for audit findings and project management, now with complete session tracking and conversation management.

### Key Features

- ✅ **Session Management** - Automatic session creation and tracking
- ✅ **Conversation History** - Complete message persistence
- ✅ **Context-Aware AI** - AI remembers previous messages
- ✅ **Query Analytics** - Performance monitoring and insights
- ✅ **Privacy & Security** - User-scoped access, anonymization support
- ✅ **Error Handling** - Retry logic and detailed error logging
- ✅ **Performance** - Indexed queries, caching, optimization

### What's New

| Feature | Before | After |
|---------|--------|-------|
| Session Tracking | ❌ None | ✅ Full tracking |
| Message History | ❌ Lost on refresh | ✅ Persists forever |
| AI Context | ❌ No memory | ✅ Remembers conversation |
| Analytics | ❌ None | ✅ Comprehensive |
| Query Logging | ❌ None | ✅ Every query logged |

## Quick Start

### 1. Deploy Infrastructure

```bash
# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Deploy security rules
firebase deploy --only firestore:rules
```

### 2. Send Your First Message

```typescript
import { sendDocQuery } from '../../services/DocAIService';

const response = await sendDocQuery(
  'Show me high priority findings',
  userId,
  'low' // thinking mode
);
```

That's it! Everything is tracked automatically.

### 3. View Analytics

```typescript
import { getUserAnalytics } from '../../services/DocAIService';

const analytics = await getUserAnalytics(userId);
console.log(analytics);
```

## Architecture

### System Components

```
┌─────────────────────────────────────────┐
│           DocPage (UI)                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      DocAIService (Orchestrator)        │
└──┬──────────┬──────────┬────────────────┘
   │          │          │
   ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│Session │ │ Chat   │ │ Query  │
│Service │ │History │ │  Log   │
└───┬────┘ └───┬────┘ └───┬────┘
    │          │          │
    └──────────┴──────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Firestore Database              │
│  • doc_sessions                         │
│  • doc_chat_history                     │
│  • doc_query_logs                       │
└─────────────────────────────────────────┘
```

### Data Flow

```
User Input
    ↓
1. Get/Create Session
    ↓
2. Load Conversation History
    ↓
3. Add User Message
    ↓
4. Send to Gemini (with context)
    ↓
5. Store AI Response
    ↓
6. Log Query Execution
    ↓
7. Update Session Activity
    ↓
Response to User
```

## Database Schema

### doc_sessions

Tracks user chat sessions.

```typescript
interface DocSession {
  id: string;
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

### doc_chat_history

Stores conversation messages.

```typescript
interface DocChatHistory {
  id: string;
  sessionId: string; // FK → doc_sessions
  userId: string;
  role: 'user' | 'assistant';
  message: string;
  response?: string;
  timestamp: Timestamp;
  thinkingMode?: 'low' | 'high';
  metadata?: {
    tokensUsed?: number;
    responseTime?: number;
    modelVersion?: string;
  };
}
```

### doc_query_logs

Logs query execution and analytics.

```typescript
interface DocQueryLog {
  id: string;
  sessionId: string; // FK → doc_sessions
  userId: string;
  chatHistoryId?: string; // FK → doc_chat_history
  timestamp: Timestamp;
  intent?: string;
  filtersUsed?: Record<string, any>;
  queryType?: 'search' | 'analysis' | 'statistics' | 'general';
  resultsCount?: number;
  dataSourcesQueried?: string[];
  executionTimeMs?: number;
  success: boolean;
  errorMessage?: string;
  contextUsed?: {
    projectsCount?: number;
    auditResultsCount?: number;
    findingsCount?: number;
  };
}
```

### Relationships

```
doc_sessions (1) ──────< (many) doc_chat_history
     │
     └──────< (many) doc_query_logs
```

## API Reference

### DocAIService

Main orchestrator service.

#### sendDocQuery()

Send a query with full tracking.

```typescript
sendDocQuery(
  message: string,
  userId: string,
  thinkingMode?: 'low' | 'high',
  sessionId?: string
): Promise<string>
```

**Example:**
```typescript
const response = await sendDocQuery(
  'Show me projects in Jakarta',
  'user-123',
  'low'
);
```

#### getSessionHistory()

Get session and its messages.

```typescript
getSessionHistory(sessionId: string): Promise<{
  session: DocSession & { id: string };
  messages: (DocChatHistory & { id: string })[];
}>
```

#### getSessionAnalytics()

Get session statistics.

```typescript
getSessionAnalytics(sessionId: string): Promise<{
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageExecutionTime: number | null;
  averageResponseTime: number | null;
  queryTypes: Record<string, number>;
  dataSourcesUsed: Record<string, number>;
}>
```

#### getUserAnalytics()

Get user-level analytics.

```typescript
getUserAnalytics(userId: string): Promise<{
  totalSessions: number;
  activeSessions: number;
  totalQueries: number;
  successRate: number;
  averageExecutionTime: number | null;
  mostUsedIntent: string | null;
  mostQueriedDataSource: string | null;
}>
```

#### startNewSession()

Start a new conversation.

```typescript
startNewSession(userId: string): Promise<string>
```

#### deleteSession()

Delete session and all related data.

```typescript
deleteSession(sessionId: string): Promise<void>
```

#### cleanupOldSessions()

Delete inactive sessions older than specified days.

```typescript
cleanupOldSessions(daysOld?: number): Promise<number>
```

### DocSessionService

Session management service.

```typescript
// Create session
await docSessionService.createSession(userId, metadata?);

// Get active session
await docSessionService.getActiveSession(userId);

// Get or create session
await docSessionService.getOrCreateSession(userId, metadata?);

// Update activity
await docSessionService.updateActivity(sessionId);

// Increment message count
await docSessionService.incrementMessageCount(sessionId);

// Update anonymization map
await docSessionService.updateAnonymizationMap(sessionId, mappings);

// Deactivate session
await docSessionService.deactivateSession(sessionId);

// Get user sessions
await docSessionService.getUserSessions(userId, limit?);
```

### DocChatHistoryService

Conversation history service.

```typescript
// Add user message
await docChatHistoryService.addUserMessage(sessionId, userId, message);

// Add assistant response
await docChatHistoryService.addAssistantResponse(
  sessionId, userId, message, response, thinkingMode?, metadata?
);

// Get session history
await docChatHistoryService.getSessionHistory(sessionId, limit?);

// Get recent messages
await docChatHistoryService.getRecentMessages(sessionId, count);

// Get formatted for Gemini
await docChatHistoryService.getFormattedHistory(sessionId, limit?);

// Count messages
await docChatHistoryService.countSessionMessages(sessionId);

// Get average response time
await docChatHistoryService.getAverageResponseTime(sessionId);

// Delete history
await docChatHistoryService.deleteSessionHistory(sessionId);
```

### DocQueryLogService

Query logging and analytics service.

```typescript
// Log successful query
await docQueryLogService.logSuccess(sessionId, userId, {
  intent, filtersUsed, queryType, resultsCount,
  dataSourcesQueried, executionTimeMs, contextUsed
});

// Log failed query
await docQueryLogService.logFailure(sessionId, userId, errorMessage, data?);

// Get session logs
await docQueryLogService.getSessionLogs(sessionId, limit?);

// Get user logs
await docQueryLogService.getUserLogs(userId, limit?);

// Get failed queries
await docQueryLogService.getFailedQueries(userId?, limit?);

// Get session stats
await docQueryLogService.getSessionStats(sessionId);

// Get user analytics
await docQueryLogService.getUserAnalytics(userId);
```

## Usage Examples

### Basic Chat

```typescript
import { sendDocQuery } from '../../services/DocAIService';

// First message
const response1 = await sendDocQuery(
  'Show me all projects',
  userId,
  'low'
);

// Follow-up (AI has context)
const response2 = await sendDocQuery(
  'Which ones are in Jakarta?',
  userId,
  'low'
);
// AI knows "ones" refers to projects
```

### Load Session History

```typescript
import { getSessionHistory } from '../../services/DocAIService';
import docSessionService from '../../services/DocSessionService';

// Get active session
const activeSession = await docSessionService.getActiveSession(userId);

if (activeSession) {
  // Load history
  const { session, messages } = await getSessionHistory(activeSession.id);
  
  console.log(`Session created: ${session.createdAt.toDate()}`);
  console.log(`Total messages: ${messages.length}`);
  
  messages.forEach(msg => {
    console.log(`[${msg.role}]: ${msg.role === 'user' ? msg.message : msg.response}`);
  });
}
```

### Analytics Dashboard

```typescript
import { getUserAnalytics } from '../../services/DocAIService';

function AnalyticsDashboard({ userId }) {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    getUserAnalytics(userId).then(setAnalytics);
  }, [userId]);

  if (!analytics) return <div>Loading...</div>;

  return (
    <div className="analytics-dashboard">
      <h2>Your DocAI Usage</h2>
      
      <div className="stat">
        <label>Total Sessions</label>
        <value>{analytics.totalSessions}</value>
      </div>
      
      <div className="stat">
        <label>Total Queries</label>
        <value>{analytics.totalQueries}</value>
      </div>
      
      <div className="stat">
        <label>Success Rate</label>
        <value>{analytics.successRate.toFixed(1)}%</value>
      </div>
      
      <div className="stat">
        <label>Avg Response Time</label>
        <value>{analytics.averageExecutionTime}ms</value>
      </div>
      
      <div className="stat">
        <label>Most Used Intent</label>
        <value>{analytics.mostUsedIntent}</value>
      </div>
    </div>
  );
}
```

### Error Handling

```typescript
import { sendDocQuery } from '../../services/DocAIService';
import docQueryLogService from '../../services/DocQueryLogService';

try {
  const response = await sendDocQuery(message, userId, 'low');
  // Success - automatically logged
  console.log(response);
} catch (error) {
  // Error - automatically logged
  console.error('Query failed:', error);
  
  // Get recent failures for debugging
  const failures = await docQueryLogService.getFailedQueries(userId, 5);
  console.log('Recent failures:', failures);
}
```

### Start New Conversation

```typescript
import { startNewSession } from '../../services/DocAIService';

// User clicks "New Chat"
const newSessionId = await startNewSession(userId);
console.log(`Started new session: ${newSessionId}`);

// Old session is deactivated, new one is active
```

## Deployment

### Prerequisites

- Firebase project configured
- Firestore enabled
- Firebase CLI installed

### Step 1: Deploy Indexes

```bash
firebase deploy --only firestore:indexes
```

Wait 5-10 minutes for indexes to build.

### Step 2: Deploy Security Rules

```bash
firebase deploy --only firestore:rules
```

### Step 3: Verify

Check Firebase Console:
- Indexes tab: All indexes should be "Enabled"
- Rules tab: New rules should be deployed

### Step 4: Test

```typescript
// Send test message
const response = await sendDocQuery('test', userId, 'low');

// Check Firestore Console
// - doc_sessions should have 1 document
// - doc_chat_history should have 2 documents
// - doc_query_logs should have 1 document
```

## Maintenance

### Automated Cleanup

Run weekly to delete old sessions:

```typescript
import { cleanupOldSessions } from '../../services/DocAIService';

// Delete sessions inactive for 30+ days
const deletedCount = await cleanupOldSessions(30);
console.log(`Cleaned up ${deletedCount} old sessions`);
```

### Monitor Failed Queries

```typescript
import docQueryLogService from '../../services/DocQueryLogService';

// Get recent failures
const failures = await docQueryLogService.getFailedQueries(undefined, 50);

failures.forEach(log => {
  console.error(`[${log.timestamp.toDate()}] ${log.errorMessage}`);
  console.log(`  Session: ${log.sessionId}`);
  console.log(`  Intent: ${log.intent}`);
  console.log(`  Execution: ${log.executionTimeMs}ms`);
});
```

### Performance Monitoring

```typescript
import { getUserAnalytics } from '../../services/DocAIService';

// Monitor all users
const userIds = ['user1', 'user2', 'user3'];

for (const userId of userIds) {
  const analytics = await getUserAnalytics(userId);
  
  if (analytics.successRate < 90) {
    console.warn(`User ${userId} has low success rate: ${analytics.successRate}%`);
  }
  
  if (analytics.averageExecutionTime > 3000) {
    console.warn(`User ${userId} has slow queries: ${analytics.averageExecutionTime}ms`);
  }
}
```

## Troubleshooting

### Issue: "Permission denied"

**Cause**: Security rules not deployed

**Solution**:
```bash
firebase deploy --only firestore:rules
```

### Issue: "Index not found"

**Cause**: Indexes not built yet

**Solution**:
1. Deploy indexes: `firebase deploy --only firestore:indexes`
2. Wait 5-10 minutes
3. Check Firebase Console → Firestore → Indexes

### Issue: "Session not loading"

**Cause**: User not authenticated

**Solution**:
```typescript
const { currentUser } = useAuth();
if (!currentUser?.uid) {
  console.error('User not authenticated');
  return;
}
```

### Issue: "Messages not persisting"

**Cause**: Firestore connection issue

**Solution**:
```typescript
import { connectionMonitor } from '../utils/connectionMonitor';

const status = connectionMonitor.getStatus();
console.log('Connection status:', status);

if (status === 'disconnected') {
  console.error('No database connection');
}
```

### Issue: "Slow queries"

**Cause**: Missing indexes or large dataset

**Solution**:
1. Check indexes are deployed
2. Add pagination to queries
3. Use `limit` parameter

```typescript
// Limit results
const messages = await docChatHistoryService.getRecentMessages(sessionId, 10);
```

## Additional Resources

- [Database Schema](./docai-database-schema.md) - Complete schema documentation
- [Architecture Diagrams](./docai-architecture-diagram.md) - Visual architecture
- [Quick Start Guide](./docai-quick-start.md) - Get started quickly
- [Migration Guide](./docai-migration-guide.md) - Migrate from old system

## Support

For issues or questions:
1. Check this documentation
2. Review browser console for errors
3. Check Firestore Console for data
4. Verify indexes are built
5. Check security rules are deployed

## License

Part of the FIRST-AID project.
