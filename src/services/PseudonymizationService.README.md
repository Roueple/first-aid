# Pseudonymization Service

Client-side service for interacting with pseudonymization Cloud Functions to protect sensitive data before sending to AI services.

## Overview

The PseudonymizationService provides **session-based pseudonymization** to:
1. **Pseudonymize** findings data before sending to AI services
2. **Depseudonymize** AI results to restore original values
3. **Isolate** different chat sessions for privacy protection
4. **Maintain consistency** within a session for LLM context

This ensures compliance with privacy requirements by replacing sensitive data (names, IDs, amounts) with anonymous tokens while maintaining proper isolation between users and sessions.

## Requirements

- **5.1**: Pseudonymize all names, IDs, and amounts before sending to AI
- **5.2**: Maintain secure mapping table in Firestore
- **5.3**: Reverse pseudonymization to display real values
- **5.5**: Log all pseudonymization operations

## Session-Based Approach

### Why Session-Based?

**Privacy Isolation:**
- User 1's "John Doe" in Session A → "Person_A" (encrypted: abc123...)
- User 2's "John Doe" in Session B → "Person_A" (encrypted: xyz789...)
- Different encrypted values = Privacy protected!

**LLM Context:**
- Same value always gets same pseudonym within a session
- LLM can maintain context across conversation
- Works with stateless LLM APIs (Claude, OpenAI)

## Usage

### Import the Service

```typescript
import { pseudonymizationService } from '../services';
// or
import { PseudonymizationService } from '../services/PseudonymizationService';
```

### Basic Usage

```typescript
// 1. Create session ID when chat starts
const sessionId = `chat_${Date.now()}_${userId}`;

// 2. Pseudonymize findings
const findings = await findingsService.getFindings({
  filters: { severity: 'High' },
  limit: 10
});

const result = await pseudonymizationService.pseudonymizeFindings(
  findings.data,
  sessionId  // Required: Chat session ID
);

console.log(result);
// {
//   pseudonymizedFindings: [...], // Findings with sensitive data replaced
//   sessionId: 'chat_1234567890_user123',
//   batchId: 'chat_1234567890_user123',  // Same as sessionId
//   mappingsCreated: 15
// }

// 3. Send to AI service
const aiResponse = await sendToAI(result.pseudonymizedFindings);

// 4. Depseudonymize the AI response
const originalResponse = await pseudonymizationService.depseudonymizeResults(
  aiResponse,
  sessionId  // Same sessionId
);
```

### Complete Chat Flow Example

```typescript
class ChatHandler {
  private sessionId: string;
  private conversationHistory: Message[] = [];
  
  constructor(chatSessionId: string) {
    this.sessionId = chatSessionId;
  }
  
  async handleMessage(query: string, findings: Finding[]) {
    // 1. Pseudonymize findings and query
    const pseudoFindings = await pseudonymizationService.pseudonymizeFindings(
      findings,
      this.sessionId
    );
    const pseudoQuery = await pseudonymizationService.pseudonymizeText(
      query,
      this.sessionId
    );
    
    // 2. Add to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: pseudoQuery.pseudonymizedText
    });
    
    // 3. Send FULL HISTORY to LLM (stateless API)
    const llmResponse = await callLLM({
      messages: this.conversationHistory  // Full conversation
    });
    
    // 4. Add response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: llmResponse.content
    });
    
    // 5. Depseudonymize for user
    const realResponse = await pseudonymizationService.depseudonymizeText(
      llmResponse.content,
      this.sessionId
    );
    
    return realResponse;
  }
}

// Usage
const sessionId = `chat_${Date.now()}_${userId}`;
const chatHandler = new ChatHandler(sessionId);

// Message 1
await chatHandler.handleMessage("Show findings for John Doe", findings);
// John Doe → Person_A

// Message 2
await chatHandler.handleMessage("What about Jane Smith?", moreFindings);
// Jane Smith → Person_B
// John Doe → Person_A (reused from session)
```

### Pseudonymize Text

