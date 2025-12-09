# Doc Assistant

## Overview

Doc is a modern AI assistant interface built with a beautiful, professional UI powered by custom React components and designed for MCP (Model Context Protocol) integration.

## Features

### Current Implementation

- **Modern UI/UX**: Beautiful gradient design with smooth animations and transitions
- **Real-time Chat**: Instant message exchange with typing indicators
- **Custom Chat Components**: Purpose-built ChatMessage and ChatInput components
- **Responsive Layout**: Adapts to different screen sizes
- **Suggested Prompts**: Quick-start suggestions for common tasks with hover effects
- **MCP Ready**: Service layer prepared for MCP integration
- **Auto-scroll**: Automatically scrolls to latest messages
- **Character Counter**: Shows character count in input field
- **Timestamp Display**: Shows message timestamps in readable format

### UI Components

1. **Header**
   - Doc Assistant branding with gradient icon
   - User avatar with initials
   - Connection status indicator with pulse animation
   - User email display

2. **Message Area**
   - User messages (right-aligned, blue-indigo gradient)
   - Assistant messages (left-aligned, white with border)
   - Avatar icons for both user and assistant
   - Timestamps for each message
   - Smooth fade-in animations
   - Loading animation with bouncing colored dots
   - Auto-scroll to latest message

3. **Input Area**
   - Auto-expanding textarea (up to 150px)
   - Character counter
   - Send button with gradient and icon
   - Loading state with spinner
   - Keyboard shortcuts (Enter to send, Shift+Enter for new line)
   - Message count and MCP status indicator

### Suggested Prompts

- 📊 Analyze my audit findings (Blue-Cyan gradient)
- 🔍 Search for high priority items (Purple-Pink gradient)
- 📈 Show me project statistics (Green-Emerald gradient)
- 💡 Suggest improvements (Orange-Red gradient)

## Technical Architecture

### Components

- **DocPage.tsx**: Main page component with state management
- **ChatMessage.tsx**: Individual message component with avatars and styling
- **ChatInput.tsx**: Auto-expanding input with send button
- **MCPService.ts**: Service layer for MCP communication (placeholder)
- **chat.css**: Custom styles and animations

### Component Props

#### ChatMessage
```typescript
interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  userName?: string;
}
```

#### ChatInput
```typescript
interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}
```

### State Management

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

- messages: Message[] - Array of chat messages
- input: string - Current input text
- isLoading: boolean - Loading state for API calls
- mcpStatus: object - MCP connection status
```

### Styling

- **Tailwind CSS**: Utility-first styling
- **Custom CSS**: Animations and transitions in chat.css
- **Gradients**: Blue-indigo for user, emerald-teal for assistant
- **Shadows**: Layered shadows for depth
- **Animations**: Fade-in, bounce, pulse, and spin effects

### Routing

- Path: `/doc`
- Protected by AuthGuard
- Accessible from HomePage menu

## MCP Integration (Planned)

The MCP service is currently a placeholder. To implement:

1. Configure MCP server connection
2. Implement `MCPService.initialize()`
3. Implement `MCPService.sendMessage()`
4. Add proper error handling
5. Add streaming support for real-time responses
6. Add context awareness from audit findings and projects

### MCP Service Interface

```typescript
interface MCPMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

interface MCPResponse {
  content: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    processingTime?: number;
  };
}
```

## Usage

1. Navigate to Doc from the main menu
2. Type your question or select a suggested prompt
3. Press Enter to send (Shift+Enter for new line)
4. View the AI response in real-time with smooth animations
5. Messages auto-scroll to keep latest visible

## Keyboard Shortcuts

- **Enter**: Send message
- **Shift+Enter**: New line in message
- **Escape**: Clear input (future)

## Future Enhancements

- [ ] Actual MCP integration with Gemini AI
- [ ] Message history persistence in Firestore
- [ ] File upload support for documents
- [ ] Code syntax highlighting in messages
- [ ] Export conversation to PDF/Markdown
- [ ] Voice input and text-to-speech
- [ ] Multi-language support
- [ ] Custom themes (light/dark mode)
- [ ] Keyboard shortcuts panel
- [ ] Message editing and deletion
- [ ] Context-aware suggestions from audit data
- [ ] Streaming responses with typewriter effect
- [ ] Rich text formatting (bold, italic, lists)
- [ ] Image and chart generation

## Design Principles

- **Minimal**: Clean interface without clutter
- **Modern**: Gradient backgrounds, smooth animations
- **Professional**: Polished look suitable for enterprise
- **Accessible**: High contrast, keyboard navigation
- **Responsive**: Works on all screen sizes
- **Fast**: Optimized for performance with React best practices
- **Intuitive**: Clear visual hierarchy and user feedback

## Dependencies

- **React**: UI framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **react-chat-elements**: Installed but using custom components for better control
