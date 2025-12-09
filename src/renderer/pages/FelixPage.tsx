import React, { useState, useRef, useEffect } from 'react';
import { felixService } from '../../services/FelixService';
import FelixSessionService from '../../services/FelixSessionService';
import FelixChatService from '../../services/FelixChatService';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/AuthService';
import '../styles/felix.css';

// Dr. Felix logo - use the image you provided
const felixLogo = '/felix-logo.png';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  {
    title: '💡 Ask anything',
    description: 'I can help with questions, explanations, and ideas'
  },
  {
    title: '📊 Analyze data',
    description: 'Get insights and understand patterns'
  },
  {
    title: '✍️ Write content',
    description: 'Create text, summaries, or documentation'
  },
  {
    title: '🔍 Research topics',
    description: 'Learn about any subject in depth'
  }
];

export default function FelixPage() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-authenticate with test credentials if not logged in
  useEffect(() => {
    const autoAuth = async () => {
      if (!currentUser && !isAuthenticating) {
        setIsAuthenticating(true);
        try {
          await authService.signIn('test@example.com', 'password123', false);
        } catch (error) {
          console.error('Auto-authentication failed:', error);
        } finally {
          setIsAuthenticating(false);
        }
      }
    };
    autoAuth();
  }, [currentUser, isAuthenticating]);

  // Load user sessions when authenticated (but don't create a new session yet)
  useEffect(() => {
    if (currentUser) {
      loadUserSessions();
    }
  }, [currentUser]);

  // Deactivate all sessions when component unmounts (page closes)
  useEffect(() => {
    return () => {
      if (currentUser && currentSessionId) {
        FelixSessionService.deactivateSession(currentSessionId).catch(err => 
          console.error('Error deactivating session on unmount:', err)
        );
      }
    };
  }, [currentUser, currentSessionId]);

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const chats = await FelixChatService.getSessionChats(sessionId);
      const loadedMessages: Message[] = chats.map(chat => ({
        id: chat.id,
        role: chat.role,
        content: chat.message,
        timestamp: chat.timestamp.toDate(),
      }));
      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading session messages:', error);
    }
  };

  const loadUserSessions = async () => {
    if (!currentUser) return;
    
    try {
      const userSessions = await FelixSessionService.getUserSessions(currentUser.uid, 10);
      setSessions(userSessions);
    } catch (error) {
      console.error('Error loading user sessions:', error);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentUser) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);

    try {
      // Create assistant message placeholder
      const assistantMessageId = (Date.now() + 1).toString();
      let assistantContent = '';

      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }]);

      // Stream the response with session management
      // Session will be created on first message if currentSessionId is null
      const stream = felixService.streamChat(
        userMessage.content,
        currentUser.uid,
        currentSessionId || undefined
      );

      for await (const chunk of stream) {
        if (typeof chunk === 'string') {
          assistantContent += chunk;
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: assistantContent }
              : msg
          ));
        } else if (chunk && typeof chunk === 'object' && 'sessionId' in chunk) {
          // Final return value with sessionId
          // Set session ID if this was the first message (session just created)
          if (!currentSessionId) {
            setCurrentSessionId((chunk as { sessionId: string }).sessionId);
            console.log('🆕 Started new Felix session:', (chunk as { sessionId: string }).sessionId);
          }
        }
      }

      // Reload sessions list
      await loadUserSessions();

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: typeof SUGGESTIONS[0]) => {
    setInput(suggestion.description);
    inputRef.current?.focus();
  };

  const handleNewChat = async () => {
    if (!currentUser) return;
    
    try {
      // Deactivate current session if it exists
      if (currentSessionId) {
        await FelixSessionService.deactivateSession(currentSessionId);
      }

      // Clear UI state - new session will be created when first message is sent
      setCurrentSessionId(null);
      setMessages([]);
      setInput('');

      // Reload sessions list
      await loadUserSessions();
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleLoadSession = async (sessionId: string) => {
    try {
      // Deactivate current session if it exists
      if (currentSessionId) {
        await FelixSessionService.deactivateSession(currentSessionId);
      }

      // Load the selected session
      setCurrentSessionId(sessionId);
      await loadSessionMessages(sessionId);
      
      // Update activity timestamp
      await FelixSessionService.updateActivity(sessionId);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatSessionDate = (timestamp: any) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Show loading state while authenticating
  if (isAuthenticating || !currentUser) {
    return (
      <div className="felix-container">
        <div className="felix-main">
          <div className="felix-welcome">
            <div className="felix-welcome-icon">F</div>
            <div>
              <h1>Authenticating...</h1>
              <p>Please wait while we set up your session</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="felix-container">
      {/* Sidebar */}
      {showSidebar && (
        <div className="felix-sidebar">
          <div className="felix-sidebar-header">
            <button className="felix-new-chat-btn" onClick={handleNewChat}>
              <span>+</span>
              <span>New Chat</span>
            </button>
          </div>
          <div className="felix-sidebar-content">
            {sessions.length === 0 ? (
              <div className="felix-sidebar-empty">
                <p>No chat history yet</p>
              </div>
            ) : (
              <div className="felix-session-list">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`felix-session-item ${session.id === currentSessionId ? 'active' : ''}`}
                    onClick={() => handleLoadSession(session.id)}
                  >
                    <div className="felix-session-title">
                      {session.title || 'New Chat'}
                    </div>
                    <div className="felix-session-meta">
                      <span>{session.messageCount || 0} messages</span>
                      <span>•</span>
                      <span>{formatSessionDate(session.lastActivityAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="felix-main">
        {/* Header */}
        <div className="felix-header">
          <div className="felix-header-left">
            <button 
              className="felix-sidebar-toggle"
              onClick={() => setShowSidebar(!showSidebar)}
              title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
            >
              {showSidebar ? '◀' : '▶'}
            </button>
          </div>
          <div className="felix-actions">
            {messages.length > 0 && (
              <button className="felix-btn" onClick={handleNewChat}>
                New Chat
              </button>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="felix-chat-area" ref={chatAreaRef}>
        {messages.length === 0 ? (
          <div className="felix-welcome">
            <div>
              <h1>Hello, {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'there'}!</h1>
              <p>How can I help you today?</p>
            </div>
            <div className="felix-suggestions">
              {SUGGESTIONS.map((suggestion, index) => (
                <div 
                  key={index}
                  className="felix-suggestion-card"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <h3>{suggestion.title}</h3>
                  <p>{suggestion.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} className={`felix-message ${message.role}`}>
                <div className={`felix-avatar ${message.role}`}>
                  {message.role === 'assistant' ? 'A' : 'U'}
                </div>
                <div className="felix-message-content">
                  <div className="felix-message-bubble">
                    {message.content || (
                      <div className="felix-typing">
                        <div className="felix-typing-dot"></div>
                        <div className="felix-typing-dot"></div>
                        <div className="felix-typing-dot"></div>
                      </div>
                    )}
                  </div>
                  <div className="felix-message-time">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && !isStreaming && (
              <div className="felix-message assistant">
                <div className="felix-avatar assistant">A</div>
                <div className="felix-message-content">
                  <div className="felix-typing">
                    <div className="felix-typing-dot"></div>
                    <div className="felix-typing-dot"></div>
                    <div className="felix-typing-dot"></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        </div>

        {/* Input Area */}
        <div className="felix-input-area">
        <div className="felix-input-container">
          <div className="felix-input-wrapper">
            <textarea
              ref={inputRef}
              className="felix-input"
              placeholder="Ask anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
            />
          </div>
          <button 
            className="felix-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <span>Send</span>
            <span>→</span>
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
