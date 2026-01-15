import { Timestamp, WhereFilterOp } from 'firebase/firestore';
import DatabaseService from './DatabaseService';
import { ChatSession, ChatMessage, CreateChatSessionInput, AddMessageInput } from '../types/chat.types';

/**
 * ChatSessionService
 * 
 * Manages chat sessions and messages in Firestore.
 * Provides persistent storage for AI chat conversations.
 * 
 * Requirements: 6.1, 6.5
 */
class ChatSessionService extends DatabaseService<ChatSession> {
  constructor() {
    super('chatSessions');
  }

  /**
   * Create a new chat session
   * @param input - Session creation input
   * @returns Promise resolving to the new session
   */
  async createSession(input: CreateChatSessionInput): Promise<ChatSession> {
    const sessionData: Omit<ChatSession, 'id'> = {
      userId: input.userId,
      title: input.title,
      messages: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isActive: true,
    };

    const sessionId = await this.create(sessionData as any);

    return {
      id: sessionId,
      ...sessionData,
    };
  }

  /**
   * Get all sessions for a user
   * @param userId - User ID
   * @param activeOnly - If true, only return active sessions
   * @returns Promise resolving to array of sessions
   */
  async getUserSessions(userId: string, activeOnly: boolean = false): Promise<ChatSession[]> {
    const filters: Array<{ field: string; operator: WhereFilterOp; value: any }> = [
      { field: 'userId', operator: '==', value: userId },
    ];

    if (activeOnly) {
      filters.push({ field: 'isActive', operator: '==', value: true });
    }

    const sessions = await this.getAll({
      filters,
      sorts: [{ field: 'updatedAt', direction: 'desc' }],
    });

    return sessions as ChatSession[];
  }

  /**
   * Get a specific session by ID
   * @param sessionId - Session ID
   * @returns Promise resolving to the session or null
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    return await this.getById(sessionId) as ChatSession | null;
  }

  /**
   * Add a message to a session
   * @param input - Message input
   * @returns Promise resolving to the updated session
   */
  async addMessage(input: AddMessageInput): Promise<ChatSession> {
    const session = await this.getSession(input.sessionId);
    
    if (!session) {
      throw new Error(`Session ${input.sessionId} not found`);
    }

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: input.role,
      content: input.content,
      timestamp: Timestamp.now(),
      ...(input.metadata && { metadata: input.metadata }),
    };

    const updatedMessages = [...session.messages, newMessage];
    const updatedAt = Timestamp.now();

    await this.update(input.sessionId, {
      messages: updatedMessages,
      updatedAt: updatedAt,
    } as any);

    return {
      ...session,
      messages: updatedMessages,
      updatedAt: updatedAt,
    };
  }

  /**
   * Update session title
   * @param sessionId - Session ID
   * @param title - New title
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    await this.update(sessionId, {
      title,
      updatedAt: Timestamp.now(),
    } as any);
  }

  /**
   * Mark a session as inactive (soft delete)
   * @param sessionId - Session ID
   */
  async deactivateSession(sessionId: string): Promise<void> {
    await this.update(sessionId, {
      isActive: false,
      updatedAt: Timestamp.now(),
    } as any);
  }

  /**
   * Delete a session permanently
   * @param sessionId - Session ID
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.delete(sessionId);
  }

  /**
   * Get the most recent active session for a user
   * @param userId - User ID
   * @returns Promise resolving to the most recent session or null
   */
  async getMostRecentSession(userId: string): Promise<ChatSession | null> {
    const sessions = await this.getAll({
      filters: [
        { field: 'userId', operator: '==', value: userId },
        { field: 'isActive', operator: '==', value: true },
      ],
      sorts: [{ field: 'updatedAt', direction: 'desc' }],
      limit: 1,
    });

    return sessions.length > 0 ? (sessions[0] as ChatSession) : null;
  }

  /**
   * Clear all messages from a session
   * @param sessionId - Session ID
   */
  async clearSessionMessages(sessionId: string): Promise<void> {
    await this.update(sessionId, {
      messages: [],
      updatedAt: Timestamp.now(),
    } as any);
  }

  /**
   * Get conversation history for Gemini API
   * @param sessionId - Session ID
   * @returns Array of messages in Gemini format
   */
  async getConversationHistory(sessionId: string): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return [];
    }

    return session.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }
}

// Export singleton instance
export const chatSessionService = new ChatSessionService();
export default chatSessionService;
