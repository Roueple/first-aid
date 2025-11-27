# Pseudonymization Quick Reference

## TL;DR

**Use `sessionId` for all pseudonymization operations. Each chat session should have a unique sessionId.**

```typescript
// ✅ CORRECT: Session-based
const sessionId = chatSession.id;
await pseudonymizeFindings(findings, sessionId);
await depseudonymizeResults(response, sessionId);

// ❌ WRONG: Don't reuse sessionId across different users/chats
const sessionId = 'global_session';  // BAD!
```

## Quick Start

### 1. Create Session

```typescript
// When user starts a new chat
const sessionId = `chat_${Date.now()}_${userId}`;

// Store with chat session
await firestore.collection('chatSessions').add({
  id: sessionId,
  userId,
  createdAt: now
});
```

### 2. Pseudonymize

```typescript
import { pseudonymizationService } from './services/PseudonymizationService';

// Pseudonymize findings
const result = await pseudonymizationService.pseudonymizeFindings(
  findings,
  sessionId  // Use chat session ID
);

// Pseudonymize text
const pseudoText = await pseudonymizationService.pseudonymizeText(
  userQuery,
  sessionId
);
```

### 3. Send to LLM

```typescript
// Build conversation history (LLM APIs are stateless)
const messages = [
  { role: 'user', content: pseudoText.pseudonymizedText },
  // ... previous messages
];

// Send to LLM
const llmResponse = await callLLM({
  messages,
  context: result.pseudonymizedFindings
});
```

### 4. Depseudonymize

```typescript
// Depseudonymize LLM response
const realResponse = await pseudonymizationService.depseudonymizeResults(
  llmResponse,
  sessionId  // Same sessionId
);

// Show to user
displayToUser(realResponse);
```

## Common Patterns

### Pattern 1: Chat Message Handler

```typescript
class ChatHandler {
  private sessionId: string;
  private conversationHistory: Message[] = [];
  
  constructor(chatSessionId: string) {
    this.sessionId = chatSessionId;
  }
  
  async handleMessage(query: string, findings: Finding[]) {
    // Pseudonymize
    const pseudoFindings = await pseudonymizationService.pseudonymizeFindings(
      findings,
      this.sessionId
    );
    const pseudoQuery = await pseudonymizationService.pseudonymizeText(
      query,
      this.sessionId
    );
    
    // Add to history
    this.conversationHistory.push({
      role: 'user',
      content: pseudoQuery.pseudonymizedText
    });
    
    // Call LLM with full history
    const llmResponse = await this.callLLM();
    
    // Add response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: llmResponse.content
    });
    
    // Depseudonymize
    const realResponse = await pseudonymizationService.depseudonymizeText(
      llmResponse.content,
      this.sessionId
    );
    
    return realResponse;
  }
  
  private async callLLM() {
    return await callLLMAPI({
      messages: this.conversationHistory  // Full history
    });
  }
}
```

### Pattern 2: One-off Query (No Conversation)

```typescript
async function askOneTimeQuestion(query: string, findings: Finding[]) {
  // Create temporary session
  const sessionId = `temp_${Date.now()}_${userId}`;
  
  // Pseudonymize
  const pseudoFindings = await pseudonymizationService.pseudonymizeFindings(
    findings,
    sessionId
  );
  const pseudoQuery = await pseudonymizationService.pseudonymizeText(
    query,
    sessionId
  );
  
  // Call LLM
  const llmResponse = await callLLM({
    messages: [{ role: 'user', content: pseudoQuery.pseudonymizedText }],
    context: pseudoFindings.pseudonymizedFindings
  });
  
  // Depseudonymize
  const realResponse = await pseudonymizationService.depseudonymizeText(
    llmResponse.content,
    sessionId
  );
  
  return realResponse;
}
```

## Important Rules

### ✅ DO

- **Create unique sessionId per chat session**
- **Use same sessionId throughout entire conversation**
- **Store sessionId with chat session in database**
- **Send full conversation history to LLM (stateless API)**
- **Depseudonymize with same sessionId used for pseudonymization**

### ❌ DON'T

