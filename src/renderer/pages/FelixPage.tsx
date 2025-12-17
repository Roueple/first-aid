import { useState, useRef, useEffect } from 'react';
import { felixService } from '../../services/FelixService';
import FelixSessionService from '../../services/FelixSessionService';
import FelixChatService from '../../services/FelixChatService';
import { useAuth } from '../../contexts/AuthContext';
import FelixResultsTable from '../../components/FelixResultsTable';
import { AuditResultsTable } from '../../components/AuditResultsTable';
import { CatAnimation } from '../../components/ui/cat-animation';
import { FelixVanishInput } from '../../components/ui/felix-vanish-input';
import { PanelLeftClose, PanelLeft, Plus, Download, Copy, ChevronUp, MessageSquare, Trash2, Database, X } from 'lucide-react';

interface ProjectSuggestion {
  name: string;
  score: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  queryResult?: {
    resultsCount: number;
    results?: any[];
    table?: string;
    excelBuffer?: ArrayBuffer | Uint8Array;
    excelFilename?: string;
    needsConfirmation?: boolean;
    suggestions?: ProjectSuggestion[];
    originalQuery?: string;
  };
}

export default function FelixPage() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAuditTable, setShowAuditTable] = useState(false);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Note: Auto-auth removed - users must authenticate via passwordless login

  useEffect(() => {
    if (currentUser) {
      loadUserSessions();
    }
  }, [currentUser]);

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

  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSend = async (query?: string) => {
    const messageContent = query || input.trim();
    if (!messageContent || isLoading || !currentUser) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);

    try {
      const assistantMessageId = (Date.now() + 1).toString();
      let assistantContent = '';

      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }]);

      const stream = felixService.streamChat(
        userMessage.content,
        currentUser.uid,
        currentSessionId || undefined
      );

      let result: { sessionId: string; queryResult?: any } | undefined;
      let done = false;
      
      while (!done) {
        const { value, done: isDone } = await stream.next();
        done = isDone || false;
        
        if (!done && typeof value === 'string') {
          assistantContent += value;
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: assistantContent }
              : msg
          ));
        } else if (done && value) {
          result = value as { sessionId: string; queryResult?: any };
        }
      }

      if (result) {
        if (!currentSessionId) {
          setCurrentSessionId(result.sessionId);
        }

        if (result.queryResult) {
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { 
                  ...msg, 
                  queryResult: {
                    resultsCount: result.queryResult.resultsCount,
                    results: result.queryResult.results,
                    table: result.queryResult.table || 'audit-results',
                    excelBuffer: result.queryResult.excelBuffer,
                    excelFilename: result.queryResult.excelFilename,
                    needsConfirmation: result.queryResult.needsConfirmation,
                    suggestions: result.queryResult.suggestions,
                    originalQuery: result.queryResult.originalQuery
                  }
                }
              : msg
          ));
        }
      }

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

  const handleNewChat = async () => {
    if (!currentUser) return;
    try {
      if (currentSessionId) {
        await FelixSessionService.deactivateSession(currentSessionId);
      }
      setCurrentSessionId(null);
      setMessages([]);
      setInput('');
      await loadUserSessions();
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleDownloadExcel = (excelBuffer: ArrayBuffer | Uint8Array, filename: string) => {
    try {
      const buffer = excelBuffer instanceof Uint8Array 
        ? new Uint8Array(excelBuffer) 
        : new Uint8Array(excelBuffer);
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading Excel:', error);
    }
  };

  const handleLoadSession = async (sessionId: string) => {
    try {
      if (currentSessionId) {
        await FelixSessionService.deactivateSession(currentSessionId);
      }
      setCurrentSessionId(sessionId);
      await loadSessionMessages(sessionId);
      await FelixSessionService.updateActivity(sessionId);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleConfirmProject = async (projectName: string, originalQuery: string) => {
    if (!currentUser || !currentSessionId) return;
    
    setIsLoading(true);
    try {
      const result = await felixService.executeConfirmedQuery(
        originalQuery,
        projectName,
        currentUser.uid,
        currentSessionId
      );

      if (result.queryResult) {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: result.queryResult.message,
          timestamp: new Date(),
          queryResult: {
            resultsCount: result.queryResult.resultsCount,
            results: result.queryResult.results,
            table: result.queryResult.table || 'audit-results',
            excelBuffer: result.queryResult.excelBuffer,
            excelFilename: result.queryResult.excelFilename
          }
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error executing confirmed query:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    try {
      await FelixSessionService.deleteSession(sessionId);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      await loadUserSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
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

  if (!currentUser) {
    return (
      <div className="felix-page felix-loading">
        <div className="felix-loading-content">
          <span className="felix-loading-icon">🔐</span>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`felix-page ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Sidebar */}
      <aside className={`felix-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="felix-sidebar-header">
          <button className="felix-new-chat-btn" onClick={handleNewChat}>
            <Plus size={18} />
            <span>New chat</span>
          </button>
          <button 
            className="felix-sidebar-toggle" 
            onClick={() => setSidebarOpen(false)}
            title="Close sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
        
        <div className="felix-sidebar-content">
          <button 
            className="felix-data-btn"
            onClick={() => setShowAuditTable(true)}
            title="View all audit results"
          >
            <Database size={16} />
            <span>All Audit Data</span>
          </button>
          
          <div className="felix-sidebar-label">Recent</div>
          <div className="felix-history-list">
            {sessions.length === 0 ? (
              <div className="felix-history-empty">No chat history yet</div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className={`felix-history-item ${session.id === currentSessionId ? 'active' : ''}`}
                >
                  <button
                    className="felix-history-item-btn"
                    onClick={() => handleLoadSession(session.id)}
                  >
                    <MessageSquare size={16} className="felix-history-icon" />
                    <div className="felix-history-info">
                      <div className="felix-history-title">{session.title || 'New Chat'}</div>
                      <div className="felix-history-meta">{formatSessionDate(session.lastActivityAt)}</div>
                    </div>
                  </button>
                  <button 
                    className="felix-delete-btn"
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    title="Delete chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Sidebar Toggle (when closed) */}
      {!sidebarOpen && (
        <button 
          className="felix-sidebar-open-btn"
          onClick={() => setSidebarOpen(true)}
          title="Open sidebar"
        >
          <PanelLeft size={20} />
        </button>
      )}

      {/* Main Content */}
      <div className="felix-main">
        <div className="felix-content" ref={chatAreaRef}>
          {messages.length === 0 ? (
            /* Welcome Screen */
            <div className="felix-welcome">
              <CatAnimation size={140} className="felix-cat" />
              <h1 className="felix-greeting">
                Hello {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'}, What can Felix do for you?
              </h1>
              <div className="w-full max-w-2xl px-4">
                <FelixVanishInput 
                  onSubmit={handleSend}
                  disabled={isLoading}
                />
              </div>
            </div>
          ) : (
            /* Chat View */
            <>
              <div className="felix-messages">
                {messages.map((message) => (
                  <div key={message.id} className={`felix-message ${message.role}`}>
                    {message.role === 'user' ? (
                      <div className="felix-user-message">{message.content}</div>
                    ) : (
                      <div className="felix-assistant-message">
                        {message.content ? (
                          <div className="felix-message-text">{message.content}</div>
                        ) : isStreaming ? (
                          <div className="felix-typing">
                            <span></span><span></span><span></span>
                          </div>
                        ) : null}
                        
                        {message.queryResult?.needsConfirmation && message.queryResult.suggestions && (
                          <div className="felix-confirmation">
                            <div className="felix-suggestions">
                              {message.queryResult.suggestions.map((suggestion, idx) => (
                                <button
                                  key={idx}
                                  className="felix-suggestion-btn"
                                  onClick={() => handleConfirmProject(
                                    suggestion.name,
                                    message.queryResult!.originalQuery || ''
                                  )}
                                  disabled={isLoading}
                                >
                                  <span className="felix-suggestion-name">{suggestion.name}</span>
                                  <span className="felix-suggestion-score">
                                    {Math.round(suggestion.score * 100)}% match
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {message.queryResult?.results && message.queryResult.results.length > 0 && (
                          <div className="felix-results">
                            <FelixResultsTable 
                              results={message.queryResult.results}
                              table={message.queryResult.table || 'audit-results'}
                              maxRows={20}
                            />
                          </div>
                        )}
                        
                        {(message.content || message.queryResult?.excelBuffer) && !message.queryResult?.needsConfirmation && (
                          <div className="felix-message-actions">
                            {message.content && (
                              <button 
                                className="felix-action-btn"
                                onClick={() => handleCopyMessage(message.content)}
                              >
                                <Copy size={14} /> Copy
                              </button>
                            )}
                            {message.queryResult?.excelBuffer && (
                              <button
                                className="felix-action-btn felix-download"
                                onClick={() => handleDownloadExcel(
                                  message.queryResult!.excelBuffer!,
                                  message.queryResult!.excelFilename || 'results.xlsx'
                                )}
                              >
                                <Download size={14} /> Download Excel
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && !isStreaming && (
                  <div className="felix-message assistant">
                    <div className="felix-assistant-message">
                      <div className="felix-typing">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Input */}
              <div className="felix-bottom-input">
                <div className="felix-input-container">
                  <textarea
                    ref={inputRef}
                    className="felix-input"
                    placeholder="How can I help you today?"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={isLoading}
                  />
                  <div className="felix-input-actions">
                    <button 
                      className="felix-send-btn"
                      onClick={() => handleSend()}
                      disabled={!input.trim() || isLoading}
                    >
                      <ChevronUp size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Audit Results Modal */}
      {showAuditTable && (
        <div className="felix-modal-overlay" onClick={() => setShowAuditTable(false)}>
          <div className="felix-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="felix-modal-close"
              onClick={() => setShowAuditTable(false)}
            >
              <X size={20} />
            </button>
            <AuditResultsTable />
          </div>
        </div>
      )}
    </div>
  );
}
