# DocAI 2-Table Migration Guide

## Overview

DocAI has been simplified from **3 tables** to **2 tables** for better performance and maintainability.

---

## What Changed?

### Before (3 Tables):
```
doc_sessions          → Session tracking
doc_chat_history      → Chat messages
doc_query_logs        → Query analytics (separate)
```

### After (2 Tables):
```
doc_sessions          → Session tracking (unchanged)
doc_chats             → Chat messages + analytics (consolidated)
```

---

## Migration Steps

### Option 1: Fresh Installation (Recommended for New Projects)

```bash
# 1. Create new 2-table structure
node create-docai-2-tables.mjs

# 2. Verify structure
node verify-docai-2-tables.mjs

# 3. Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

### Option 2: Migrate Existing Data

```bash
# 1. Backup your data first!
# Export from Firebase Console or use backup script

# 2. Run migration script
node migrate-docai-to-2-tables.mjs

# 3. Verify migration
node verify-docai-2-tables.mjs

# 4. Deploy new indexes
firebase deploy --only firestore:indexes

# 5. Test your application thoroughly

# 6. After verification, delete old collections:
#    - doc_chat_history
#    - doc_query_logs
```

---

## Code Changes

### Types (`src/types/docAI.types.ts`)

**Removed**:
- `DocChatHistory` interface
- `DocQueryLog` interface
- `createDocChatHistory()` function
- `createDocQueryLog()` function

**Added**:
- `DocChat` interface (consolidates chat + analytics)
- `createDocChat()` function

### Services

**Removed**:
- `DocChatHistoryService.ts`
- `DocQueryLogService.ts`

**Added**:
- `DocChatService.ts` (replaces both old services)

**Updated**:
- `DocAIService.ts` (uses new DocChatService)
- `DocSessionService.ts` (minor documentation updates)

### Import Changes

**Before**:
```typescript
import docChatHistoryService from './DocChatHistoryService';
import docQueryLogService from './DocQueryLogService';
```

**After**:
```typescript
import docChatService from './DocChatService';
```

---

## API Changes

### Adding Messages

**Before**:
```typescript
// Add user message
await docChatHistoryService.addUserMessage(sessionId, userId, message);

// Add assistant response
await docChatHistoryService.addAssistantResponse(
  sessionId, userId, message, response, thinkingMode, metadata
);

// Log query separately
await docQueryLogService.logSuccess(sessionId, userId, {
  queryType: 'general',
  executionTimeMs: 1500,
});
```

**After**:
```typescript
// Add user message
await docChatService.addUserMessage(sessionId, userId, message);

// Add assistant response with inline analytics
await docChatService.addAssistantResponse(sessionId, userId, response, {
  thinkingMode: 'low',
  responseTime: 1500,
  modelVersion: 'gemini-2.0-flash-thinking-exp',
  queryType: 'general',
  resultsCount: 5,
  dataSourcesQueried: ['projects'],
  success: true,
});
```

### Getting History

**Before**:
```typescript
const messages = await docChatHistoryService.getSessionHistory(sessionId);
// Returns: DocChatHistory[]
```

**After**:
```typescript
const chats = await docChatService.getSessionChats(sessionId);
// Returns: DocChat[]
```

### Analytics

**Before**:
```typescript
const stats = await docQueryLogService.getSessionStats(sessionId);
const avgTime = await docChatHistoryService.getAverageResponseTime(sessionId);
```

**After**:
```typescript
const analytics = await docChatService.getSessionAnalytics(sessionId);
// Returns everything in one call
```

---

## Database Schema Changes

### `doc_chats` Collection (New)

Combines fields from old `doc_chat_history` and `doc_query_logs`:

```typescript
{
  // From doc_chat_history
  sessionId: string;
  userId: string;
  role: 'user' | 'assistant';
  message: string;
  timestamp: Timestamp;
  thinkingMode?: 'low' | 'high';
  responseTime?: number;
  modelVersion?: string;
  tokensUsed?: number;
  
  // From doc_query_logs (now inline)
  intent?: string;
  filtersUsed?: Record<string, any>;
  queryType?: 'search' | 'analysis' | 'statistics' | 'general';
  resultsCount?: number;
  dataSourcesQueried?: string[];
  success?: boolean;
  errorMessage?: string;
  contextUsed?: {
    projectsCount?: number;
    auditResultsCount?: number;
    findingsCount?: number;
  };
}
```

---

## Firestore Indexes

### Removed Indexes:
- All `doc_chat_history` indexes
- All `doc_query_logs` indexes

### Added Indexes:
```json
{
  "collectionGroup": "doc_chats",
  "fields": [
    { "fieldPath": "sessionId", "order": "ASCENDING" },
    { "fieldPath": "timestamp", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "doc_chats",
  "fields": [
    { "fieldPath": "sessionId", "order": "ASCENDING" },
    { "fieldPath": "timestamp", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "doc_chats",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "timestamp", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "doc_chats",
  "fields": [
    { "fieldPath": "sessionId", "order": "ASCENDING" },
    { "fieldPath": "role", "order": "ASCENDING" },
    { "fieldPath": "timestamp", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "doc_chats",
  "fields": [
    { "fieldPath": "role", "order": "ASCENDING" },
    { "fieldPath": "success", "order": "ASCENDING" },
    { "fieldPath": "timestamp", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "doc_chats",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "role", "order": "ASCENDING" },
    { "fieldPath": "timestamp", "order": "DESCENDING" }
  ]
}
```

---

## Testing Checklist

After migration, test these features:

- [ ] Send a message to Doc Assistant
- [ ] Verify message appears in `doc_chats` collection
- [ ] Check session is created/updated in `doc_sessions`
- [ ] Load existing session history
- [ ] View session analytics
- [ ] View user analytics
- [ ] Test failed query logging
- [ ] Create new session
- [ ] Delete session (should delete all chats)
- [ ] Cleanup old sessions

---

## Rollback Plan

If you need to rollback:

1. **Keep old collections** until fully tested
2. **Backup data** before migration
3. **Revert code changes** from git
4. **Redeploy old indexes**

---

## Benefits of 2-Table Structure

✅ **Simpler**: Fewer collections to manage  
✅ **Faster**: No joins between chat and query logs  
✅ **Cleaner**: All message data in one place  
✅ **Efficient**: Single query for chat + analytics  
✅ **Maintainable**: Less code, fewer services  
✅ **Scalable**: Better performance for large datasets  

---

## Support

If you encounter issues:

1. Check `verify-docai-2-tables.mjs` output
2. Review Firestore console for data structure
3. Check browser console for errors
4. Verify indexes are deployed
5. Test with fresh session

---

## Next Steps

After successful migration:

1. ✅ Update any custom queries using old collections
2. ✅ Update documentation references
3. ✅ Train team on new structure
4. ✅ Monitor performance improvements
5. ✅ Delete old collections after verification period
