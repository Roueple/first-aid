import { sendMessageToGemini, ThinkingMode, generateSessionTitle } from './GeminiService';
import docSessionService from './DocSessionService';
import docChatService from './DocChatService';
import { SimpleQueryService } from './SimpleQueryService';
import { DocAISimpleQueryService } from './DocAISimpleQueryService';
import { AuditResultService } from './AuditResultService';
import { isEnabled as isSimpleQueryEnabled } from '../config/simpleQuery.config';

/**
 * DocAIService - Integrated service for DocAI functionality
 * 
 * Simplified 2-table architecture:
 * - doc_sessions: User sessions (one per user session)
 * - doc_chats: Chat messages with analytics (many per session)
 * 
 * Coordinates between:
 * - Session management
 * - Chat storage with inline analytics
 * - Gemini API
 * - Simple Query (Filter Mode) - NEW
 */

let isInitialized = false;
let simpleQueryService: SimpleQueryService | null = null;
let docAISimpleQueryService: DocAISimpleQueryService | null = null;

/**
 * Reset DocAI service (for testing)
 */
export const resetDocAI = (): void => {
  isInitialized = false;
  simpleQueryService = null;
  docAISimpleQueryService = null;
};

/**
 * Initialize DocAI service
 */
export const initializeDocAI = (): boolean => {
  if (isInitialized) return true;
  
  try {
    // Initialize SimpleQueryService (old)
    const auditResultService = new AuditResultService();
    simpleQueryService = new SimpleQueryService(auditResultService);
    
    // Initialize DocAISimpleQueryService (new filter mode)
    docAISimpleQueryService = new DocAISimpleQueryService(auditResultService);
    
    // Services are already initialized via their constructors
    isInitialized = true;
    console.log('✅ DocAI Service initialized (2-table structure with filter mode support)');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize DocAI:', error);
    return false;
  }
};

/**
 * Send a query to DocAI with full tracking
 */
export const sendDocQuery = async (
  message: string,
  userId: string,
  thinkingMode: ThinkingMode = 'low',
  sessionId?: string
): Promise<string> => {
  const startTime = Date.now();
  
  try {
    // Ensure DocAI is initialized
    if (!isInitialized) {
      initializeDocAI();
    }
    
    // Get or create session
    const activeSessionId = sessionId || await docSessionService.getOrCreateSession(userId);
    
    // Get conversation history for context
    const conversationHistory = await docChatService.getFormattedHistory(activeSessionId, 10);
    
    // Check if this is the first message (no history) - generate title
    const isFirstMessage = conversationHistory.length === 0;
    
    // Add user message
    await docChatService.addUserMessage(activeSessionId, userId, message);
    
    // TRY NEW FILTER MODE FIRST (DocAI Simple Query)
    if (docAISimpleQueryService) {
      const filterResult = await docAISimpleQueryService.processQuery(
        message,
        userId,
        activeSessionId
      );
      
      if (filterResult.success) {
        // Filter mode processed - use this path
        const executionTime = Date.now() - startTime;
        
        console.log(`⚡ Filter mode processed (${executionTime}ms)`);
        
        await docChatService.addAssistantResponse(
          activeSessionId,
          userId,
          filterResult.message,
          {
            thinkingMode: filterResult.metadata.needsConfirmation ? 'low' : 'none',
            responseTime: executionTime,
            queryType: 'simple_query',
            success: true,
            resultsCount: filterResult.resultsCount,
            metadata: {
              ...filterResult.metadata,
              excelAvailable: !!filterResult.excelBuffer,
            },
          }
        );
        
        // Update session activity
        await docSessionService.incrementMessageCount(activeSessionId);
        
        // Generate and update title for first message
        if (isFirstMessage) {
          console.log(`📝 First message detected, generating title for session: ${activeSessionId}`);
          generateSessionTitle(message).then(title => {
            console.log(`✨ Generated title: "${title}" for session: ${activeSessionId}`);
            return docSessionService.updateTitle(activeSessionId, title);
          }).catch(err => {
            console.error('❌ Failed to generate session title:', err);
          });
        }
        
        return filterResult.message;
      }
    }
    
    // TRY OLD SIMPLE QUERY (if feature is enabled)
    if (simpleQueryService && isSimpleQueryEnabled()) {
      const simpleResult = await simpleQueryService.processQuery(
        message,
        userId,
        activeSessionId
      );
      
      if (simpleResult) {
        // Simple query matched - use fast path
        const executionTime = Date.now() - startTime;
        
        console.log(`⚡ Simple query matched: ${simpleResult.metadata.patternMatched} (${executionTime}ms)`);
        
        await docChatService.addAssistantResponse(
          activeSessionId,
          userId,
          simpleResult.answer,
          {
            thinkingMode: 'none', // No LLM used
            responseTime: executionTime,
            queryType: 'simple_query',
            success: true,
            metadata: simpleResult.metadata,
          }
        );
        
        // Update session activity
        await docSessionService.incrementMessageCount(activeSessionId);
        
        // Generate and update title for first message
        if (isFirstMessage) {
          console.log(`📝 First message detected, generating title for session: ${activeSessionId}`);
          generateSessionTitle(message).then(title => {
            console.log(`✨ Generated title: "${title}" for session: ${activeSessionId}`);
            return docSessionService.updateTitle(activeSessionId, title);
          }).catch(err => {
            console.error('❌ Failed to generate session title:', err);
          });
        }
        
        return simpleResult.answer;
      }
    }
    
    // FALLBACK TO EXISTING LLM-POWERED FLOW
    console.log(`🤖 No simple query match, falling back to LLM processing`);
    
    // Send to Gemini with conversation context
    const response = await sendMessageToGemini(
      message,
      thinkingMode,
      activeSessionId,
      conversationHistory
    );
    
    const executionTime = Date.now() - startTime;
    
    // Add assistant response with full metadata
    await docChatService.addAssistantResponse(
      activeSessionId,
      userId,
      response,
      {
        thinkingMode,
        responseTime: executionTime,
        modelVersion: 'gemini-2.0-flash-thinking-exp',
        queryType: 'general',
        success: true,
      }
    );
    
    // Update session activity
    await docSessionService.incrementMessageCount(activeSessionId);
    
    // Generate and update title for first message
    if (isFirstMessage) {
      console.log(`📝 First message detected, generating title for session: ${activeSessionId}`);
      generateSessionTitle(message).then(title => {
        console.log(`✨ Generated title: "${title}" for session: ${activeSessionId}`);
        return docSessionService.updateTitle(activeSessionId, title);
      }).catch(err => {
        console.error('❌ Failed to generate session title:', err);
      });
    } else {
      console.log(`📝 Not first message (history length: ${conversationHistory.length}), skipping title generation`);
    }
    
    return response;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log failed query if we have a session
    if (sessionId) {
      await docChatService.addAssistantResponse(
        sessionId,
        userId,
        `Error: ${errorMessage}`,
        {
          thinkingMode,
          responseTime: executionTime,
          queryType: 'general',
          success: false,
          errorMessage,
        }
      );
    }
    
    throw error;
  }
};

