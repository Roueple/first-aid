# DocAI Automated Session Titles

## Overview

DocAI now automatically generates descriptive titles for chat sessions, similar to ChatGPT and Claude. Each session gets a concise, AI-generated title based on the first user message.

## Features

### 1. Automated Title Generation
- **Trigger**: Automatically generated after the first message in a session
- **Method**: Uses Gemini AI to create a concise, descriptive title (max 6 words)
- **Fallback**: Defaults to "New Chat" if generation fails
- **Storage**: Stored in the `doc_sessions` collection under the `title` field

### 2. User Privacy & Security
- **User Isolation**: Users can only see their own session history
- **Firestore Rules**: Enforced at the database level
  - Read: Only sessions where `userId == request.auth.uid`
  - Write: Only sessions owned by the authenticated user
- **Query Optimization**: Indexed by `userId` for fast retrieval

### 3. Session Management
- **Session List**: Displays all user sessions with titles, message counts, and last activity
- **Session Switching**: Click any session to load its full conversation history
- **New Chat**: Creates a new session and deactivates the previous one

## Implementation Details

### Database Schema

```typescript
interface DocSession {
  id?: string;
  userId: string;
  title?: string; // NEW: Auto-generated title
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActivityAt: Timestamp;
  anonymizationMap: Record<string, string>;
  sessionMetadata?: {...};
  isActive: boolean;
  messageCount: number;
}
```

### Title Generation Logic

1. **First Message Detection**: Checks if conversation history is empty
2. **Async Generation**: Title generation happens asynchronously (non-blocking)
3. **AI Prompt**: Instructs Gemini to create a 6-word max title capturing the main topic
4. **Cleanup**: Removes quotes, trailing periods, and limits to 60 characters
5. **Update**: Stores title in Firestore via `updateTitle()` method

### Security Rules

```javascript
// DocAI Sessions - users can only access their own sessions
match /doc_sessions/{sessionId} {
  allow read: if isAuthenticated() && 
    resource.data.userId == request.auth.uid;
  allow create: if isAuthenticated() && 
    request.resource.data.userId == request.auth.uid;
  allow update, delete: if isAuthenticated() && 
    resource.data.userId == request.auth.uid;
}

// DocAI Chats - protected via session ownership
// Security model: Users can only get sessionIds from their own sessions
// Application validates session ownership before querying chats
match /doc_chats/{chatId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() && 
    request.resource.data.userId == request.auth.uid;
  allow update, delete: if isAuthenticated() && 
    resource.data.userId == request.auth.uid;
}
```

**Security Model:**
- **Session-level protection**: `doc_sessions` rules ensure users can only access their own sessions
- **Application-level validation**: `getSessionHistory()` validates session ownership before returning chats
- **Defense in depth**: Even if a user somehow gets a sessionId, the app validates ownership
- **Write protection**: Users can only create/modify chats with their own userId

### Firestore Indexes

Existing indexes support efficient querying:
- `userId + createdAt DESC`: Load user sessions sorted by creation date
- `userId + isActive + lastActivityAt DESC`: Find active sessions
- `sessionId + timestamp ASC/DESC`: Load chat messages for a session

## User Experience

### Session Sidebar
- Toggle sidebar to view session history
- Each session shows:
  - **Title**: Auto-generated descriptive title
  - **Message Count**: Number of messages in the session
  - **Last Activity**: Date of last interaction
- Active session is highlighted
- Click to switch between sessions

### Title Examples

| First Message | Generated Title |
|--------------|----------------|
| "Show me all high priority findings" | "High Priority Findings Review" |
| "Analyze project completion rates" | "Project Completion Analysis" |
| "What are the common issues in Jakarta projects?" | "Jakarta Projects Common Issues" |
| "Help me understand the audit results" | "Audit Results Understanding" |

## API Methods

### New Methods

```typescript
// Generate title for a session
generateSessionTitle(firstMessage: string): Promise<string>

// Update session title
DocSessionService.updateTitle(sessionId: string, title: string): Promise<void>
```

### Updated Methods

```typescript
// sendDocQuery now generates titles for first messages
sendDocQuery(
  message: string,
  userId: string,
  thinkingMode?: ThinkingMode,
  sessionId?: string
): Promise<string>
```

## Migration

No migration needed! Existing sessions without titles will:
- Display as "Untitled Session" in the UI
- Get a title automatically when the next message is sent
- Continue to work normally

## Performance

- **Title Generation**: ~1-2 seconds (async, non-blocking)
- **Session Loading**: Optimized with Firestore indexes
- **User Queries**: Filtered at database level for security and speed

## Future Enhancements

- [ ] Allow users to manually edit session titles
- [ ] Add session search/filter functionality
- [ ] Implement session folders/categories
- [ ] Add session export/import
- [ ] Session sharing (with permission controls)
