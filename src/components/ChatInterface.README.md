# ChatInterface Component

## Overview

The `ChatInterface` component provides the main UI for AI-powered chat functionality in the FIRST-AID system. It includes a message list, input area, and session sidebar for managing previous conversations.

## Requirements

- **Requirement 6.1**: AI Chat Interface - Process queries using RAG and display responses
- **Requirement 6.5**: Chat session management - Save and resume conversations

## Features

### 1. Session Sidebar
- Lists all previous chat sessions
- Highlights currently active session
- "New Chat" button to start fresh conversations
- Collapsible on mobile devices for responsive design
- Shows message count for each session

### 2. Message Display
- Role-based styling (user vs assistant messages)
- Avatar icons for visual distinction
- Timestamp display for each message
- Proper text wrapping and formatting
- Loading indicator during AI processing

### 3. Empty State
- Welcome message with instructions
- Example questions to help users get started
- Clickable example questions that auto-populate input
- Clean, inviting design

### 4. Input Area
- Auto-resizing textarea
- Keyboard shortcuts:
  - Enter: Send message
  - Shift+Enter: New line
- Send button with disabled state during loading
- Character limit handling
- Visual feedback for user actions

### 5. Responsive Layout
- Desktop: Full sidebar visible
- Tablet: Collapsible sidebar
- Mobile: Sidebar toggles with hamburger menu
- Flexible message area that adapts to screen size

## Props

```typescript
interface ChatInterfaceProps {
  sessions?: ChatSession[];           // List of previous chat sessions
  currentSession?: ChatSession | null; // Currently active session
  onSessionSelect?: (sessionId: string) => void; // Handler for session selection
  onNewSession?: () => void;          // Handler for creating new session
  onSendMessage?: (message: string) => void; // Handler for sending messages
  loading?: boolean;                  // Loading state for AI processing
}
```

## Usage

```tsx
import { ChatInterface } from '../components/ChatInterface';
import { ChatSession } from '../types/chat.types';

function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (message: string) => {
    setLoading(true);
    // Call AI service
    // Update session with response
    setLoading(false);
  };

  return (
    <ChatInterface
      sessions={sessions}
      currentSession={currentSession}
      onSessionSelect={(id) => setCurrentSession(sessions.find(s => s.id === id))}
      onNewSession={() => createNewSession()}
      onSendMessage={handleSendMessage}
      loading={loading}
    />
  );
}
```

## Component Structure

```
ChatInterface
├── Session Sidebar
│   ├── Header (with New Chat button)
│   └── Session List
│       └── Session Items (clickable)
└── Main Chat Area
    ├── Chat Header (with title and back button)
    ├── Messages Area
    │   ├── Empty State (when no messages)
    │   │   ├── Welcome message
    │   │   └── Example questions
    │   └── Message List
    │       └── MessageBubble components
    └── Input Area
        ├── Textarea (auto-resize)
        └── Send Button
```

## Styling

The component uses Tailwind CSS with the following color scheme:
- Primary: Purple (purple-600, purple-700)
- User messages: Blue (blue-600)
- Assistant messages: Gray (gray-100)
- Backgrounds: White and gray-50

## Accessibility

- Semantic HTML structure
- ARIA labels for icon buttons
- Keyboard navigation support
- Focus states for interactive elements
- Screen reader friendly

## Real-Time Updates (Task 10.4)

### Auto-Scroll Functionality
- Automatically scrolls to the latest message when new messages arrive
- Smooth scroll animation for better UX
- Triggers on message updates and loading state changes
- Uses `useRef` and `scrollIntoView` for precise control

### Typing Indicator
- Displays animated typing indicator while AI processes query
- Shows "AI is thinking..." message with pulsing dots
- Consistent styling with assistant messages
- Fade-in animation for smooth appearance

### Message List Updates
- Real-time updates as messages are added to the session
- Smooth transitions between states
- Maintains scroll position during updates
- Optimized re-rendering with React keys

## Future Enhancements

The following features will be added in subsequent tasks:
- Session management integration (Task 9.5)
- Streaming AI responses (if supported by AI service)
- Message editing and deletion
- Export chat history

## Testing

Unit tests should cover:
- Component rendering with different props
- Session selection functionality
- Message sending
- Empty state display
- Responsive behavior
- Keyboard shortcuts

## Notes

- The component is designed to be stateless and controlled by parent
- All business logic should be handled in the parent component
- The component focuses on UI presentation and user interaction
- Session data and AI integration will be implemented in future tasks
