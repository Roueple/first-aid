# ChatInput Component

## Overview

The `ChatInput` component provides a sophisticated chat input interface with auto-resizing textarea, loading states, follow-up suggestions, and keyboard shortcuts. It's designed to enhance the user experience when interacting with the AI chat assistant.

## Features

### 1. Auto-Resize Textarea
- Automatically adjusts height based on content
- Minimum height: 48px
- Maximum height: 120px
- Scrollable when content exceeds maximum height
- Resets to minimum height after sending message

### 2. Keyboard Shortcuts
- **Enter**: Send message
- **Shift+Enter**: Insert new line
- Visual hints displayed below textarea

### 3. Loading State
- Send button shows spinner animation when loading
- Textarea and suggestions disabled during loading
- Prevents duplicate message submissions

### 4. Follow-up Suggestions
- Displays clickable suggestion chips above input
- Suggestions extracted from AI assistant's last message metadata
- Each chip shows lightning bolt icon
- Truncates long suggestions with ellipsis
- Hidden when no suggestions available

### 5. Input Validation
- Send button disabled when input is empty or whitespace-only
- Automatically trims whitespace before sending
- Prevents sending empty messages

## Props

```typescript
interface ChatInputProps {
  onSendMessage: (message: string) => void;  // Callback when message is sent
  loading?: boolean;                          // Loading state
  suggestions?: string[];                     // Follow-up suggestions
  placeholder?: string;                       // Textarea placeholder
}
```

## Usage

### Basic Usage

```tsx
import { ChatInput } from './components/ChatInput';

function ChatPage() {
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (message: string) => {
    setLoading(true);
    try {
      await sendMessageToAI(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ChatInput
      onSendMessage={handleSendMessage}
      loading={loading}
    />
  );
}
```

### With Suggestions

```tsx
import { ChatInput } from './components/ChatInput';

function ChatPage() {
  const suggestions = [
    'What are the most critical findings?',
    'Show me overdue findings',
    'Analyze patterns by location'
  ];

  return (
    <ChatInput
      onSendMessage={handleSendMessage}
      loading={loading}
      suggestions={suggestions}
    />
  );
}
```

### Custom Placeholder

```tsx
<ChatInput
  onSendMessage={handleSendMessage}
  placeholder="Type your question here..."
/>
```

## Integration with ChatInterface

The `ChatInput` component is integrated into `ChatInterface` and automatically extracts suggestions from the last assistant message:

```tsx
// In ChatInterface.tsx
const lastAssistantMessage = currentSession?.messages
  .filter((msg) => msg.role === 'assistant')
  .pop();
const suggestions = lastAssistantMessage?.metadata?.suggestions || [];

<ChatInput
  onSendMessage={(msg) => onSendMessage?.(msg)}
  loading={loading}
  suggestions={suggestions}
/>
```

## Styling

The component uses Tailwind CSS classes with the following color scheme:
- Primary color: Purple (purple-600, purple-700)
- Suggestion chips: Purple-50 background with purple-700 text
- Border: Gray-300
- Focus ring: Purple-500

## Accessibility

- Textarea has proper placeholder text
- Send button has descriptive title attribute
- Keyboard shortcuts clearly indicated
- Disabled states properly communicated
- Loading state visually indicated with spinner

## Requirements

Implements **Requirement 6.4**: Chat input with suggestions

### Acceptance Criteria

✅ Build ChatInput component with auto-resize textarea
✅ Add send button with loading state
✅ Display follow-up suggestions as clickable chips
✅ Implement keyboard shortcuts (Enter to send, Shift+Enter for new line)

## Testing

The component includes comprehensive unit tests covering:
- Rendering and basic functionality
- Message sending via button and Enter key
- Shift+Enter for new lines
- Input validation and trimming
- Loading states
- Suggestion chips
- Keyboard shortcuts
- Edge cases

Run tests:
```bash
npm test -- ChatInput.test.tsx
```

## Future Enhancements

Potential improvements for future iterations:
- Voice input support
- File attachment capability
- Emoji picker
- Message history navigation (up/down arrows)
- Auto-complete for common queries
- Character count indicator
- Draft saving
