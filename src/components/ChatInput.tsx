import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  loading?: boolean;
  suggestions?: string[];
  placeholder?: string;
}

/**
 * ChatInput Component
 * 
 * Chat input with auto-resize textarea, send button with loading state,
 * follow-up suggestions as clickable chips, and keyboard shortcuts.
 * 
 * Features:
 * - Auto-resize textarea (min 48px, max 120px)
 * - Enter to send, Shift+Enter for new line
 * - Loading state on send button
 * - Clickable suggestion chips
 * 
 * Requirements: 6.4
 */
export function ChatInput({
  onSendMessage,
  loading = false,
  suggestions = [],
  placeholder = 'Ask a question about your audit findings...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height based on scrollHeight, constrained by min/max
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 48), 120);
      textarea.style.height = `${newHeight}px`;
    }
  }, [message]);

  const handleSendMessage = () => {
    if (message.trim() && !loading) {
      onSendMessage(message.trim());
      setMessage('');

      // Reset textarea height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = '48px';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (!loading) {
      onSendMessage(suggestion);
    }
  };

  return (
    <div className="w-full">
      <div className="max-w-3xl mx-auto">
        {/* Suggestion Chips */}
        {suggestions.length > 0 && (
          <div className="mb-4 animate-slide-up">
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-gray-600 text-sm rounded-full hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="max-w-xs truncate">{suggestion}</span>
                  <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="relative bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 transition-shadow hover:shadow-2xl hover:shadow-gray-200/50">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={loading}
            rows={1}
            className="w-full pl-6 pr-14 py-4 bg-transparent border-none focus:ring-0 resize-none disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 placeholder-gray-400 max-h-[200px] overflow-y-auto"
            style={{ minHeight: '56px' }}
          />

          <div className="absolute right-2 bottom-2">
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || loading}
              className={`p-2 rounded-xl transition-all duration-200 ${message.trim() && !loading
                ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-md'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              title="Send message"
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
