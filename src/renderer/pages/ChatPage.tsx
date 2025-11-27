import { useState } from 'react';
import { ChatInterface } from '../../components/ChatInterface';
import { ChatSession, ChatMessage } from '../../types/chat.types';
import { Timestamp } from 'firebase/firestore';
import { auditService } from '../../services/AuditService';
import { sendMessageToGemini } from '../../services/GeminiService';

/**
 * ChatPage Component
 * 
 * Main page for AI chat functionality.
 * Integrates ChatInterface with session management.
 * 
 * Requirements: 6.1, 6.5
 */
export function ChatPage() {
  const [sessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSessionSelect = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
    }
  };

  const handleNewSession = () => {
    // TODO: Implement new session creation in future tasks
    console.log('New session requested');
  };

  const handleSendMessage = async (message: string) => {
    setLoading(true);

    const startTime = Date.now();

    // Create user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: Timestamp.now(),
    };

    // Add user message to current session (or create new session)
    let sessionId: string;
    let updatedSession: ChatSession;

    if (currentSession) {
      sessionId = currentSession.id;
      updatedSession = {
        ...currentSession,
        messages: [...currentSession.messages, userMessage],
        updatedAt: Timestamp.now(),
      };
      setCurrentSession(updatedSession);
    } else {
      // Create new session with first message
      sessionId = `session-${Date.now()}`;
      updatedSession = {
        id: sessionId,
        userId: 'demo-user',
        title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        messages: [userMessage],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isActive: true,
      };
      setCurrentSession(updatedSession);
    }

    try {
      const responseText = await sendMessageToGemini(message);
      const responseTime = Date.now() - startTime;

      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: responseText,
        timestamp: Timestamp.now(),
        metadata: {
          processingTime: responseTime / 1000,
        },
      };

      setCurrentSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, aiMessage],
          updatedAt: Timestamp.now(),
        };
      });

      // Log AI query to audit logs
      await auditService.logAIQuery(sessionId, message, responseTime);
    } catch (error) {
      console.error('Failed to get response from Gemini:', error);
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please check your API key and try again.',
        timestamp: Timestamp.now(),
        metadata: {
          isError: true
        }
      };

      setCurrentSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, errorMessage],
          updatedAt: Timestamp.now(),
        };
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ChatInterface
      sessions={sessions}
      currentSession={currentSession}
      onSessionSelect={handleSessionSelect}
      onNewSession={handleNewSession}
      onSendMessage={handleSendMessage}
      loading={loading}
    />
  );
}
