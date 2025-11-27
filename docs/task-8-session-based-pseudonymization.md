# Task 8: Session-Based Pseudonymization Implementation

## Overview

The pseudonymization system has been updated to use **session-based isolation** instead of batch-based isolation. This ensures proper privacy protection when multiple users or chat sessions access the AI services.

## Why Session-Based?

### The Problem with Batch-Based Approach

The original implementation used `batchId` which could lead to privacy issues:

**Scenario:**
- User 1 searches for "Best Jakarta" project → masked as "Location_001"
- User 2 searches for "Best Jakarta" project → **also masked as "Location_001"**
- If they share the same `batchId`, they could potentially see each other's data

### The Solution: Session-Based Isolation

With session-based pseudonymization:

**Scenario:**
- User 1 in Session A searches for "Best Jakarta" → masked as "Location_001" (Session A mapping)
- User 2 in Session B searches for "Best Jakarta" → masked as "Location_001" (Session B mapping, **different encrypted value**)
- User 1 in Session A searches again for "Best Jakarta" → still "Location_001" (consistent within session)

## How It Works with LLM APIs

### Understanding Stateless LLM APIs

LLM APIs like Claude and OpenAI are **stateless** - they don't remember previous messages. You must send the full conversation history with each request:

```typescript
// First message
{
  "messages": [
    {"role": "user", "content": "What issues does Person_A have?"}
  ]
}

// Second message - MUST include full history
{
  "messages": [
    {"role": "user", "content": "What issues does Person_A have?"},
    {"role": "assistant", "content": "Person_A has 3 high-risk findings..."},
    {"role": "user", "content": "What about Person_B?"}
  ]
}
```

### Session-Based Pseudonymization Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Chat Session: chat_session_123                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ User Query 1: "Show findings for John Doe"                 │
│                                                             │
│ 1. Pseudonymize with sessionId="chat_session_123"          │
│    John Doe → Person_A (stored in Firestore)               │
│                                                             │
│ 2. Send to LLM: "Show findings for Person_A"               │
│                                                             │
│ 3. LLM Response: "Person_A has 5 findings..."              │
│                                                             │
│ 4. Depseudonymize with sessionId="chat_session_123"        │
│    Person_A → John Doe                                      │
│                                                             │
│ 5. Show to user: "John Doe has 5 findings..."              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ User Query 2: "What about Jane Smith?"                     │
│                                                             │
│ 1. Pseudonymize with sessionId="chat_session_123"          │
│    Jane Smith → Person_B (stored in Firestore)             │
│    John Doe → Person_A (reused from session)               │
│                                                             │
│ 2. Send FULL HISTORY to LLM:                               │
│    Message 1: "Show findings for Person_A"                 │
│    Response 1: "Person_A has 5 findings..."                │
│    Message 2: "What about Person_B?"                       │
│                                                             │
│ 3. LLM Response: "Person_B has 3 findings..."              │
│                                                             │
│ 4. Depseudonymize with sessionId="chat_session_123"        │
│    Person_A → John Doe                                      │
│    Person_B → Jane Smith                                    │
│                                                             │
│ 5. Show to user: "Jane Smith has 3 findings..."            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Database Schema

**Firestore Collection: `mappings`**

```typescript
{
  id: string;
  sessionId: string;        // NEW: Chat session ID for isolation
  batchId: string;          // Deprecated: kept for backward compatibility
  mappingType: 'names' | 'ids' | 'amounts' | 'locations';
  originalValue: string;    // Encrypted with AES-256-GCM
  pseudonymValue: string;   // e.g., "Person_A", "ID_001"
  createdAt: Timestamp;
  expiresAt: Timestamp;     // Auto-delete after 30 days
  usageCount: number;
  lastAccessedAt: Timestamp;
  createdBy: string;        // User ID
}
```

### 2. Key Changes

#### Before (Batch-Based):
```typescript
// Could reuse mappings across different users/sessions
const result = await pseudonymizeFindings(findings, batchId);
```

#### After (Session-Based):
```typescript
// Isolated per chat session
const sessionId = chatSession.id; // e.g., "chat_session_123"
const result = await pseudonymizeFindings(findings, sessionId);
```

### 3. API Changes

#### Cloud Functions

**pseudonymizeFindings**
```typescript
// Request
{
  findings: Finding[],
  sessionId: string  // REQUIRED: Chat session ID
}

// Response
{
  pseudonymizedFindings: Finding[],
  sessionId: string,
  batchId: string,  // Same as sessionId (backward compatibility)
  mappingsCreated: number
}
```

**depseudonymizeResults**
```typescript
// Request
{
  data: any,
  sessionId: string  // REQUIRED: Chat session ID
}

// Response
{
  depseudonymizedData: any
}
```

#### Client Service

```typescript
// Pseudonymize
const service = new PseudonymizationService();
const sessionId = 'chat_session_123';

const result = await service.pseudonymizeFindings(findings, sessionId);
// result.sessionId === 'chat_session_123'

// Depseudonymize
const depseudonymized = await service.depseudonymizeResults(
  aiResponse,
  sessionId  // Same sessionId
);
```

## Usage Example: Complete Chat Flow

