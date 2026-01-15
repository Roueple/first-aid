
import DatabaseService from './DatabaseService';
import { DocChat, createDocChat } from '../types/docAI.types';

/**
 * DocChatService - Manages DocAI chat messages
 * 
 * Simplified 2-table structure:
 * - Stores all chat messages (user and assistant)
 * - Includes query analytics inline (no separate query log table)
 * - One-to-many relationship: session -> chats
 */
export class DocChatService extends DatabaseService<DocChat> {
  constructor() {
    super('doc_chats');
  }

  /**
   * Add a user message
   */
  async addUserMessage(
    sessionId: string,
    userId: string,
    message: string
  ): Promise<string> {
    const chat = createDocChat(sessionId, userId, 'user', message);
    const id = await this.create(chat);
    console.log(`💬 Added user message to session: ${sessionId}`);
    return id;
  }

  /**
   * Add an assistant response with full metadata
   */
  async addAssistantResponse(
    sessionId: string,
    userId: string,
    message: string,
    options?: {
      thinkingMode?: 'low' | 'high' | 'none';
      responseTime?: number;
      modelVersion?: string;
      tokensUsed?: number;
      intent?: string;
      filtersUsed?: Record<string, any>;
      queryType?: DocChat['queryType'];
      resultsCount?: number;
      dataSourcesQueried?: string[];
      success?: boolean;
      errorMessage?: string;
      contextUsed?: DocChat['contextUsed'];
      metadata?: Record<string, any>;
    }
  ): Promise<string> {
    const chat = createDocChat(sessionId, userId, 'assistant', message, {
      success: true, // Default to success
      ...options,
    });

    const id = await this.create(chat);
    console.log(`🤖 Added assistant response to session: ${sessionId}`);
    return id;
  }

  /**
   * Get all chats for a session
   */
  async getSessionChats(
    sessionId: string,
    limit?: number
  ): Promise<(DocChat & { id: string })[]> {
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
  ): Promise<(DocChat & { id: string })[]> {
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
  ): Promise<(DocChat & { id: string })[]> {
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

    console.log(`🗑️ Deleted ${deletedCount} chats from session: ${sessionId}`);
    return deletedCount;
  }

  /**
   * Get failed queries for debugging
   */
  async getFailedQueries(
    userId?: string,
    limit: number = 20
  ): Promise<(DocChat & { id: string })[]> {
    const filters: any[] = [
      { field: 'role', operator: '==', value: 'assistant' },
      { field: 'success', operator: '==', value: false },
    ];
    
    if (userId) {
      filters.push({ field: 'userId', operator: '==', value: userId });
    }

    return await this.getAll({
      filters,
      sorts: [{ field: 'timestamp', direction: 'desc' }],
      limit,
    });
  }

  /**
   * Get session analytics
   */
  async getSessionAnalytics(sessionId: string): Promise<{
    totalChats: number;
    userMessages: number;
    assistantResponses: number;
    successfulQueries: number;
    failedQueries: number;
    averageResponseTime: number | null;
    queryTypes: Record<string, number>;
    dataSourcesUsed: Record<string, number>;
  }> {
    const chats = await this.getSessionChats(sessionId);

    const userMessages = chats.filter(c => c.role === 'user').length;
    const assistantResponses = chats.filter(c => c.role === 'assistant').length;
    const successfulQueries = chats.filter(c => c.role === 'assistant' && c.success !== false).length;
    const failedQueries = chats.filter(c => c.role === 'assistant' && c.success === false).length;

    // Calculate average response time
    const responseTimes = chats
      .filter(c => c.role === 'assistant' && c.responseTime)
      .map(c => c.responseTime!);
    
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : null;

    // Count query types
    const queryTypes: Record<string, number> = {};
    chats.forEach(chat => {
      if (chat.queryType) {
        queryTypes[chat.queryType] = (queryTypes[chat.queryType] || 0) + 1;
      }
    });

    // Count data sources
    const dataSourcesUsed: Record<string, number> = {};
    chats.forEach(chat => {
      if (chat.dataSourcesQueried) {
        chat.dataSourcesQueried.forEach(source => {
          dataSourcesUsed[source] = (dataSourcesUsed[source] || 0) + 1;
        });
      }
    });

    return {
      totalChats: chats.length,
      userMessages,
      assistantResponses,
      successfulQueries,
      failedQueries,
      averageResponseTime,
      queryTypes,
      dataSourcesUsed,
    };
  }

  /**
   * Get user analytics across all sessions
   */
  async getUserAnalytics(userId: string): Promise<{
    totalChats: number;
    totalQueries: number;
    successRate: number;
    averageResponseTime: number | null;
    mostUsedIntent: string | null;
    mostQueriedDataSource: string | null;
  }> {
    const chats = await this.getUserChats(userId, 1000);
    const assistantChats = chats.filter(c => c.role === 'assistant');

    const totalQueries = assistantChats.length;
    const successfulQueries = assistantChats.filter(c => c.success !== false).length;
    const successRate = totalQueries > 0 ? (successfulQueries / totalQueries) * 100 : 0;

    // Average response time
    const responseTimes = assistantChats
      .map(c => c.responseTime)
      .filter((time): time is number => time !== undefined);
    
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : null;

    // Most used intent
    const intentCounts: Record<string, number> = {};
    assistantChats.forEach(chat => {
      if (chat.intent) {
        intentCounts[chat.intent] = (intentCounts[chat.intent] || 0) + 1;
      }
    });
    const mostUsedIntent = Object.keys(intentCounts).length > 0
      ? Object.entries(intentCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    // Most queried data source
    const sourceCounts: Record<string, number> = {};
    assistantChats.forEach(chat => {
      if (chat.dataSourcesQueried) {
        chat.dataSourcesQueried.forEach(source => {
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        });
      }
    });
    const mostQueriedDataSource = Object.keys(sourceCounts).length > 0
      ? Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    return {
      totalChats: chats.length,
      totalQueries,
      successRate,
      averageResponseTime,
      mostUsedIntent,
      mostQueriedDataSource,
    };
  }

  /**
   * Update chat metadata (e.g., after getting additional stats)
   */
  async updateMetadata(
    chatId: string,
    updates: Partial<Omit<DocChat, 'id' | 'sessionId' | 'userId' | 'role' | 'message' | 'timestamp'>>
  ): Promise<void> {
    await this.update(chatId, updates as Partial<DocChat>);
  }
}

export default new DocChatService();
