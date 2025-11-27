import { useState, useEffect, useRef } from 'react';
import { ChatSession } from '../types/chat.types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface ChatInterfaceProps {
  sessions?: ChatSession[];
  currentSession?: ChatSession | null;
  onSessionSelect?: (sessionId: string) => void;
  onNewSession?: () => void;
  onSendMessage?: (message: string) => void;
  loading?: boolean;
}

/**
 * ChatInterface Component
 * 
 * Main chat interface with message list, input, and session sidebar.
 * Implements responsive layout for different screen sizes.
 * 
 * Requirements: 6.1, 6.5
 */
export function ChatInterface({
  sessions = [],
  currentSession = null,
  onSessionSelect,
  onNewSession,
  onSendMessage,
  loading = false,
}: ChatInterfaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Auto-scroll to latest message when messages change or loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, loading]);

  // Smooth scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Example questions for empty state
  const exampleQuestions = [
    'What are the most critical findings in the last month?',
    'Show me all overdue findings by location',
    'What patterns do you see in recent audit findings?',
    'Which departments have the most high-risk findings?',
  ];

  const handleExampleClick = (question: string) => {
    if (onSendMessage) {
      onSendMessage(question);
    }
  };

  // Get suggestions from the last assistant message
  const lastAssistantMessage = currentSession?.messages
    .filter((msg) => msg.role === 'assistant')
    .pop();
  const suggestions = lastAssistantMessage?.metadata?.suggestions || [];

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans">
      {/* Session Sidebar - Minimalist */}
      <div
        className={`${sidebarOpen ? 'w-[280px] translate-x-0' : 'w-0 -translate-x-full opacity-0'
          } transition-all duration-300 ease-in-out bg-gray-50 border-r border-gray-100 flex flex-col fixed md:relative z-20 h-full`}
      >
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between">
          <button
            onClick={onNewSession}
            className="flex-1 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden ml-2 p-2 text-gray-500 hover:bg-gray-200 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Recent
          </div>
          {sessions.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              No history yet
            </div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSessionSelect?.(session.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors group relative ${currentSession?.id === session.id
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <p className="text-sm truncate pr-4">
                  {session.title || 'Untitled Chat'}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative bg-white">
        {/* Top Navigation Bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                title="Open sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <h1 className="text-sm font-medium text-gray-700">
              {currentSession?.title || 'New Chat'}
            </h1>
          </div>
          <button
            onClick={() => window.history.back()}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-3xl mx-auto px-4 pt-20 pb-32 min-h-full flex flex-col">
            {!currentSession || currentSession.messages.length === 0 ? (
              /* Empty State - Centered & Minimal */
              <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Hello, how can I help?
                </h2>
                <p className="text-gray-500 mb-8 max-w-md">
                  I can analyze your audit findings, identify risks, and help you find specific information.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {exampleQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(question)}
                      className="text-left p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm transition-all duration-200 group"
                    >
                      <p className="text-sm text-gray-600 group-hover:text-blue-700 font-medium">
                        {question}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Message List */
              <div className="space-y-6">
                {currentSession.messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
                {loading && <TypingIndicator />}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Fixed Bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-10 pb-6 px-4">
          <div className="max-w-3xl mx-auto">
            <ChatInput
              onSendMessage={(msg) => onSendMessage?.(msg)}
              loading={loading}
              suggestions={suggestions}
              placeholder="Ask anything..."
            />
            <p className="text-center text-xs text-gray-400 mt-3">
              AI can make mistakes. Please verify important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}



/**
 * TypingIndicator Component
 * 
 * Displays an animated typing indicator while AI processes the query.
 * Shows a pulsing animation to indicate active processing.
 * 
 * Requirements: 6.1
 */
function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fadeIn">
      {/* AI Avatar */}
      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
        <svg
          className="w-5 h-5 text-purple-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </div>

      {/* Typing Animation */}
      <div className="flex-1 bg-gray-100 rounded-lg p-4 max-w-3xl">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
            <div
              className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: '0.2s' }}
            ></div>
            <div
              className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: '0.4s' }}
            ></div>
          </div>
          <span className="text-sm text-gray-600 ml-2">AI is thinking...</span>
        </div>
      </div>
    </div>
  );
}