/**
 * Get session history with chats
 * Validates session ownership before returning chats
 */
export const getSessionHistory = async (sessionId: string, userId?: string) => {
  const session = await docSessionService.getById(sessionId);
  
  // Validate session ownership if userId provided
  if (userId && session && session.userId !== userId) {
    throw new Error('Access denied: Session does not belong to user');
  }
  
  const chats = await docChatService.getSessionChats(sessionId);
  
  return {
    session,
    chats,
  };
};

/**
 * Get session analytics
 */
export const getSessionAnalytics = async (sessionId: string) => {
  return await docChatService.getSessionAnalytics(sessionId);
};

/**
 * Get user analytics across all sessions
 */
export const getUserAnalytics = async (userId: string) => {
  const [sessions, chatAnalytics] = await Promise.all([
    docSessionService.getUserSessions(userId),
    docChatService.getUserAnalytics(userId),
  ]);
  
  return {
    totalSessions: sessions.length,
    activeSessions: sessions.filter(s => s.isActive).length,
    ...chatAnalytics,
  };
};

/**
 * Create a new session
 */
export const createNewSession = async (userId: string) => {
  return await docSessionService.createSession(userId);
};

/**
 * End current session and create a new one
 */
export const startNewSession = async (userId: string) => {
  // Deactivate current active session
  const activeSession = await docSessionService.getActiveSession(userId);
  if (activeSession) {
    await docSessionService.deactivateSession(activeSession.id);
  }
  
  // Create new session
  return await docSessionService.createSession(userId);
};

/**
 * Delete a session and all related data
 */
export const deleteSession = async (sessionId: string) => {
  await Promise.all([
    docChatService.deleteSessionChats(sessionId),
    docSessionService.delete(sessionId),
  ]);
  
  console.log(`🗑️ Deleted session and all related chats: ${sessionId}`);
};

/**
 * Cleanup old sessions
 */
export const cleanupOldSessions = async (daysOld: number = 30) => {
  return await docSessionService.deleteOldSessions(daysOld);
};

/**
 * Get DocAI Simple Query Service instance
 */
export const getDocAISimpleQueryService = (): DocAISimpleQueryService | null => {
  return docAISimpleQueryService;
};

export default {
  initializeDocAI,
  sendDocQuery,
  getSessionHistory,
  getSessionAnalytics,
  getUserAnalytics,
  createNewSession,
  startNewSession,
  deleteSession,
  cleanupOldSessions,
  getDocAISimpleQueryService,
};
