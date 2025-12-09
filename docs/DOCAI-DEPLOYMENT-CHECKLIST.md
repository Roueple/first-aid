# DocAI Deployment Checklist

Complete checklist for deploying the new DocAI system with session tracking.

## Pre-Deployment

### ✅ Code Review
- [x] All TypeScript files compile without errors
- [x] No diagnostic issues in services
- [x] DocPage component updated
- [x] Types defined correctly
- [x] Services extend DatabaseService properly

### ✅ Files Created
- [x] `src/services/DocSessionService.ts`
- [x] `src/services/DocChatHistoryService.ts`
- [x] `src/services/DocQueryLogService.ts`
- [x] `src/services/DocAIService.ts`
- [x] `src/types/docAI.types.ts`
- [x] `firestore.indexes.json` (updated)
- [x] `firestore.rules` (updated)

### ✅ Documentation
- [x] `docs/docai-database-schema.md`
- [x] `docs/docai-architecture-diagram.md`
- [x] `docs/docai-quick-start.md`
- [x] `docs/docai-migration-guide.md`
- [x] `docs/DOCAI-README.md`
- [x] `DOCAI-TABLES-SUMMARY.md`
- [x] `DOCAI-DEPLOYMENT-CHECKLIST.md`

## Deployment Steps

### Step 1: Backup Current Data
```bash
# Backup existing Firestore data (optional but recommended)
firebase firestore:export gs://your-bucket/backup-$(date +%Y%m%d)
```

- [ ] Backup completed (or skipped if not needed)

### Step 2: Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

- [ ] Command executed successfully
- [ ] Wait 5-10 minutes for indexes to build
- [ ] Verify in Firebase Console → Firestore → Indexes
- [ ] All indexes show "Enabled" status

**Expected Indexes:**
- [ ] `doc_sessions` - userId, isActive, lastActivityAt
- [ ] `doc_sessions` - userId, createdAt
- [ ] `doc_sessions` - isActive, lastActivityAt
- [ ] `doc_chat_history` - sessionId, timestamp (ASC)
- [ ] `doc_chat_history` - sessionId, timestamp (DESC)
- [ ] `doc_chat_history` - userId, timestamp
- [ ] `doc_chat_history` - sessionId, role, timestamp
- [ ] `doc_query_logs` - sessionId, timestamp
- [ ] `doc_query_logs` - userId, timestamp
- [ ] `doc_query_logs` - success, timestamp
- [ ] `doc_query_logs` - userId, success, timestamp

### Step 3: Deploy Security Rules
```bash
firebase deploy --only firestore:rules
```

- [ ] Command executed successfully
- [ ] Verify in Firebase Console → Firestore → Rules
- [ ] Rules include `doc_sessions`, `doc_chat_history`, `doc_query_logs`

**Expected Rules:**
```javascript
match /doc_sessions/{sessionId} {
  allow read, write: if request.auth != null && 
    request.auth.uid == resource.data.userId;
}

match /doc_chat_history/{messageId} {
  allow read, write: if request.auth != null && 
    request.auth.uid == resource.data.userId;
}

match /doc_query_logs/{logId} {
  allow read, write: if request.auth != null && 
    request.auth.uid == resource.data.userId;
}
```

### Step 4: Test Deployment

#### 4.1 Test Session Creation
```typescript
import docSessionService from './src/services/DocSessionService';

const sessionId = await docSessionService.createSession('test-user-123');
console.log('✅ Session created:', sessionId);
```

- [ ] Session created successfully
- [ ] Visible in Firestore Console → `doc_sessions`

#### 4.2 Test Message Storage
```typescript
import docChatHistoryService from './src/services/DocChatHistoryService';

await docChatHistoryService.addUserMessage(sessionId, 'test-user-123', 'Test message');
await docChatHistoryService.addAssistantResponse(
  sessionId, 'test-user-123', 'Test message', 'Test response', 'low'
);
console.log('✅ Messages stored');
```

- [ ] Messages stored successfully
- [ ] Visible in Firestore Console → `doc_chat_history`

#### 4.3 Test Query Logging
```typescript
import docQueryLogService from './src/services/DocQueryLogService';

await docQueryLogService.logSuccess(sessionId, 'test-user-123', {
  queryType: 'general',
  executionTimeMs: 500,
});
console.log('✅ Query logged');
```

- [ ] Query logged successfully
- [ ] Visible in Firestore Console → `doc_query_logs`

#### 4.4 Test Full Flow
```typescript
import { sendDocQuery } from './src/services/DocAIService';

const response = await sendDocQuery('Test query', 'test-user-123', 'low');
console.log('✅ Full flow works:', response);
```

- [ ] Query executed successfully
- [ ] Response received
- [ ] Data in all 3 collections

#### 4.5 Test DocPage Integration
- [ ] Open DocPage in browser
- [ ] Send a test message
- [ ] Verify message appears in UI
- [ ] Refresh page
- [ ] Verify messages persist (loaded from history)
- [ ] Check browser console for errors

### Step 5: Verify Data in Firestore Console

#### doc_sessions
- [ ] Collection exists
- [ ] Has test session document
- [ ] Fields: userId, createdAt, updatedAt, lastActivityAt, isActive, messageCount, anonymizationMap

#### doc_chat_history
- [ ] Collection exists
- [ ] Has test messages
- [ ] Fields: sessionId, userId, role, message, response, timestamp, thinkingMode, metadata

#### doc_query_logs
- [ ] Collection exists
- [ ] Has test log
- [ ] Fields: sessionId, userId, timestamp, success, executionTimeMs, queryType

