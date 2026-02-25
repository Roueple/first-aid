import { useState, useRef, useEffect } from 'react';
import { felixService } from '../../services/FelixService';
import FelixSessionService from '../../services/FelixSessionService';
import FelixChatService from '../../services/FelixChatService';
import FelixGreetingService from '../../services/FelixGreetingService';
import OnboardingService from '../../services/OnboardingService';
import authService from '../../services/AuthService';
import { useAuth } from '../../contexts/AuthContext';
import FelixResultsTable from '../../components/FelixResultsTable';
import { FelixAggregationChart } from '../../components/FelixAggregationChart';
import { ReportChatDialog } from '../../components/ReportChatDialog';
import { ConfirmDeleteDialog } from '../../components/ConfirmDeleteDialog';
import { UserSettingsDialog } from '../../components/UserSettingsDialog';
import { FirstTimeSetupDialog } from '../../components/FirstTimeSetupDialog';
import { OnboardingTutorial } from '../../components/OnboardingTutorial';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';
import { CatAnimation } from '../../components/ui/cat-animation';
import { FelixVanishInput } from '../../components/ui/felix-vanish-input';
import { PanelLeftClose, PanelLeft, Plus, Download, Copy, ChevronUp, MessageSquare, Trash2, X, Flag, Settings } from 'lucide-react';

interface ProjectSuggestion {
  name: string;
  score: number;
}

interface AggregationResult {
  groupBy: string | string[];
  groupValue: string | number | Record<string, string | number>;
  count: number;
  sum?: number;
  avg?: number;
  min?: number;
  max?: number;
  filters?: any[]; // Filters to fetch underlying data
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  queryResult?: {
    resultsCount: number;
    results?: any[];
    aggregatedResults?: AggregationResult[];
    table?: string;
    excelBuffer?: ArrayBuffer | Uint8Array;
    excelFilename?: string;
    needsConfirmation?: boolean;
    suggestions?: ProjectSuggestion[];
    originalQuery?: string;
    isAggregated?: boolean;
    aggregationType?: string;
    groupByField?: string | string[];
    yearAggregation?: AggregationResult[];
  };
}