For simple text pseudonymization (e.g., chat queries):

```typescript
const sessionId = `chat_${Date.now()}_${userId}`;
const userQuery = "What issues did John Doe identify involving $5,000?";

const { pseudonymizedText, sessionId: returnedSessionId } = 
  await pseudonymizationService.pseudonymizeText(
    userQuery,
    sessionId
  );

console.log(pseudonymizedText);
// "What issues did Person_A identify involving Amount_001?"

// Send to AI...
const aiResponse = await sendToAI(pseudonymizedText);

// Depseudonymize the response
const originalResponse = await pseudonymizationService.depseudonymizeText(
  aiResponse,
  sessionId  // Same sessionId
);
```

## Pseudonymization Patterns

### Names
- **Pattern**: `Person_A`, `Person_B`, ..., `Person_Z`, `Person_A1`, etc.
- **Extracted from**: `executor`, `reviewer`, `manager` fields

### IDs
- **Pattern**: `ID_001`, `ID_002`, `ID_003`, etc.
- **Extracted from**: Text matching patterns like `ABC123`, `123456` in descriptions

### Amounts
- **Pattern**: `Amount_001`, `Amount_002`, `Amount_003`, etc.
- **Extracted from**: Currency patterns like `$1,000`, `5000 USD`, `rupiah` in text

## Example Transformations

### Before Pseudonymization
```json
{
  "findingTitle": "Security Breach",
  "findingDescription": "John Doe discovered vulnerability ID12345 involving $5,000",
  "executor": "John Doe",
  "reviewer": "Jane Smith",
  "manager": "Bob Johnson"
}
```

### After Pseudonymization
```json
{
  "findingTitle": "Security Breach",
  "findingDescription": "Person_A discovered vulnerability ID_001 involving Amount_001",
  "executor": "Person_A",
  "reviewer": "Person_B",
  "manager": "Person_C"
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

## Error Handling

### Authentication Errors
```typescript
try {
  await pseudonymizationService.pseudonymizeFindings(findings, sessionId);
} catch (error) {
  if (error.message.includes('unauthenticated')) {
    // User needs to log in
    redirectToLogin();
  }
}
```

### Mapping Not Found
```typescript
try {
  await pseudonymizationService.depseudonymizeResults(data, sessionId);
} catch (error) {
  if (error.message.includes('not found')) {
    // Mappings expired or invalid session ID
    console.error('Mappings not found. They may have expired (30 days).');
  }
}
```

### Missing SessionId
```typescript
try {
  await pseudonymizationService.pseudonymizeFindings(findings, '');
} catch (error) {
  if (error.message.includes('sessionId is required')) {
    console.error('Must provide a valid sessionId');
  }
}
```

## Security Considerations

### Session Isolation
- Each session has unique encrypted mappings
- Cross-session data leakage prevented
- User A's data ≠ User B's data (even if same values)

### Encryption
- All original values encrypted with AES-256-GCM
- Unique IV per encryption
- Authentication tag prevents tampering

### Access Control
- Mappings collection is server-side only
- Authentication required for all operations
- User ID tracked in all operations

### Automatic Cleanup
- Mappings expire after 30 days
- Daily scheduled cleanup
- Reduces data retention risk

## Performance Tips

### Reuse SessionId
```typescript
// Good: Use same sessionId for entire conversation
const sessionId = chatSession.id;
await pseudonymizationService.pseudonymizeFindings(findings1, sessionId);
await pseudonymizationService.pseudonymizeFindings(findings2, sessionId);
// Mappings reused = faster

// Bad: Different sessionId each time
await pseudonymizationService.pseudonymizeFindings(findings1, 'session_1');
await pseudonymizationService.pseudonymizeFindings(findings2, 'session_2');
// New mappings created = slower
```

### Batch Operations
```typescript
// Good: Pseudonymize all findings at once
const result = await pseudonymizationService.pseudonymizeFindings(
  allFindings,
  sessionId
);

