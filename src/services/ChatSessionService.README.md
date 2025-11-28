# ChatSessionService

## Overview
`ChatSessionService` manages persistent chat sessions and messages in Firestore. It extends `DatabaseService` to provide specialized operations for AI chat conversations.

## Purpose
- Store chat conversations persistently in Firestore
- Manage multiple chat sessions per user
- Provide conversation history for AI context
- Enable session management (create, load, update, delete)

## Collection Structure

### Firestore Collection: `chatSessions`

```typescript
{
  id: string;                    // Auto-generated document ID
  userId: string;                // Owner's user ID
  title: string;                 // Session title (first message preview)
  messages: ChatMessage[];       // Array of messages
  createdAt: Timestamp;          // Creation timestamp
  updatedAt: Timestamp;          // Last update timestamp
  isActive: boolean;             // Soft delete flag
}
```

### ChatMessage Structure
```typescript
{
  id: string;                    // Unique message ID
  role: 'user' | 'assistant';    // Message sender
  content: string;               // Message text
  timestamp: Timestamp;          // Message timestamp
  metadata?: {                   // Optional metadata
    confidence?: number;
    sources?: string[];
    suggestions?: string[];
    processingTime?: number;
    isError?: boolean;
  }
}
```

## Key Methods

### Session Management

#### `createSession(input: CreateChatSessionInput): Promise<ChatSession>`
Creates a new chat session for a user.

```typescript
const session = await chatSessionService.createSession({
  userId: 'user-123',
  title: 'New Conversation'
});
```

#### `getUserSessions(userId: string, activeOnly?: boolean): Promise<ChatSession[]>`
Gets all sessions for a user, optionally filtering to active sessions only.

```typescript
const sessions = await chatSessionService.getUserSessions('user-123', true);
```

#### `getSession(sessionId: string): Promise<ChatSession | null>`
Gets a specific session by ID.

```typescript
const session = await chatSessionService.getSession('session-123');
```

#### `getMostRecentSession(userId: string): Promise<ChatSession | null>`
Gets the most recently updated active session for a user.

```typescript
const recentSession = await chatSessionService.getMostRecentSession('user-123');
```

### Message Management

#### `addMessage(input: AddMessageInput): Promise<ChatSession>`
Adds a message to a session and returns the updated session.

```typescript
const updatedSession = await chatSessionService.addMessage({
  sessionId: 'session-123',
  role: 'user',
  content: 'Hello, AI!',
  metadata: {
    processingTime: 0.5
  }
});
```

#### `getConversationHistory(sessionId: string): Promise<Array<{role, content}>>`
Gets conversation history formatted for Gemini API.

```typescript
const history = await chatSessionService.getConversationHistory('session-123');
// Returns: [{ role: 'user', content: '...' }, { role: 'assistant', content: '...' }]
```

#### `clearSessionMessages(sessionId: string): Promise<void>`
Removes all messages from a session.

```typescript
await chatSessionService.clearSessionMessages('session-123');
```

### Session Updates

#### `updateSessionTitle(sessionId: string, title: string): Promise<void>`
Updates the title of a session.

```typescript
await chatSessionService.updateSessionTitle('session-123', 'Updated Title');
```

#### `deactivateSession(sessionId: string): Promise<void>`
Soft deletes a session by marking it as inactive.

```typescript
await chatSessionService.deactivateSession('session-123');
```

#### `deleteSession(sessionId: string): Promise<void>`
Permanently deletes a session from Firestore.

```typescript
await chatSessionService.deleteSession('session-123');
```

## Usage Example

### Complete Chat Flow

```typescript
import { chatSessionService } from '../services/ChatSessionService';
import { sendMessageToGemini } from '../services/GeminiService';

// 1. Create or load session
let session = await chatSessionService.getMostRecentSession(userId);
if (!session) {
  session = await chatSessionService.createSession({
    userId,
    title: 'New Chat'
  });
}

// 2. Add user message
const updatedSession = await chatSessionService.addMessage({
  sessionId: session.id,
  role: 'user',
  content: userMessage
});

// 3. Get conversation history
const history = await chatSessionService.getConversationHistory(session.id);

// 4. Send to Gemini with context
const response = await sendMessageToGemini(
  userMessage,
  'low',
  session.id,
  history.slice(0, -1) // Exclude current message
);

// 5. Add AI response
const finalSession = await chatSessionService.addMessage({
  sessionId: session.id,
  role: 'assistant',
  content: response,
  metadata: {
    processingTime: 1.2
  }
});
```

## Error Handling

The service inherits error handling from `DatabaseService`:
- Connection errors
- Permission errors
- Not found errors
- Validation errors
- Automatic retry with exponential backoff

```typescript
try {
  const session = await chatSessionService.getSession('invalid-id');
} catch (error) {
  if (error instanceof DatabaseError) {
    console.error(`Database error: ${error.type}`, error.message);
  }
}
```

## Security

Firestore security rules ensure:
- Users can only access their own sessions
- `userId` must match authenticated user
- All operations require authentication

## Performance Considerations

- **Pagination**: Use `getUserSessions()` with limits for large session lists
- **Message Arrays**: Firestore has a 1MB document size limit
- **Indexing**: Queries are indexed on `userId`, `isActive`, and `updatedAt`
- **Caching**: Consider caching active session in memory

## Integration

### With ChatPage
```typescript
import { chatSessionService } from '../../services/ChatSessionService';
import { useAuth } from '../../contexts/AuthContext';

const { currentUser } = useAuth();
const sessions = await chatSessionService.getUserSessions(currentUser.uid);
```

### With GeminiService
```typescript
const history = await chatSessionService.getConversationHistory(sessionId);
const response = await sendMessageToGemini(message, mode, sessionId, history);
```

## Testing

See `src/services/__tests__/ChatSessionService.test.ts` for unit tests.

## Related Files
- `src/types/chat.types.ts` - Type definitions
- `src/services/GeminiService.ts` - AI integration
- `src/renderer/pages/ChatPage.tsx` - UI implementation
- `firestore.rules` - Security rules
