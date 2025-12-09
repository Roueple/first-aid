# DocAI Migration Guide

Guide for migrating from the old DocAI implementation to the new session-tracked version.

## What Changed?

### Old Implementation
- Direct Gemini API calls
- No session tracking
- No conversation history
- Messages lost on refresh
- No analytics

### New Implementation
- Full session management
- Complete conversation history
- Query logging and analytics
- Messages persist across sessions
- AI has conversation context

## Breaking Changes

### ⚠️ API Changes

#### Old Way (Deprecated)
```typescript
// Old - direct import from GeminiService
import { sendMessageToGemini } from '../../services/GeminiService';

const response = await sendMessageToGemini(message);
```

#### New Way (Recommended)
```typescript
// New - use DocAIService for full tracking
import { sendDocQuery } from '../../services/DocAIService';

const response = await sendDocQuery(message, userId, 'low');
```

### ⚠️ Function Signature Changes

#### sendDocQuery (New)
```typescript
// Old signature (no longer recommended)
sendMessageToGemini(message: string): Promise<string>

// New signature (recommended)
sendDocQuery(
  message: string,
  userId: string,
  thinkingMode?: 'low' | 'high',
  sessionId?: string
): Promise<string>
```

## Migration Steps

### Step 1: Update Imports

**Before:**
```typescript
import { sendMessageToGemini } from '../../services/GeminiService';
```

**After:**
```typescript
import { sendDocQuery } from '../../services/DocAIService';
```

### Step 2: Update Function Calls

**Before:**
```typescript
const response = await sendMessageToGemini(userMessage);
```

**After:**
```typescript
const response = await sendDocQuery(
  userMessage,
  currentUser.uid,
  'low' // or 'high' for complex queries
);
```

### Step 3: Deploy Infrastructure

```bash
# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Deploy security rules
firebase deploy --only firestore:rules
```

Wait 5-10 minutes for indexes to build.

### Step 4: Test

1. Open DocPage
2. Send a test message
3. Verify in Firestore Console:
   - `doc_sessions` has a new session
   - `doc_chat_history` has messages
   - `doc_query_logs` has query logs

## Backward Compatibility

### GeminiService Still Works

The old `GeminiService` still works for direct API calls:

```typescript
import { sendMessageToGemini } from '../../services/GeminiService';

// Still works, but no tracking
const response = await sendMessageToGemini(message);
```

**Use cases for direct calls:**
- One-off queries
- Background processing
- Non-user-facing operations

**Use DocAIService for:**
- User chat interactions
- Conversations requiring context
- Queries needing analytics

## Data Migration

### No Migration Needed!

The new system:
- ✅ Creates new tables (no conflicts)
- ✅ Doesn't modify existing data
- ✅ Works alongside old implementation
- ✅ Starts fresh with new sessions

### Optional: Import Old Chat Sessions

If you have old chat data in `chatSessions` collection:

```typescript
import { Timestamp } from 'firebase/firestore';
import docSessionService from '../../services/DocSessionService';
import docChatHistoryService from '../../services/DocChatHistoryService';

async function migrateOldSession(oldSession: any) {
  // Create new doc_session
  const newSessionId = await docSessionService.createSession(
    oldSession.userId,
    {
      deviceInfo: 'Migrated from old system',
    }
  );

  // Migrate messages
  for (const msg of oldSession.messages || []) {
    if (msg.role === 'user') {
      await docChatHistoryService.addUserMessage(
        newSessionId,
        oldSession.userId,
        msg.content
      );
    } else {
      await docChatHistoryService.addAssistantResponse(
        newSessionId,
        oldSession.userId,
        '', // Original message not available
        msg.content,
        'low'
      );
    }
  }

  console.log(`Migrated session: ${oldSession.id} → ${newSessionId}`);
}
```

## Component Updates

### DocPage Component

**Already Updated!** The DocPage component now:
- ✅ Loads session history on mount
- ✅ Uses DocAIService for all queries
- ✅ Tracks all messages automatically

No changes needed if you're using the updated DocPage.

### Custom Components

If you have custom components using GeminiService:

**Before:**
```typescript
const handleSend = async () => {
  const response = await sendMessageToGemini(input);
  setMessages([...messages, { role: 'assistant', content: response }]);
};
```

**After:**
```typescript
const handleSend = async () => {
  const response = await sendDocQuery(input, currentUser.uid, 'low');
  // Messages automatically stored in Firestore
  // Load from history instead of local state
};
```

