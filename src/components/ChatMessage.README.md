# ChatMessage Component

## Overview

The `ChatMessage` component displays individual chat messages with role-based styling, markdown rendering, confidence scores, processing time, and clickable source finding references. It's designed to provide rich, informative AI responses with full context and traceability.

## Requirements

- **Requirement 6.2**: Display AI responses with confidence scores and source finding references
- **Requirement 6.3**: Include patterns/trends in responses with supporting data

## Features

### 1. Role-Based Styling
- **User Messages**: Blue background with right alignment
- **Assistant Messages**: Gray background with left alignment
- Distinct avatar icons for visual differentiation
- Responsive layout that adapts to message length

### 2. Markdown Rendering
- **Headers**: H1, H2, H3 support with proper sizing
- **Bold Text**: `**text**` or `__text__`
- **Italic Text**: `*text*` or `_text_`
- **Code Blocks**: Triple backticks with syntax highlighting
- **Inline Code**: Single backticks with distinct styling
- **Lists**: Bullet points and numbered lists
- **Line Breaks**: Preserved from original content

### 3. Metadata Display (Assistant Messages Only)

#### Confidence Score
- Displays as percentage (0-100%)
- Visual indicator with checkmark icon
- Helps users understand AI certainty

#### Processing Time
- Shows response generation time in seconds
- Clock icon for visual clarity
- Useful for performance monitoring

#### Source Finding References
- Clickable badges for each source finding
- Document icon for visual identification
- Navigates to findings page with specific finding selected
- Shows count of sources used
- Helps users verify AI responses

#### Follow-up Suggestions
- Up to 3 suggested follow-up questions
- Displayed as clickable text
- Helps guide conversation flow

### 4. Timestamp
- Shows when message was sent
- Formatted as localized time string
- Falls back to "Just now" for new messages

## Props

```typescript
interface ChatMessageProps {
  message: ChatMessageType; // Chat message object with content and metadata
}
```

## Message Type Structure

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
  metadata?: {
    confidence?: number;        // 0-1 range
    sources?: string[];         // Finding IDs
    suggestions?: string[];     // Follow-up questions
    processingTime?: number;    // Seconds
  };
}
```

## Usage

```tsx
import { ChatMessage } from '../components/ChatMessage';
import { ChatMessage as ChatMessageType } from '../types/chat.types';

function ChatInterface() {
  const message: ChatMessageType = {
    id: 'msg-123',
    role: 'assistant',
    content: 'Based on the findings, I found **3 critical issues** in the Finance department...',
    timestamp: Timestamp.now(),
    metadata: {
      confidence: 0.92,
      sources: ['FND-2024-001', 'FND-2024-015'],
      suggestions: [
        'What are the root causes of these issues?',
        'Show me similar findings from last year'
      ],
      processingTime: 2.34
    }
  };

  return <ChatMessage message={message} />;
}
```

## Component Structure

```
ChatMessage
├── Avatar (User or Assistant icon)
└── Message Content Container
    ├── Message Bubble
    │   ├── MessageContent (with markdown)
    │   └── Metadata Section (assistant only)
    │       ├── Confidence Score
    │       ├── Processing Time
    │       ├── Source References (clickable)
    │       └── Follow-up Suggestions
    └── Timestamp
```

## Styling

### Color Scheme
- **User Messages**: Blue (blue-600 background, white text)
- **Assistant Messages**: Gray (gray-100 background, gray-900 text)
- **Source Badges**: Purple (purple-50 background, purple-700 text)
- **Metadata Icons**: Gray (gray-600)

### Layout
- Maximum width: 3xl (48rem)
- Flexible width based on content
- Proper spacing between elements
- Responsive design for mobile devices

## Markdown Rendering

The component includes a custom markdown renderer that supports:

1. **Code Blocks**
   ```
   ```language
   code here
   ```
   ```

2. **Inline Code**
   - Wrapped in backticks: `code`

3. **Text Formatting**
   - Bold: `**text**` or `__text__`
   - Italic: `*text*` or `_text_`

4. **Lists**
   - Bullet: `- item` or `* item`
   - Numbered: `1. item`

5. **Headers**
   - H1: `# Header`
   - H2: `## Header`
   - H3: `### Header`

## Source Reference Navigation

When a user clicks on a source finding badge:
1. Component uses React Router's `useNavigate` hook
2. Navigates to `/findings?id={findingId}`
3. Findings page should handle the `id` query parameter
4. Automatically scrolls to and highlights the referenced finding

## Accessibility

- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support for source badges
- Screen reader friendly metadata display
- Proper color contrast ratios

## Future Enhancements

Potential improvements for future iterations:
- Full markdown library integration (react-markdown)
- Syntax highlighting for code blocks
- Image rendering support
- Link preview cards
- Copy-to-clipboard for code blocks
- Message editing/deletion
- Reaction emojis
- Message threading

## Testing

Unit tests should cover:
- Rendering user vs assistant messages
- Markdown formatting (bold, italic, code, lists)
- Metadata display (confidence, time, sources)
- Source reference click navigation
- Timestamp formatting
- Edge cases (missing metadata, empty sources)

## Notes

- The component uses a custom markdown renderer for basic formatting
- For production, consider integrating `react-markdown` for full markdown support
- Source references require the findings page to handle query parameters
- Processing time is displayed in seconds with 2 decimal places
- Confidence score is converted from 0-1 range to 0-100% for display
- Follow-up suggestions are limited to 3 for UI cleanliness

## Performance Considerations

- Markdown parsing is done on render (consider memoization for large messages)
- Source badges are rendered as buttons for better accessibility
- Component is optimized for typical message lengths (< 1000 characters)
- For very long messages, consider implementing "show more" functionality
