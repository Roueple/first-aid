import DatabaseService from './DatabaseService';
import { FelixChat, createFelixChat } from '../types/felix.types';

/**
 * FelixChatService - Manages Felix chat messages
 * 
 * Handles:
 * - Storing user messages and AI responses
 * - Retrieving conversation history
 * - Session analytics
 */
export class FelixChatService extends DatabaseService<FelixChat> {
  constructor() {
    super('felix_chats');
  }

  /**
   * Add a user message
   */
  async addUserMessage(
    sessionId: string,
    userId: string,
    message: string
  ): Promise<string> {
    const chat = createFelixChat(sessionId, userId, 'user', message);
    const id = await this.create(chat);
    console.log(`💬 Added user message to Felix session: ${sessionId}`);
    return id;
  }

  /**
   * Add an assistant response
   */
  async addAssistantResponse(
    sessionId: string,
    userId: string,
    message: string,
    options?: {
      responseTime?: number;
      modelVersion?: string;
      tokensUsed?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<string> {
    const chat = createFelixChat(sessionId, userId, 'assistant', message, options);
    const id = await this.create(chat);
    console.log(`🤖 Added assistant response to Felix session: ${sessionId}`);
    return id;
  }

  /**
   * Get all chats for a session
   */
  async getSessionChats(
    sessionId: string,
    limit?: number
  ): Promise<(FelixChat & { id: string })[]> {
    return await this.getAll({
      filters: [{ field: 'sessionId', operator: '==', value: sessionId }],
      sorts: [{ field: 'timestamp', direction: 'asc' }],
      limit,
    });
  }

  /**
   * Get recent chats for context
   */
  async getRecentChats(
    sessionId: string,
    count: number = 10
  ): Promise<(FelixChat & { id: string })[]> {
    const chats = await this.getAll({
      filters: [{ field: 'sessionId', operator: '==', value: sessionId }],
      sorts: [{ field: 'timestamp', direction: 'desc' }],
      limit: count,
    });

    return chats.reverse(); // Return in chronological order
  }

  /**
   * Get conversation history formatted for Gemini API
   */
  async getFormattedHistory(
    sessionId: string,
    limit?: number
  ): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    const chats = await this.getRecentChats(sessionId, limit);
    
    return chats.map(chat => ({
      role: chat.role,
      content: chat.message,
    }));
  }

  /**
   * Get all chats for a user across sessions
   */
  async getUserChats(
    userId: string,
    limit: number = 50
  ): Promise<(FelixChat & { id: string })[]> {
    return await this.getAll({
      filters: [{ field: 'userId', operator: '==', value: userId }],
      sorts: [{ field: 'timestamp', direction: 'desc' }],
      limit,
    });
  }

  /**
   * Count chats in a session
   */
  async countSessionChats(sessionId: string): Promise<number> {
    return await this.count({
      filters: [{ field: 'sessionId', operator: '==', value: sessionId }],
    });
  }

  /**
   * Delete all chats for a session
   */
  async deleteSessionChats(sessionId: string): Promise<number> {
    const chats = await this.getSessionChats(sessionId);
    let deletedCount = 0;

    for (const chat of chats) {
      await this.delete(chat.id);
      deletedCount++;
    }

    console.log(`🗑️ Deleted ${deletedCount} chats from Felix session: ${sessionId}`);
    return deletedCount;
  }

  /**
   * Get session analytics
   */
  async getSessionAnalytics(sessionId: string): Promise<{
    totalChats: number;
    userMessages: number;
    assistantResponses: number;
    averageResponseTime: number | null;
  }> {
    const chats = await this.getSessionChats(sessionId);

    const userMessages = chats.filter(c => c.role === 'user').length;
    const assistantResponses = chats.filter(c => c.role === 'assistant').length;

    // Calculate average response time
    const responseTimes = chats
      .filter(c => c.role === 'assistant' && c.responseTime)
      .map(c => c.responseTime!);
    
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : null;

    return {
      totalChats: chats.length,
      userMessages,
      assistantResponses,
      averageResponseTime,
    };
  }

  /**
   * Update chat metadata
   */
  async updateMetadata(
    chatId: string,
    updates: Partial<Omit<FelixChat, 'id' | 'sessionId' | 'userId' | 'role' | 'message' | 'timestamp'>>
  ): Promise<void> {
    await this.update(chatId, updates as Partial<FelixChat>);
  }
}

export default new FelixChatService();