- **Don't reuse sessionId across different users**
- **Don't reuse sessionId across different chat sessions**
- **Don't use global/shared sessionId**
- **Don't forget to include full history when calling LLM**
- **Don't mix sessionIds in same conversation**

## Troubleshooting

### Error: "No mappings found for session ID"

**Cause:** Using wrong sessionId for depseudonymization

**Solution:**
```typescript
// Make sure you use the SAME sessionId
const result = await pseudonymizeFindings(findings, sessionId);
// ... later ...
await depseudonymizeResults(response, sessionId);  // Same sessionId!
```

### Error: "sessionId is required"

**Cause:** Not providing sessionId parameter

**Solution:**
```typescript
// ❌ Wrong
await pseudonymizeFindings(findings);

// ✅ Correct
await pseudonymizeFindings(findings, sessionId);
```

### Pseudonyms Not Consistent

**Cause:** Using different sessionIds in same conversation

**Solution:**
```typescript
// ❌ Wrong
await pseudonymizeFindings(findings, 'session_1');
await pseudonymizeFindings(moreFindings, 'session_2');  // Different!

// ✅ Correct
const sessionId = chatSession.id;
await pseudonymizeFindings(findings, sessionId);
await pseudonymizeFindings(moreFindings, sessionId);  // Same!
```

## API Reference

### pseudonymizeFindings

```typescript
async pseudonymizeFindings(
  findings: Finding[],
  sessionId: string
): Promise<{
  pseudonymizedFindings: Finding[];
  sessionId: string;
  batchId: string;  // Same as sessionId
  mappingsCreated: number;
}>
```

### depseudonymizeResults

```typescript
async depseudonymizeResults(
  data: any,
  sessionId: string
): Promise<any>
```

### pseudonymizeText

```typescript
async pseudonymizeText(
  text: string,
  sessionId: string
): Promise<{
  pseudonymizedText: string;
  sessionId: string;
}>
```

### depseudonymizeText

```typescript
async depseudonymizeText(
  text: string,
  sessionId: string
): Promise<string>
```

## Examples

### Example 1: Multi-turn Conversation

```typescript
// User starts chat
const sessionId = `chat_${Date.now()}_${userId}`;

// Turn 1
const query1 = "Show findings for John Doe";
const response1 = await handleMessage(query1, findings, sessionId);
// John Doe → Person_A

// Turn 2
const query2 = "What about Jane Smith?";
const response2 = await handleMessage(query2, moreFindings, sessionId);
// Jane Smith → Person_B
// John Doe → Person_A (reused from session)

// Turn 3
const query3 = "Compare Person_A and Person_B";
const response3 = await handleMessage(query3, [], sessionId);
// LLM understands Person_A and Person_B from context
// Response depseudonymized: "John Doe" and "Jane Smith"
```

### Example 2: Different Users, Same Data

```typescript
// User 1's session
const session1 = `chat_${Date.now()}_user1`;
const result1 = await pseudonymizeFindings(
  [{ executor: 'John Doe' }],
  session1
);
// John Doe → Person_A (encrypted: abc123...)

// User 2's session
const session2 = `chat_${Date.now()}_user2`;
const result2 = await pseudonymizeFindings(
  [{ executor: 'John Doe' }],
  session2
);
// John Doe → Person_A (encrypted: xyz789...)

// Different encrypted values = privacy protected!
```

## Performance Tips

1. **Reuse mappings:** Same sessionId reuses existing mappings (no re-encryption)
2. **Batch operations:** Pseudonymize multiple findings at once
3. **Cache session:** Store sessionId in memory during conversation
4. **Cleanup:** Mappings auto-expire after 30 days

## Security Notes

- All original values encrypted with AES-256-GCM
- Mappings isolated per session
- Audit logs track all operations
- Automatic cleanup after 30 days
- Server-side only access to mappings

## Need Help?

See full documentation:
- `docs/task-8-session-based-pseudonymization.md` - Complete guide
- `docs/task-8-update-session-based.md` - Update details
- `src/services/PseudonymizationService.README.md` - Service documentation