```typescript
import { PseudonymizationService } from './services/PseudonymizationService';
import { callLLMAPI } from './services/AIService';

// Initialize
const pseudoService = new PseudonymizationService();
const sessionId = `chat_${Date.now()}_${userId}`;
const conversationHistory: Message[] = [];

// User sends first message
async function handleUserMessage(userQuery: string, relevantFindings: Finding[]) {
  // 1. Pseudonymize findings for this session
  const pseudoResult = await pseudoService.pseudonymizeFindings(
    relevantFindings,
    sessionId
  );
  
  // 2. Pseudonymize user query
  const pseudoQuery = await pseudoService.pseudonymizeText(
    userQuery,
    sessionId
  );
  
  // 3. Add to conversation history
  conversationHistory.push({
    role: 'user',
    content: pseudoQuery.pseudonymizedText
  });
  
  // 4. Send FULL HISTORY to LLM (stateless API)
  const llmResponse = await callLLMAPI({
    messages: conversationHistory,  // Full history
    context: pseudoResult.pseudonymizedFindings
  });
  
  // 5. Add LLM response to history
  conversationHistory.push({
    role: 'assistant',
    content: llmResponse.content
  });
  
  // 6. Depseudonymize response for user
  const realResponse = await pseudoService.depseudonymizeText(
    llmResponse.content,
    sessionId  // Same sessionId
  );
  
  // 7. Show to user
  return realResponse;
}

// User sends second message
// The conversationHistory already contains pseudonymized messages
// LLM will see consistent pseudonyms (Person_A stays Person_A)
await handleUserMessage("What about Person_A's other issues?", moreFindings);
```

## Security Benefits

### 1. Session Isolation
- Each chat session has unique encrypted mappings
- User A's "John Doe" ≠ User B's "John Doe" (different encrypted values)
- Prevents cross-session data leakage

### 2. Consistent Within Session
- Same value always gets same pseudonym in a session
- LLM can maintain context across conversation
- User experience remains natural

### 3. Automatic Cleanup
- Mappings expire after 30 days
- Scheduled cleanup runs daily
- Reduces data retention risk

### 4. Audit Trail
- All operations logged with sessionId
- Usage tracking per mapping
- Security monitoring enabled

## Migration Guide

### For Existing Code

If you have existing code using `batchId`, it will still work (backward compatibility):

```typescript
// Old code (still works)
const result = await pseudonymizeFindings(findings, batchId);
await depseudonymizeResults(data, batchId);

// New code (recommended)
const result = await pseudonymizeFindings(findings, sessionId);
await depseudonymizeResults(data, sessionId);
```

### For New Features

When implementing AI chat (Task 9):

1. **Create session ID when chat starts:**
   ```typescript
   const sessionId = `chat_${Date.now()}_${userId}`;
   ```

2. **Use same sessionId for entire conversation:**
   ```typescript
   // All pseudonymization in this chat
   await pseudonymizeFindings(findings, sessionId);
   await pseudonymizeText(query, sessionId);
   
   // All depseudonymization in this chat
   await depseudonymizeResults(response, sessionId);
   ```

3. **Store sessionId with chat session:**
   ```typescript
   await firestore.collection('chatSessions').add({
     id: sessionId,
     userId,
     createdAt: now,
     messages: []
   });
   ```

## Testing

### Test Session Isolation

```typescript
// Test that different sessions get different pseudonyms
const findings = [{ executor: 'John Doe' }];

const session1 = await pseudonymizeFindings(findings, 'session_1');
const session2 = await pseudonymizeFindings(findings, 'session_2');

// Both map to Person_A, but encrypted values are different
console.log(session1.pseudonymizedFindings[0].executor); // "Person_A"
console.log(session2.pseudonymizedFindings[0].executor); // "Person_A"

// Depseudonymization works correctly per session
const result1 = await depseudonymizeResults(
  { executor: 'Person_A' },
  'session_1'
); // "John Doe"

const result2 = await depseudonymizeResults(
  { executor: 'Person_A' },
  'session_2'
); // "John Doe"
```

### Test Consistency Within Session

```typescript
// Test that same value gets same pseudonym in a session
const findings1 = [{ executor: 'John Doe' }];
const findings2 = [{ executor: 'John Doe', reviewer: 'Jane Smith' }];

const result1 = await pseudonymizeFindings(findings1, 'session_1');
const result2 = await pseudonymizeFindings(findings2, 'session_1');

// John Doe should be Person_A in both
console.log(result1.pseudonymizedFindings[0].executor); // "Person_A"
console.log(result2.pseudonymizedFindings[0].executor); // "Person_A"
console.log(result2.pseudonymizedFindings[0].reviewer); // "Person_B"
```

## Performance Considerations

### Firestore Queries

Session-based queries are efficient:

```typescript
// Query by sessionId (indexed)
mappingsCollection
  .where('sessionId', '==', sessionId)
  .where('mappingType', '==', 'names')
  .get();
```

**Recommended Index:**
```json
{
  "collectionGroup": "mappings",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "sessionId", "order": "ASCENDING" },
    { "fieldPath": "mappingType", "order": "ASCENDING" }
  ]
}
```

### Caching

Mappings are cached during pseudonymization:
- First call: Creates mappings
- Subsequent calls in same session: Reuses mappings
- No redundant encryption/decryption

## Monitoring

### Key Metrics

1. **Mappings per session:** Average number of mappings created
2. **Session duration:** How long sessions remain active
3. **Reuse rate:** How often existing mappings are reused
4. **Cleanup rate:** Number of expired mappings deleted daily

### Alerts

Set up alerts for:
- Decryption errors (security issue)
- Missing sessionId (implementation bug)
- High mapping creation rate (potential abuse)

## Conclusion

Session-based pseudonymization provides:
- ✅ **Privacy:** Isolated mappings per chat session
- ✅ **Consistency:** Same pseudonyms within a session
- ✅ **LLM Compatibility:** Works with stateless APIs
- ✅ **Security:** Encrypted storage with audit trail
- ✅ **Scalability:** Efficient queries and automatic cleanup

This implementation is ready for integration with the AI chat system (Task 9).