export default function FelixPage() {
  const { currentUser } = useAuth();
  const canDownloadExcel = authService.canDownloadExcel(currentUser);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showFirstTimeSetup, setShowFirstTimeSetup] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isTutorialManualRestart, setIsTutorialManualRestart] = useState(false);
  const [tutorialDemoQuery, setTutorialDemoQuery] = useState<string | undefined>(undefined);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [aggregationDetails, setAggregationDetails] = useState<{
    results: any[];
    excelBuffer: ArrayBuffer;
    excelFilename: string;
    groupValue: string | number | Record<string, string | number>;
  } | null>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Note: Auto-auth removed - users must authenticate via passwordless login

  useEffect(() => {
    if (currentUser) {
      loadUserSessions();
      loadPersonalizedGreeting();
      checkFirstTimeSetup();
      checkTutorialStatus();
    }
  }, [currentUser]);

  const checkFirstTimeSetup = () => {
    if (!currentUser) return;
    
    // Check if user has a default display name (email-based) or no display name
    const hasDefaultName = !currentUser.displayName || 
                          currentUser.displayName === currentUser.email?.split('@')[0];
    
    // Check if user has already been prompted (stored in localStorage)
    const hasBeenPrompted = localStorage.getItem(`firstTimeSetup_${currentUser.uid}`);
    
    if (hasDefaultName && !hasBeenPrompted) {
      setShowFirstTimeSetup(true);
    }
  };

  const checkTutorialStatus = async () => {
    if (!currentUser) return;
    
    try {
      // Check if tutorial should be shown (Requirements 9.2-9.5, 10.2-10.5)
      const shouldShow = await OnboardingService.shouldShowTutorial(currentUser.uid);
      
      if (shouldShow) {
        // If tutorial should show, it's a resume (not manual restart)
        setIsTutorialManualRestart(false);
        setShowTutorial(true);
      }
    } catch (error) {
      console.error('Error checking tutorial status:', error);
      // Don't show tutorial on error
    }
  };

  const handleFirstTimeSetupComplete = () => {
    if (currentUser) {
      localStorage.setItem(`firstTimeSetup_${currentUser.uid}`, 'true');
    }
    setShowFirstTimeSetup(false);
    // Start tutorial after setup completes (Requirements 1.1-1.3)
    setIsTutorialManualRestart(false);
    setShowTutorial(true);
  };

  const handleTutorialComplete = async () => {
    if (!currentUser) return;
    
    try {
      // Mark tutorial as completed in Firebase (Requirements 9.4, 10.4)
      await OnboardingService.completeTutorial(currentUser.uid);
    } catch (error) {
      console.error('Error completing tutorial:', error);
      // Continue even if Firebase save fails
    }
    
    setShowTutorial(false);
    setIsTutorialManualRestart(false);
  };

  const handleTutorialRestart = async () => {
    if (!currentUser) return;
    
    try {
      // Reset tutorial state for manual restart (Requirements 10.1-10.5)
      await OnboardingService.resetTutorial(currentUser.uid);
      setIsTutorialManualRestart(true);
      setShowTutorial(true);
      setShowSettingsDialog(false);
    } catch (error) {
      console.error('Error restarting tutorial:', error);
      // Could show error toast here
    }
  };

  const loadPersonalizedGreeting = async () => {
    if (!currentUser) return;
    try {
      const personalizedGreeting = await FelixGreetingService.getGreeting(
        currentUser.uid,
        currentUser.displayName
      );
      setGreeting(personalizedGreeting);
    } catch (error) {
      console.error('Error loading greeting:', error);
      // Fallback to simple greeting
      setGreeting(`Hello ${currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}, What can Felix do for you?`);
    }
  };

  const getGreetingClass = () => {
    if (!greeting) return 'medium';
    const length = greeting.length;
    if (length < 50) return 'short';
    if (length < 100) return 'medium';
    return 'long';
  };

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
        queryResult: chat.queryResult ? {
          resultsCount: chat.queryResult.resultsCount || 0,
          results: chat.queryResult.results,
          aggregatedResults: chat.queryResult.aggregatedResults,
          table: chat.queryResult.table,
          needsConfirmation: chat.queryResult.needsConfirmation,
          suggestions: chat.queryResult.suggestions,
          originalQuery: chat.queryResult.originalQuery,
          isAggregated: chat.queryResult.isAggregated,
          aggregationType: chat.queryResult.aggregationType,
          groupByField: chat.queryResult.groupByField,
          yearAggregation: chat.queryResult.yearAggregation,
        } : undefined,
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
    
    // Extract context from query for better status messages
    const queryLower = messageContent.toLowerCase();
    const hasProject = queryLower.match(/\b(sh\d+|[a-z]{2,4}\d*)\b/i);
    const hasDepartment = queryLower.match(/\b(it|legal|finance|hr|marketing|sales|operations)\b/i);
    
    setLoadingStatus('Felix sedang berpikir...');

    try {
      const assistantMessageId = (Date.now() + 1).toString();
      let assistantContent = '';

      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }]);

      // More contextual status
      setTimeout(() => {
        if (hasProject) {
          setLoadingStatus(`Felix sedang mencari di ${hasProject[0].toUpperCase()}...`);
        } else if (hasDepartment) {
          setLoadingStatus(`Felix sedang menganalisis ${hasDepartment[0]}...`);
        } else {
          setLoadingStatus('Felix sedang mencari data...');
        }
      }, 500);
      
      const stream = felixService.streamChat(
        userMessage.content,
        currentUser.uid,
        currentSessionId || undefined
      );

      let result: { sessionId: string; queryResult?: any } | undefined;
      let done = false;
      let hasStartedStreaming = false;
      
      while (!done) {
        const { value, done: isDone } = await stream.next();
        done = isDone || false;
        
        if (!done && typeof value === 'string') {
          if (!hasStartedStreaming) {
            // Check if we got results
            if (result?.queryResult?.resultsCount !== undefined) {
              const count = result.queryResult.resultsCount;
              setLoadingStatus(count > 0 ? `Felix menemukan ${count} hasil ✓` : 'Tidak ada hasil ditemukan');
            } else {
              setLoadingStatus('Felix menyiapkan hasil...');
            }
            hasStartedStreaming = true;
          }
          assistantContent += value;
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: assistantContent }
              : msg
          ));
        } else if (done && value) {
          result = value as { sessionId: string; queryResult?: any };
          
          // Update status with actual results
          if (result.queryResult?.resultsCount !== undefined) {
            const count = result.queryResult.resultsCount;
            if (count > 0) {
              setLoadingStatus(`Felix menemukan ${count} hasil ✓`);
            }
          }
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
                    aggregatedResults: result.queryResult.aggregatedResults,
                    table: result.queryResult.table || 'audit-results',
                    excelBuffer: result.queryResult.excelBuffer,
                    excelFilename: result.queryResult.excelFilename,
                    needsConfirmation: result.queryResult.needsConfirmation,
                    suggestions: result.queryResult.suggestions,
                    originalQuery: result.queryResult.originalQuery,
                    isAggregated: result.queryResult.isAggregated,
                    aggregationType: result.queryResult.aggregationType,
                    groupByField: result.queryResult.groupByField,
                    yearAggregation: result.queryResult.yearAggregation,
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
      setLoadingStatus('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow standard Windows shortcuts to pass through
    if (e.ctrlKey || e.metaKey) {
      // Don't prevent default for Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Ctrl+F, etc.
      return;
    }
    
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
      await loadPersonalizedGreeting(); // Refresh greeting for new chat
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

  const handleCopyMessage = (message: Message) => {
    let textToCopy = message.content;

    // Add aggregation results if present
    if (message.queryResult?.aggregatedResults && message.queryResult.aggregatedResults.length > 0) {
      textToCopy += '\n\n📊 Aggregation Results:\n';
      textToCopy += `Grouped by: ${message.queryResult.groupByField}\n`;
      textToCopy += `Type: ${message.queryResult.aggregationType}\n\n`;

      // Create table header
      const groupByFields = Array.isArray(message.queryResult.groupByField) 
        ? message.queryResult.groupByField 
        : [message.queryResult.groupByField || 'group'];
      
      const headers = [...groupByFields, 'Count'];
      const firstRow = message.queryResult.aggregatedResults[0];
      if (firstRow.sum !== undefined) headers.push('Sum');
      if (firstRow.avg !== undefined) headers.push('Average');
      if (firstRow.min !== undefined) headers.push('Min');
      if (firstRow.max !== undefined) headers.push('Max');
      
      textToCopy += headers.join('\t') + '\n';
      textToCopy += headers.map(() => '---').join('\t') + '\n';

      // Add data rows
      message.queryResult.aggregatedResults.forEach(row => {
        const values: string[] = [];
        
        if (typeof row.groupValue === 'object' && !Array.isArray(row.groupValue)) {
          groupByFields.forEach(field => {
            const groupValueObj = row.groupValue as Record<string, string | number>;
            values.push(String(groupValueObj[field] || ''));
          });
        } else {
          values.push(String(row.groupValue));
        }
        
        values.push(String(row.count));
        if (row.sum !== undefined) values.push(row.sum.toFixed(2));
        if (row.avg !== undefined) values.push(row.avg.toFixed(2));
        if (row.min !== undefined) values.push(String(row.min));
        if (row.max !== undefined) values.push(String(row.max));
        
        textToCopy += values.join('\t') + '\n';
      });
    }

    // Add regular table results if present - only specific columns
    if (message.queryResult?.results && message.queryResult.results.length > 0 && !message.queryResult.isAggregated) {
      textToCopy += '\n\n📋 Results Table:\n';
      textToCopy += `Total: ${message.queryResult.resultsCount} findings\n\n`;

      const results = message.queryResult.results;
      if (results.length > 0) {
        // Only include specific columns
        const allowedColumns = ['sh', 'projectName', 'year', 'department', 'riskArea', 'description'];
        const headers = allowedColumns.filter(col => 
          results.some(result => result[col] !== undefined)
        );
        
        textToCopy += headers.join('\t') + '\n';
        textToCopy += headers.map(() => '---').join('\t') + '\n';
        
        results.forEach(result => {
          const values = headers.map(header => {
            const value = result[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value);
          });
          textToCopy += values.join('\t') + '\n';
        });
      }
    }

    navigator.clipboard.writeText(textToCopy);
  };

  const handleConfirmProject = async (projectName: string, originalQuery: string) => {
    if (!currentUser || !currentSessionId) return;
    
    setIsLoading(true);
    setLoadingStatus(`Felix sedang mencari di ${projectName}...`);
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
            excelFilename: result.queryResult.excelFilename,
            yearAggregation: result.queryResult.yearAggregation,
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
      setLoadingStatus('');
    }
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToDelete(sessionId);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!currentUser || !sessionToDelete) return;
    
    setIsDeleting(true);
    try {
      await FelixSessionService.deleteSession(sessionToDelete);
      if (currentSessionId === sessionToDelete) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      await loadUserSessions();
      setShowDeleteDialog(false);
      setSessionToDelete(null);
    } catch (error) {
      console.error('Error deleting session:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setSessionToDelete(null);
  };

  const handleAggregationRowClick = async (aggregationResult: AggregationResult) => {
    if (!aggregationResult.filters) return;
    
    setIsLoading(true);
    try {
      const details = await felixService.fetchAggregationGroupDetails(
        aggregationResult.filters,
        'audit-results'
      );
      
      setAggregationDetails({
        results: details.results,
        excelBuffer: details.excelBuffer,
        excelFilename: details.excelFilename,
        groupValue: aggregationResult.groupValue,
      });
    } catch (error) {
      console.error('Error fetching aggregation details:', error);
    } finally {
      setIsLoading(false);
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

  const renderGreeting = (text: string) => {
    // Parse **text** markdown for bold
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return <strong key={index}>{boldText}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
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
      {/* Theme Switcher */}
      <div>
        <ThemeSwitcher />
      </div>

      {/* Sidebar */}
      <aside className={`felix-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="felix-sidebar-header">
          <button className="felix-new-chat-btn" onClick={handleNewChat} data-tutorial="new-chat-btn">
            <Plus size={18} />
            <span>New chat</span>
          </button>
          <button 
            className="felix-sidebar-toggle" 
            onClick={() => setSidebarOpen(false)}
            title="Close sidebar"
            data-tutorial="sidebar-close-btn"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
        
        <div className="felix-sidebar-content">
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

        <div className="felix-sidebar-footer">
          <button 
            className="felix-settings-btn"
            onClick={() => setShowSettingsDialog(true)}
            title="User Settings"
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
          <button 
            className="felix-settings-btn"
            onClick={() => setShowReportDialog(true)}
            title="Send Feedback"
          >
            <Flag size={18} />
            <span>Feedback</span>
          </button>
        </div>
      </aside>

      {/* Sidebar Toggle (when closed) */}
      {!sidebarOpen && (
        <button 
          className="felix-sidebar-open-btn"
          onClick={() => setSidebarOpen(true)}
          title="Open sidebar"
          data-tutorial="hamburger-menu"
        >
          <PanelLeft size={20} />
        </button>
      )}
      
      {/* Felix Brand - always visible, moves with sidebar */}
      <div 
        className="felix-page-brand" 
        style={{ left: sidebarOpen ? '280px' : '4rem' }}
      >
        Felix
      </div>

      {/* Main Content */}
      <div className="felix-main">
        <div className="felix-content" ref={chatAreaRef} data-tutorial="chat-area">
          {messages.length === 0 ? (
            /* Welcome Screen */
            <div className="felix-welcome" data-tutorial="welcome-screen">
              <CatAnimation size={140} className="felix-cat" />
              {greeting !== null && (
                <h1 className={`felix-greeting ${getGreetingClass()}`}>
                  {renderGreeting(greeting)}
                </h1>
              )}
              <div className="w-full max-w-2xl px-4">
                {loadingStatus && (
                  <div className="felix-loading-status" data-tutorial="loading-indicator">
                    <span className="felix-loading-dot"></span>
                    <span className="felix-loading-text">{loadingStatus}</span>
                  </div>
                )}
                <FelixVanishInput 
                  onSubmit={handleSend}
                  disabled={isLoading}
                  initialValue={tutorialDemoQuery}
                  data-tutorial="input-field"
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
                        ) : isStreaming && loadingStatus ? (
                          <div className="felix-loading-status-inline" data-tutorial="loading-indicator">
                            <span className="felix-loading-dot"></span>
                            <span className="felix-loading-text">{loadingStatus}</span>
                          </div>
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

                        {message.queryResult?.results && message.queryResult.results.length > 0 && !message.queryResult.isAggregated && (
                          <div className="felix-results">
                            {/* Auto-generated year chart for audit-results */}
                            {message.queryResult.yearAggregation && message.queryResult.yearAggregation.length > 0 && (
                              <div className="felix-auto-chart mb-4">
                                <FelixAggregationChart
                                  data={message.queryResult.yearAggregation}
                                  groupByField="year"
                                  aggregationType="count"
                                />
                              </div>
                            )}
                            
                            <FelixResultsTable 
                              results={message.queryResult.results}
                              table={message.queryResult.table || 'audit-results'}
                              maxRows={20}
                            />
                          </div>
                        )}

                        {message.queryResult?.aggregatedResults && message.queryResult.aggregatedResults.length > 0 && (
                          <div className="felix-results felix-aggregated-results">
                            <div className="felix-aggregation-header">
                              <span className="felix-aggregation-label">
                                📊 Grouped by: <strong>{message.queryResult.groupByField}</strong>
                              </span>
                              <span className="felix-aggregation-type">
                                {message.queryResult.aggregationType}
                              </span>
                            </div>
                            
                            {/* Smart Chart Visualization */}
                            <FelixAggregationChart
                              data={message.queryResult.aggregatedResults}
                              groupByField={message.queryResult.groupByField || 'group'}
                              aggregationType={message.queryResult.aggregationType}
                            />
                            
                            <div className="felix-aggregation-table">
                              <table>
                                <thead>
                                  <tr>
                                    {Array.isArray(message.queryResult?.groupByField) ? (
                                      message.queryResult.groupByField.map((field: string) => (
                                        <th key={field}>{field}</th>
                                      ))
                                    ) : (
                                      <th>{message.queryResult?.groupByField}</th>
                                    )}
                                    <th>Count</th>
                                    {message.queryResult?.aggregatedResults[0].sum !== undefined && <th>Sum</th>}
                                    {message.queryResult?.aggregatedResults[0].avg !== undefined && <th>Average</th>}
                                    {message.queryResult?.aggregatedResults[0].min !== undefined && <th>Min</th>}
                                    {message.queryResult?.aggregatedResults[0].max !== undefined && <th>Max</th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {message.queryResult.aggregatedResults.map((row, idx) => {
                                    const isMultiDimensional = typeof row.groupValue === 'object' && !Array.isArray(row.groupValue);
                                    const groupByFields = Array.isArray(message.queryResult?.groupByField) 
                                      ? message.queryResult.groupByField 
                                      : [message.queryResult?.groupByField || 'group'];
                                    
                                    return (
                                      <tr 
                                        key={idx}
                                        onClick={() => handleAggregationRowClick(row)}
                                        className="felix-aggregation-row-clickable"
                                        title="Click to view findings"
                                      >
                                        {isMultiDimensional ? (
                                          groupByFields.map((field: string | undefined) => {
                                            if (!field || typeof row.groupValue !== 'object' || Array.isArray(row.groupValue)) return null;
                                            const groupValueObj = row.groupValue as Record<string, string | number>;
                                            return (
                                              <td key={field} className="felix-group-value">
                                                {groupValueObj[field]}
                                              </td>
                                            );
                                          })
                                        ) : (
                                          <td className="felix-group-value">{String(row.groupValue)}</td>
                                        )}
                                        <td className="felix-count-value">{row.count}</td>
                                        {row.sum !== undefined && <td>{row.sum.toFixed(2)}</td>}
                                        {row.avg !== undefined && <td>{row.avg.toFixed(2)}</td>}
                                        {row.min !== undefined && <td>{row.min}</td>}
                                        {row.max !== undefined && <td>{row.max}</td>}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        
                        {(message.content || message.queryResult?.excelBuffer) && !message.queryResult?.needsConfirmation && (
                          <div className="felix-message-actions">
                            {message.content && (
                              <button 
                                className="felix-action-btn"
                                onClick={() => handleCopyMessage(message)}
                                data-tutorial="copy-button"
                              >
                                <Copy size={14} /> Copy
                              </button>
                            )}
                            {message.queryResult?.excelBuffer && canDownloadExcel && (
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
                            <button
                              className="felix-action-btn felix-report"
                              onClick={() => setShowReportDialog(true)}
                              title="Give feedback or suggestions"
                            >
                              <Flag size={14} /> Suggestion
                            </button>
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
                      data-tutorial="send-button"
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

      {/* Aggregation Details Modal */}
      {aggregationDetails && (
        <div className="felix-modal-overlay" onClick={() => setAggregationDetails(null)}>
          <div className="felix-modal felix-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="felix-modal-header">
              <div className="felix-modal-header-left">
                <span className="felix-modal-brand">Felix</span>
                <h2 className="felix-modal-title">
                  📊 {typeof aggregationDetails.groupValue === 'object' && !Array.isArray(aggregationDetails.groupValue)
                    ? Object.entries(aggregationDetails.groupValue).map(([key, value]) => `${key}: ${value}`).join(', ')
                    : aggregationDetails.groupValue} - {aggregationDetails.results.length} Findings
                </h2>
              </div>
              <div className="felix-modal-actions">
                {canDownloadExcel && (
                  <button
                    className="felix-action-btn felix-download"
                    onClick={() => handleDownloadExcel(
                      aggregationDetails.excelBuffer,
                      aggregationDetails.excelFilename
                    )}
                  >
                    <Download size={14} /> Download Excel
                  </button>
                )}
                <button 
                  className="felix-modal-close"
                  onClick={() => setAggregationDetails(null)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="felix-modal-content">
              <FelixResultsTable 
                results={aggregationDetails.results}
                table="audit-results"
                maxRows={100}
              />
            </div>
          </div>
        </div>
      )}

      {/* Feedback Dialog */}
      {currentSessionId && (
        <ReportChatDialog
          sessionId={currentSessionId}
          isOpen={showReportDialog}
          onClose={() => setShowReportDialog(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        isOpen={showDeleteDialog}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      {/* User Settings Dialog */}
      <UserSettingsDialog
        isOpen={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        onRestartTutorial={handleTutorialRestart}
      />

      {/* First Time Setup Dialog */}
      <FirstTimeSetupDialog
        isOpen={showFirstTimeSetup}
        onComplete={handleFirstTimeSetupComplete}
      />

      {/* Onboarding Tutorial */}
      <OnboardingTutorial
        isActive={showTutorial}
        onComplete={handleTutorialComplete}
        isManualRestart={isTutorialManualRestart}
        onSetDemoQuery={setTutorialDemoQuery}
        isSidebarOpen={sidebarOpen}
        hasResults={messages.some(m => m.queryResult?.results && m.queryResult.results.length > 0)}
      />
    </div>
  );
}
