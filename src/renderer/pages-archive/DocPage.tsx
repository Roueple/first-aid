import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { initializeDocAI, sendDocQuery, getSessionHistory, startNewSession } from '../../services/DocAIService';
import { ChatMessage } from '../../components/ChatMessage';
import { ChatInput } from '../../components/ChatInput';
import BlurFade from '../../components/magicui/blur-fade';
import TypingAnimation from '../../components/magicui/typing-animation';
import { Meteors } from '../../components/magicui/meteors';
import '../styles/chat.css';

/**
 * DocPage Component
 * 
 * AI assistant with full session tracking and history
 * Integrated with DocAI services for complete conversation management
 */

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SessionInfo {
  id: string;
  title: string;
  lastActivity: Date;
  messageCount: number;
}

export function DocPage() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [queryMode, setQueryMode] = useState<'filter' | 'analyze'>('filter');
  const [lastFilterResult, setLastFilterResult] = useState<any>(null);
  const [pendingIntent, setPendingIntent] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Doc AI on mount
    const initialized = initializeDocAI();
    setAiReady(initialized);
    
    // Load existing session history if available
    if (initialized && currentUser?.uid) {
      loadSessionHistory();
      loadAllSessions();
    }
  }, [currentUser]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSessionHistory = async (specificSessionId?: string) => {
    if (!currentUser?.uid) return;
    
    try {
      // Get active session and load its history
      const docSessionService = (await import('../../services/DocSessionService')).default;
      const targetSession = specificSessionId 
        ? await docSessionService.getById(specificSessionId)
        : await docSessionService.getActiveSession(currentUser.uid);
      
      if (targetSession) {
        setSessionId(targetSession.id);
        const { chats } = await getSessionHistory(targetSession.id!, currentUser.uid);
        
        // Convert to UI message format
        const uiMessages: Message[] = chats.map(chat => ({
          id: chat.id || Date.now().toString(),
          role: chat.role,
          content: chat.message,
          timestamp: chat.timestamp.toDate(),
        }));
        
        setMessages(uiMessages);
        console.log(`📜 Loaded ${uiMessages.length} messages from session: ${targetSession.id}`);
      }
    } catch (error) {
      console.error('Error loading session history:', error);
    }
  };

  const loadAllSessions = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const docSessionService = (await import('../../services/DocSessionService')).default;
      const userSessions = await docSessionService.getUserSessions(currentUser.uid, 20);
      
      const sessionInfos: SessionInfo[] = userSessions.map(session => ({
        id: session.id!,
        title: session.title || 'Untitled Session',
        lastActivity: session.lastActivityAt.toDate(),
        messageCount: session.messageCount,
      }));
      
      setSessions(sessionInfos);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const handleNewChat = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const newSessionId = await startNewSession(currentUser.uid);
      setSessionId(newSessionId);
      setMessages([]);
      await loadAllSessions();
      console.log('🆕 Started new chat session');
    } catch (error) {
      console.error('Error starting new chat:', error);
    }
  };

  const handleLoadSession = async (sessionId: string) => {
    await loadSessionHistory(sessionId);
    setShowSidebar(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentUser?.uid) return;

    const userMessage = input.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    setInput('');
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      if (queryMode === 'filter') {
        // FILTER MODE: Use DocAISimpleQueryService
        const { DocAISimpleQueryService } = await import('../../services/DocAISimpleQueryService');
        const simpleQueryService = new DocAISimpleQueryService();
        
        // Process query (handles both initial queries and confirmations)
        const activeSessionId = sessionId || await (await import('../../services/DocSessionService')).default.getOrCreateSession(currentUser.uid);
        const result = await simpleQueryService.processQuery(userMessage, currentUser.uid, activeSessionId);
        
        // Show result message
        const resultsMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.message,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, resultsMsg]);
        
        // Store in session
        const docChatService = (await import('../../services/DocChatService')).default;
        await docChatService.addUserMessage(activeSessionId, currentUser.uid, userMessage);
        await docChatService.addAssistantResponse(
          activeSessionId,
          currentUser.uid,
          result.message,
          {
            thinkingMode: 'none',
            responseTime: result.metadata.executionTime,
            queryType: 'simple_query',
            success: result.success,
            resultsCount: result.resultsCount,
            metadata: { mode: 'filter', filters: result.metadata.extractedFilters },
          }
        );
        
        // If we have Excel data, store it for download
        if (result.excelBuffer && result.excelFilename) {
          setLastFilterResult({
            results: [], // Not needed for new service
            totalCount: result.resultsCount,
            executionTime: result.metadata.executionTime,
            excelBuffer: result.excelBuffer,
            excelFilename: result.excelFilename,
          });
        }
        
        setIsLoading(false);
        return;
      } else {
        // ANALYZE MODE: Use existing DocAI service (complex queries)
        const responseText = await sendDocQuery(
          userMessage,
          currentUser.uid,
          'low',
          sessionId || undefined
        );
        
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseText,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
      
      // Update session ID if it was just created
      const isNewSession = !sessionId;
      if (isNewSession) {
        const docSessionService = (await import('../../services/DocSessionService')).default;
        const activeSession = await docSessionService.getActiveSession(currentUser.uid);
        if (activeSession) {
          setSessionId(activeSession.id);
        }
      }
      
      // Reload sessions to show updated title
      setTimeout(() => {
        loadAllSessions();
      }, isNewSession ? 2500 : 500);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const suggestions = [
    { icon: '📊', text: 'Analyze my audit findings', description: 'Get insights from recent audits', color: 'from-blue-500/20 to-cyan-500/20', hoverColor: 'group-hover:from-blue-500/30 group-hover:to-cyan-500/30', borderColor: 'group-hover:border-blue-500/50' },
    { icon: '🔍', text: 'Search for high priority items', description: 'Find critical issues needing attention', color: 'from-purple-500/20 to-pink-500/20', hoverColor: 'group-hover:from-purple-500/30 group-hover:to-pink-500/30', borderColor: 'group-hover:border-purple-500/50' },
    { icon: '📈', text: 'Show me project statistics', description: 'View progress and completion rates', color: 'from-green-500/20 to-emerald-500/20', hoverColor: 'group-hover:from-green-500/30 group-hover:to-emerald-500/30', borderColor: 'group-hover:border-green-500/50' },
    { icon: '💡', text: 'Suggest improvements', description: 'AI-driven recommendations', color: 'from-orange-500/20 to-red-500/20', hoverColor: 'group-hover:from-orange-500/30 group-hover:to-red-500/30', borderColor: 'group-hover:border-orange-500/50' },
  ];

  return (
    <div className="h-screen flex bg-white overflow-hidden font-sans text-slate-900">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-80' : 'w-0'} transition-all duration-300 border-r border-slate-200 bg-slate-50 overflow-hidden flex flex-col`}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Chat History</h2>
          <button
            onClick={() => setShowSidebar(false)}
            className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => handleLoadSession(session.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                session.id === sessionId 
                  ? 'bg-indigo-100 border border-indigo-300' 
                  : 'bg-white hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <div className="font-medium text-sm text-slate-900 truncate">{session.title}</div>
              <div className="text-xs text-slate-500 mt-1">
                {session.messageCount} messages • {new Date(session.lastActivity).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Toggle sidebar"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full ${aiReady ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Doc Assistant</h1>
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${aiReady ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              {aiReady ? 'AI Ready' : 'Connecting...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleNewChat}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-700">{currentUser?.email?.split('@')[0]}</p>
            <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">Online</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 p-[2px] shadow-sm">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-slate-700 font-bold text-sm">
              {currentUser?.email?.[0].toUpperCase()}
            </div>
          </div>
        </div>
      </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto relative scroll-smooth">
        <div className="max-w-4xl mx-auto px-4 py-8 min-h-full flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
              <Meteors number={30} />

              <BlurFade delay={0.1} inView>
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/30 mx-auto transform transition-transform hover:scale-105 duration-500">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
              </BlurFade>

              <div className="mb-10 space-y-3">
                <TypingAnimation
                  text="How can I help you today?"
                  className="text-4xl font-bold text-slate-900 tracking-tight"
                  duration={50}
                />
                <BlurFade delay={0.3} inView>
                  <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
                    I can analyze your audit findings, track project progress, and provide intelligent insights from your documentation.
                  </p>
                </BlurFade>
              </div>

              {/* Suggested prompts menu */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl px-4">
                {suggestions.map((prompt, idx) => (
                  <BlurFade key={idx} delay={0.4 + (idx * 0.1)} inView>
                    <button
                      onClick={() => handleSuggestedPrompt(prompt.text)}
                      className={`group relative flex items-start gap-4 p-5 rounded-2xl border border-slate-200 bg-white/50 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 w-full text-left overflow-hidden ${prompt.borderColor}`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${prompt.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                      <div className="relative z-10 w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-300">
                        {prompt.icon}
                      </div>
                      <div className="relative z-10 flex-1">
                        <h3 className="font-semibold text-slate-900 group-hover:text-indigo-900 transition-colors">{prompt.text}</h3>
                        <p className="text-sm text-slate-500 group-hover:text-indigo-800/70 transition-colors mt-0.5">{prompt.description}</p>
                      </div>
                      <div className="relative z-10 self-center opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  </BlurFade>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {messages.map((message) => (
                <BlurFade key={message.id} inView>
                  <ChatMessage
                    role={message.role}
                    content={message.content}
                    timestamp={message.timestamp}
                    userName={currentUser?.email?.split('@')[0]}
                  />
                </BlurFade>
              ))}

              {isLoading && (
                <div className="flex items-center gap-4 animate-fadeIn pl-4">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <div className="flex gap-1.5 items-center bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    <span className="text-xs font-medium text-slate-400 ml-2">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white/80 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)] px-6 py-6 z-20">
        <div className="max-w-4xl mx-auto">
          {/* Download Button */}
          {lastFilterResult && lastFilterResult.totalCount > 0 && lastFilterResult.excelBuffer && (
            <div className="mb-3">
              <button
                onClick={() => {
                  // Download the Excel file
                  const blob = new Blob([lastFilterResult.excelBuffer], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = lastFilterResult.excelFilename || `audit-results-${new Date().toISOString().split('T')[0]}.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-emerald-500/30"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Full Results ({lastFilterResult.totalCount} rows) as XLSX
              </button>
            </div>
          )}
          
          {/* Mode Selector */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setQueryMode('filter')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                queryMode === 'filter'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter Mode
              </div>
              <div className="text-xs opacity-80 mt-0.5">Fast, accurate queries</div>
            </button>
            <button
              onClick={() => setQueryMode('analyze')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                queryMode === 'analyze'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Analyze Mode
              </div>
              <div className="text-xs opacity-80 mt-0.5">Complex analysis (TBD)</div>
            </button>
          </div>

          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            disabled={isLoading}
            placeholder={queryMode === 'filter' 
              ? "e.g., Show all IT findings in 2024" 
              : "Ask Doc anything about your audit findings, projects, or get insights..."}
          />

          <div className="flex items-center justify-between mt-3 px-1">
            <span className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
              <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-500 font-sans">
                <span>↵</span>
                Return
              </kbd>
              to send
              <span className="mx-1 text-slate-300">|</span>
              <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-500 font-sans">
                <span>⇧</span>
                Return
              </kbd>
              for new line
            </span>
            <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className={`w-2 h-2 rounded-full ${aiReady ? 'bg-emerald-500' : 'bg-amber-500'} shadow-sm`}></span>
              {messages.length} messages
            </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