// Bad: Pseudonymize one at a time
for (const finding of allFindings) {
  await pseudonymizationService.pseudonymizeFindings([finding], sessionId);
}
```

## Testing

### Test Session Isolation
```typescript
const findings = [{ executor: 'John Doe' }];

// Session 1
const result1 = await pseudonymizationService.pseudonymizeFindings(
  findings,
  'session_1'
);
console.log(result1.pseudonymizedFindings[0].executor); // "Person_A"

// Session 2
const result2 = await pseudonymizationService.pseudonymizeFindings(
  findings,
  'session_2'
);
console.log(result2.pseudonymizedFindings[0].executor); // "Person_A"

// Different encrypted values in database = privacy protected!
```

### Test Consistency Within Session
```typescript
const sessionId = 'session_1';

// First call
const result1 = await pseudonymizationService.pseudonymizeFindings(
  [{ executor: 'John Doe' }],
  sessionId
);
console.log(result1.pseudonymizedFindings[0].executor); // "Person_A"

// Second call (same session)
const result2 = await pseudonymizationService.pseudonymizeFindings(
  [{ executor: 'John Doe', reviewer: 'Jane Smith' }],
  sessionId
);
console.log(result2.pseudonymizedFindings[0].executor); // "Person_A" (reused)
console.log(result2.pseudonymizedFindings[0].reviewer); // "Person_B" (new)
```

### Integration Test
```typescript
it('should round-trip pseudonymization', async () => {
  const sessionId = `test_${Date.now()}`;
  const original = {
    message: 'John Doe found issue ID12345 involving $5,000'
  };

  // Pseudonymize
  const { pseudonymizedText } = await pseudonymizationService.pseudonymizeText(
    original.message,
    sessionId
  );

  expect(pseudonymizedText).not.toContain('John Doe');
  expect(pseudonymizedText).not.toContain('ID12345');
  expect(pseudonymizedText).not.toContain('$5,000');

  // Depseudonymize
  const restored = await pseudonymizationService.depseudonymizeText(
    pseudonymizedText,
    sessionId
  );

  expect(restored).toBe(original.message);
});
```

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

## Related Documentation

- [Session-Based Pseudonymization Guide](../../docs/task-8-session-based-pseudonymization.md)
- [Quick Reference](../../docs/pseudonymization-quick-reference.md)
- [Flow Diagram](../../docs/pseudonymization-flow-diagram.md)
- [Update Documentation](../../docs/task-8-update-session-based.md)
- [Cloud Functions README](../../functions/README.md)
- [Design Document](../../.kiro/specs/first-aid-system/design.md)

## API Reference

### `pseudonymizeFindings(findings, sessionId)`

Pseudonymizes an array of findings for a specific session.

**Parameters:**
- `findings: Finding[]` - Array of findings to pseudonymize
- `sessionId: string` - **Required:** Chat session ID for isolation

**Returns:** `Promise<PseudonymizeResponse>`
- `pseudonymizedFindings: Finding[]` - Findings with sensitive data replaced
- `sessionId: string` - Session ID for this operation
- `batchId: string` - Same as sessionId (backward compatibility)
- `mappingsCreated: number` - Number of mappings created

### `depseudonymizeResults(data, sessionId)`

Depseudonymizes data by restoring original values for a specific session.

**Parameters:**
- `data: any` - Data containing pseudonyms to reverse
- `sessionId: string` - **Required:** Session ID from pseudonymization operation

**Returns:** `Promise<any>` - Data with original values restored

### `pseudonymizeText(text, sessionId)`

Pseudonymizes a single text string for a specific session.

**Parameters:**
- `text: string` - Text to pseudonymize
- `sessionId: string` - **Required:** Chat session ID

**Returns:** `Promise<{ pseudonymizedText: string; sessionId: string }>`

### `depseudonymizeText(text, sessionId)`

Depseudonymizes a single text string for a specific session.

**Parameters:**
- `text: string` - Text containing pseudonyms
- `sessionId: string` - **Required:** Session ID from pseudonymization

**Returns:** `Promise<string>` - Text with original values restored