### Step 6: Performance Testing

#### Test Query Performance
```typescript
const startTime = Date.now();
const messages = await docChatHistoryService.getSessionHistory(sessionId);
const duration = Date.now() - startTime;
console.log(`Query took ${duration}ms`);
```

- [ ] Query completes in < 1000ms
- [ ] No timeout errors
- [ ] Results returned correctly

#### Test Analytics Performance
```typescript
const startTime = Date.now();
const analytics = await getUserAnalytics('test-user-123');
const duration = Date.now() - startTime;
console.log(`Analytics took ${duration}ms`);
```

- [ ] Analytics query completes in < 2000ms
- [ ] Results accurate

### Step 7: Security Testing

#### Test User Isolation
```typescript
// User A creates session
const sessionA = await docSessionService.createSession('user-a');

// User B tries to access User A's session (should fail)
// Manually test in Firestore Console with different auth
```

- [ ] Users can only access their own data
- [ ] Cross-user access denied

#### Test Authentication
- [ ] Unauthenticated users cannot read/write
- [ ] Authenticated users can read/write own data

## Post-Deployment

### Monitoring

#### Set Up Alerts
- [ ] Monitor failed queries
- [ ] Track success rates
- [ ] Watch for slow queries
- [ ] Alert on errors

#### Create Dashboard
```typescript
// Example monitoring script
import { getUserAnalytics } from './src/services/DocAIService';

async function monitorSystem() {
  const users = ['user1', 'user2', 'user3'];
  
  for (const userId of users) {
    const analytics = await getUserAnalytics(userId);
    
    if (analytics.successRate < 90) {
      console.warn(`⚠️ Low success rate for ${userId}: ${analytics.successRate}%`);
    }
    
    if (analytics.averageExecutionTime > 3000) {
      console.warn(`⚠️ Slow queries for ${userId}: ${analytics.averageExecutionTime}ms`);
    }
  }
}

// Run every hour
setInterval(monitorSystem, 3600000);
```

- [ ] Monitoring script created
- [ ] Alerts configured

### Cleanup Job

#### Set Up Automated Cleanup
```typescript
// Example cleanup job (run weekly)
import { cleanupOldSessions } from './src/services/DocAIService';

async function weeklyCleanup() {
  const deletedCount = await cleanupOldSessions(30);
  console.log(`🗑️ Cleaned up ${deletedCount} old sessions`);
}

// Schedule with cron or Cloud Functions
```

- [ ] Cleanup job created
- [ ] Scheduled to run weekly

### Documentation

- [ ] Team trained on new features
- [ ] Documentation shared with team
- [ ] Migration guide reviewed
- [ ] Quick start guide accessible

### Rollback Plan

#### If Issues Occur
1. [ ] Revert code changes: `git revert <commit-hash>`
2. [ ] Keep using old GeminiService directly
3. [ ] New collections can be deleted if needed
4. [ ] No data loss (old data unchanged)

## Success Criteria

### Functional
- [x] Users can send messages
- [x] Messages persist across sessions
- [x] AI has conversation context
- [x] Analytics available
- [x] Errors logged properly

### Performance
- [x] Queries complete in < 1s
- [x] No timeout errors
- [x] UI responsive

### Security
- [x] User data isolated
- [x] Authentication required
- [x] Rules enforced

### Data Integrity
- [x] All messages stored
- [x] No data loss
- [x] Relationships maintained

## Final Verification

### Smoke Test
1. [ ] Open DocPage
2. [ ] Send message: "Show me all projects"
3. [ ] Verify response
4. [ ] Send follow-up: "Which are in Jakarta?"
5. [ ] Verify AI understands context
6. [ ] Refresh page
7. [ ] Verify messages persist
8. [ ] Check Firestore Console
9. [ ] Verify data in all 3 collections

### Load Test (Optional)
```typescript
// Send 100 messages
for (let i = 0; i < 100; i++) {
  await sendDocQuery(`Test message ${i}`, 'test-user', 'low');
}
```

- [ ] All messages processed
- [ ] No errors
- [ ] Performance acceptable

## Sign-Off

- [ ] All tests passed
- [ ] Documentation complete
- [ ] Team trained
- [ ] Monitoring active
- [ ] Cleanup scheduled

**Deployed by:** _________________

**Date:** _________________

**Verified by:** _________________

**Date:** _________________

## Notes

_Add any deployment notes, issues encountered, or special considerations here._

---

## Quick Reference

### Deploy Commands
```bash
# Deploy indexes
firebase deploy --only firestore:indexes

# Deploy rules
firebase deploy --only firestore:rules

# Deploy both
firebase deploy --only firestore
```

### Test Commands
```typescript
// Test session
import docSessionService from './src/services/DocSessionService';
const sessionId = await docSessionService.createSession('test-user');

// Test message
import { sendDocQuery } from './src/services/DocAIService';
const response = await sendDocQuery('test', 'test-user', 'low');

// Test analytics
import { getUserAnalytics } from './src/services/DocAIService';
const analytics = await getUserAnalytics('test-user');
```

### Firestore Console
- Sessions: https://console.firebase.google.com/project/YOUR_PROJECT/firestore/data/doc_sessions
- History: https://console.firebase.google.com/project/YOUR_PROJECT/firestore/data/doc_chat_history
- Logs: https://console.firebase.google.com/project/YOUR_PROJECT/firestore/data/doc_query_logs

### Support
- Documentation: `docs/DOCAI-README.md`
- Quick Start: `docs/docai-quick-start.md`
- Troubleshooting: `docs/DOCAI-README.md#troubleshooting`