## Feature Additions

### Add Session History Loading

```typescript
import { getSessionHistory } from '../../services/DocAIService';

useEffect(() => {
  async function loadHistory() {
    const docSessionService = (await import('../../services/DocSessionService')).default;
    const activeSession = await docSessionService.getActiveSession(userId);
    
    if (activeSession) {
      const { messages } = await getSessionHistory(activeSession.id);
      setMessages(messages.map(msg => ({
        role: msg.role,
        content: msg.role === 'user' ? msg.message : msg.response,
        timestamp: msg.timestamp.toDate(),
      })));
    }
  }
  
  loadHistory();
}, [userId]);
```

### Add Analytics Dashboard

```typescript
import { getUserAnalytics } from '../../services/DocAIService';

function AnalyticsDashboard({ userId }) {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    getUserAnalytics(userId).then(setAnalytics);
  }, [userId]);

  if (!analytics) return <div>Loading...</div>;

  return (
    <div>
      <h2>Your DocAI Usage</h2>
      <p>Total Queries: {analytics.totalQueries}</p>
      <p>Success Rate: {analytics.successRate.toFixed(1)}%</p>
      <p>Avg Response Time: {analytics.averageExecutionTime}ms</p>
    </div>
  );
}
```

## Testing Checklist

- [ ] Deploy Firestore indexes
- [ ] Deploy security rules
- [ ] Update imports in components
- [ ] Update function calls with userId
- [ ] Test sending messages
- [ ] Verify data in Firestore Console
- [ ] Test session history loading
- [ ] Test analytics queries
- [ ] Test error handling
- [ ] Test cleanup functions

## Rollback Plan

If you need to rollback:

### 1. Revert Code Changes
```bash
git revert <commit-hash>
```

### 2. Keep Using Old Implementation
```typescript
// Use GeminiService directly
import { sendMessageToGemini } from '../../services/GeminiService';
```

### 3. Data Remains Safe
- Old `chatSessions` collection unchanged
- New `doc_*` collections can be deleted if needed
- No data loss

## Performance Considerations

### New System is Faster!

- ✅ Indexed queries (faster retrieval)
- ✅ Cached session data
- ✅ Parallel operations
- ✅ Optimized for scale

### Firestore Costs

New collections add minimal cost:
- **Reads**: Only on page load (cached after)
- **Writes**: 2-3 per message (session, history, log)
- **Storage**: ~1KB per message

**Example**: 1000 messages/month = ~$0.10

## Troubleshooting

### Issue: "Index not found"

**Solution**: Wait for indexes to build (5-10 minutes)
```bash
firebase deploy --only firestore:indexes
```

### Issue: "Permission denied"

**Solution**: Deploy security rules
```bash
firebase deploy --only firestore:rules
```

### Issue: "Session not loading"

**Solution**: Check user authentication
```typescript
if (!currentUser?.uid) {
  console.error('User not authenticated');
}
```

### Issue: "Old messages not showing"

**Solution**: Old messages are in `chatSessions`, new ones in `doc_chat_history`. Run migration script if needed.

## FAQ

### Q: Do I need to migrate old data?
**A:** No, the new system starts fresh. Old data remains in `chatSessions`.

### Q: Can I use both old and new systems?
**A:** Yes, they're independent. Use DocAIService for new features, GeminiService for simple queries.

### Q: Will this break existing functionality?
**A:** No, GeminiService still works. DocPage is updated but backward compatible.

### Q: How do I access old chat history?
**A:** Old history is in `chatSessions` collection. Use migration script to import if needed.

### Q: What about costs?
**A:** Minimal increase (~$0.10 per 1000 messages). Benefits outweigh costs.

## Support

For issues:
1. Check [Quick Start Guide](./docai-quick-start.md)
2. Review [Schema Documentation](./docai-database-schema.md)
3. Check browser console for errors
4. Verify Firestore Console for data
5. Ensure indexes are built

## Next Steps

1. ✅ Complete migration steps
2. ✅ Test thoroughly
3. ✅ Monitor analytics
4. ✅ Set up cleanup job
5. ✅ Train team on new features

## Summary

The migration is straightforward:
1. Update imports and function calls
2. Deploy indexes and rules
3. Test with DocPage
4. Enjoy full session tracking!

Old system still works, new system adds powerful features. No data loss, minimal changes required.
