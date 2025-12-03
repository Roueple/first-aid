import { useState, useEffect } from 'react';
import { ChatInterface } from '../../components/ChatInterface';
import { ChatSession } from '../../types/chat.types';
import { auditService } from '../../services/AuditService';
import { getGeminiStatus, ThinkingMode, setThinkingMode, getThinkingMode } from '../../services/GeminiService';
import { chatSessionService } from '../../services/ChatSessionService';
import { useAuth } from '../../contexts/AuthContext';
import { smartQueryRouter } from '../../services/SmartQueryRouter';
import { isQueryErrorResponse } from '../../types/queryRouter.types';
import { transparentLogger } from '../../services/TransparentLogger';

/**
 * ChatPage Component
 * 
 * Main page for AI chat functionality.
 * Integrates ChatInterface with session management.
 * 
 * Requirements: 6.1, 6.5
 */
export function ChatPage() {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState(getGeminiStatus());
  const [thinkingMode, setThinkingModeState] = useState<ThinkingMode>(getThinkingMode());

  // Load user's chat sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      if (!currentUser) {
        return;
      }

      try {
        const userSessions = await chatSessionService.getUserSessions(currentUser.uid, true);
        setSessions(userSessions);
        
        // Load the most recent session if available
        if (userSessions.length > 0) {
          setCurrentSession(userSessions[0]);
        }
      } catch (error) {
        console.error('Failed to load chat sessions:', error);
      }
    };

    loadSessions();
    setGeminiStatus(getGeminiStatus());
  }, [currentUser]);

  const handleThinkingModeChange = (mode: ThinkingMode) => {
    setThinkingMode(mode);
    setThinkingModeState(mode);
  };

  const handleSessionSelect = async (sessionId: string) => {
    try {
      const session = await chatSessionService.getSession(sessionId);
      if (session) {
        setCurrentSession(session);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const handleNewSession = async () => {
    if (!currentUser) {
      console.error('User must be logged in to create a session');
      return;
    }

    try {
      const newSession = await chatSessionService.createSession({
        userId: currentUser.uid,
        title: 'New Chat',
      });

      setSessions((prev) => [newSession, ...prev]);
      setCurrentSession(newSession);
    } catch (error) {
      console.error('Failed to create new session:', error);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!currentUser) {
      console.error('User must be logged in to send messages');
      return;
    }

    setLoading(true);

    try {
      // Create or get session
      let session = currentSession;
      
      if (!session) {
        // Create new session with message as title
        session = await chatSessionService.createSession({
          userId: currentUser.uid,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        });
        setSessions((prev) => [session!, ...prev]);
        setCurrentSession(session);
      }

      // Add user message to Firestore
      const updatedSession = await chatSessionService.addMessage({
        sessionId: session.id,
        role: 'user',
        content: message,
      });
      setCurrentSession(updatedSession);

      // Enable transparent logging for development
      transparentLogger.setEnabled(true);
      transparentLogger.setSessionId(session.id);
      
      // Log to console that we're starting
      console.log('%c🚀 Starting Smart Query Router V2 with Transparent Logging', 
        'color: #8b5cf6; font-size: 16px; font-weight: bold');
      console.log('%c📖 Open DevTools Console (F12 / Ctrl+Shift+I) to see the complete flow', 
        'color: #6366f1; font-size: 12px');
      
      // Route query through SmartQueryRouter (with transparent logging)
      const queryResponse = await smartQueryRouter.processQuery(message, {
        thinkingMode,
        sessionId: session.id,
      });

      // Handle error responses
      if (isQueryErrorResponse(queryResponse)) {
        const errorMessage = queryResponse.error.suggestion || queryResponse.error.message;
        
        // If we have fallback data, format it
        let responseContent = errorMessage;
        if (queryResponse.error.fallbackData && queryResponse.error.fallbackData.length > 0) {
          responseContent += '\n\n**Showing available results:**\n\n';
          queryResponse.error.fallbackData.slice(0, 10).forEach((finding) => {
            responseContent += `- **${finding.findingTitle}** (${finding.priorityLevel}, ${finding.status})\n`;
          });
        }
        
        // Add error response to Firestore
        const errorSession = await chatSessionService.addMessage({
          sessionId: session.id,
          role: 'assistant',
          content: responseContent,
          metadata: {
            isError: true,
            errorCode: queryResponse.error.code,
            queryType: queryResponse.metadata.queryType,
            executionTimeMs: queryResponse.metadata.executionTimeMs,
          },
        });
        setCurrentSession(errorSession);
        
        // Update sessions list
        setSessions((prev) =>
          prev.map((s) => (s.id === session!.id ? errorSession : s))
        );
        
        return;
      }

      // Format successful response with metadata
      const queryTypeIcon = 
        queryResponse.type === 'simple' ? '🔍' :
        queryResponse.type === 'complex' ? '🤖' :
        '🔍🤖';
      
      const queryTypeLabel = 
        queryResponse.type === 'simple' ? 'Database Search' :
        queryResponse.type === 'complex' ? 'AI Analysis' :
        'Hybrid Search';
      
      // Build response content with metadata
      let responseContent = queryResponse.answer;
      
      // Add metadata footer
      responseContent += `\n\n---\n`;
      responseContent += `${queryTypeIcon} **${queryTypeLabel}** | `;
      responseContent += `⏱️ ${queryResponse.metadata.executionTimeMs}ms | `;
      responseContent += `📊 ${queryResponse.metadata.findingsAnalyzed} findings`;
      
      if (queryResponse.metadata.tokensUsed) {
        responseContent += ` | 🎯 ${queryResponse.metadata.tokensUsed} tokens`;
      }

      // Add AI response to Firestore with metadata
      // Store findings data for table rendering
      const finalSession = await chatSessionService.addMessage({
        sessionId: session.id,
        role: 'assistant',
        content: responseContent,
        metadata: {
          processingTime: queryResponse.metadata.executionTimeMs / 1000,
          queryType: queryResponse.metadata.queryType,
          findingsAnalyzed: queryResponse.metadata.findingsAnalyzed,
          tokensUsed: queryResponse.metadata.tokensUsed,
          confidence: queryResponse.metadata.confidence,
          // Store findings for table rendering
          findings: queryResponse.fullFindings || [],
          findingSummaries: queryResponse.findings || [],
          totalCount: queryResponse.fullFindings?.length || queryResponse.findings?.length || 0,
          userQuery: message,
        },
      });
      setCurrentSession(finalSession);

      // Update sessions list
      setSessions((prev) =>
        prev.map((s) => (s.id === session!.id ? finalSession : s))
      );

      // Log AI query to audit logs
      await auditService.logAIQuery(
        session.id, 
        message, 
        queryResponse.metadata.executionTimeMs
      );
    } catch (error) {
      console.error('Failed to process query:', error);
      
      // Add error message to Firestore if we have a session
      if (currentSession) {
        try {
          const errorSession = await chatSessionService.addMessage({
            sessionId: currentSession.id,
            role: 'assistant',
            content: 'Sorry, I encountered an unexpected error while processing your request. Please try again.',
            metadata: {
              isError: true,
            },
          });
          setCurrentSession(errorSession);
        } catch (dbError) {
          console.error('Failed to save error message:', dbError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen">
      {/* Configuration Warning Banner */}
      {!geminiStatus.configured && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="flex items-center justify-center gap-2 text-sm">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-yellow-800 font-medium">
              Gemini API not configured: {geminiStatus.error || 'Please check your .env file'}
            </span>
          </div>
        </div>
      )}

      {/* Thinking Mode Selector */}
      {geminiStatus.configured && (
        <div className="absolute top-4 right-4 z-40">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-2 flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">Thinking Mode:</span>
            <div className="flex gap-1">
              <button
                onClick={() => handleThinkingModeChange('low')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  thinkingMode === 'low'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="Low thinking - Fast responses, ideal for high-throughput tasks"
              >
                ⚡ Low
              </button>
              <button
                onClick={() => handleThinkingModeChange('high')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  thinkingMode === 'high'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="High thinking - Deep reasoning for complex tasks"
              >
                🧠 High
              </button>
            </div>
          </div>
        </div>
      )}

      <ChatInterface
        sessions={sessions}
        currentSession={currentSession}
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewSession}
        onSendMessage={handleSendMessage}
        loading={loading}
      />
    </div>
  );
}
