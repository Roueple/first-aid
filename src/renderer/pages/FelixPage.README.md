# Felix Chat Interface

Modern AI chat assistant with session management and automatic title generation.

## Features

### Chat History Sidebar
- **Session List**: Shows all previous chat sessions with titles and metadata
- **Active Session Highlighting**: Current session is highlighted in the sidebar
- **Session Metadata**: Displays message count and last activity time
- **Collapsible**: Toggle sidebar visibility with the arrow button

### Automatic Title Generation
- **First Message**: When a user sends their first message in a new session, the title is automatically generated from that message
- **Smart Truncation**: Titles are limited to 50 characters with ellipsis for longer messages
- **Real-time Updates**: Session list updates automatically when new sessions are created or titles are generated

### Session Management
- **New Chat Button**: Create a new chat session (available in header and sidebar)
- **Session Switching**: Click any session in the sidebar to load its conversation history
- **Active Session Tracking**: Only one session is active at a time
- **Persistent History**: All messages are stored in Firestore and persist across app restarts

### UI/UX
- **Responsive Layout**: Sidebar can be hidden for more chat space
- **Smooth Animations**: Slide-in animations for messages and session items
- **Time Formatting**: Smart relative time display (e.g., "2h ago", "Just now")
- **Loading States**: Typing indicators and loading states for better feedback

## Technical Implementation

### Components
- **FelixPage.tsx**: Main chat interface with sidebar
- **FelixService.ts**: AI chat service with session integration
- **FelixSessionService.ts**: Session management (create, update, list)
- **FelixChatService.ts**: Chat message storage and retrieval

### Data Flow
1. User sends first message → Session created
2. After AI responds → Title auto-generated from first message
3. Session appears in sidebar with title
4. User can switch between sessions
5. All messages persist in Firestore

### Firestore Collections
- `felix_sessions`: Session metadata (title, messageCount, timestamps)
- `felix_chats`: Individual chat messages (user and assistant)

### Indexes
All required Firestore indexes are configured in `firestore.indexes.json`:
- `felix_sessions`: userId + isActive + lastActivityAt
- `felix_sessions`: userId + createdAt
- `felix_chats`: sessionId + timestamp (both directions)
- `felix_chats`: userId + timestamp

## Usage

### Starting a New Chat
1. Click "New Chat" button in header or sidebar
2. Type your message and press Enter or click Send
3. Title is automatically generated after first exchange

### Viewing Chat History
1. Sidebar shows all previous sessions
2. Click any session to load its conversation
3. Active session is highlighted in blue

### Toggling Sidebar
- Click the arrow button (◀/▶) in the header to show/hide sidebar
- Sidebar state persists during the session

## Styling

All styles are in `src/renderer/styles/felix.css`:
- Dark blue gradient theme
- Smooth transitions and animations
- Responsive layout with flexbox
- Custom scrollbars
- Hover effects and active states
