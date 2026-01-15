import { Timestamp } from 'firebase/firestore';
import DatabaseService from './DatabaseService';
import { DocChatHistory, createDocChatHistory } from '../types/docAI.types';

/**
 * DocChatHistoryService - Manages DocAI conversation history
 * 
 * Handles:
 * - Storing user messages and AI responses
 * - Retrieving conversation history for sessions
 * - Tracking message metadata (tokens, response time, etc)
 */
export class DocChatHistoryService extends DatabaseService<DocChatHistory> {
  constructor() {
    super('doc_chat_history');
  }

  /**
   * Add a user message to history
   */
  async addUserMessage(
    sessionId: string,
    userId: string,
    message: string
  ): Promise<string> {
    const chatEntry = createDocChatHistory(sessionId, userId, 'user', message);
    const id = await this.create(chatEntry);
    console.log(`💬 Added user message to session: ${sessionId}`);
    return id;
  }

  /**
   * Add an assistant response to history
   */
  async addAssistantResponse(
    sessionId: string,
    userId: string,
    message: string,
    response: string,
    thinkingMode?: 'low' | 'high',
    metadata?: DocChatHistory['metadata']
  ): Promise<string> {
    const chatEntry = createDocChatHistory(
      sessionId,
      userId,
      'assistant',
      message,
      response,
      thinkingMode
    );
    
    if (metadata) {
      chatEntry.metadata = metadata;
    }

    const id = await this.create(chatEntry);
    console.log(`🤖 Added assistant response to session: ${sessionId}`);
    return id;
  }

  /**
   * Get conversation history for a session
   */
  async getSessionHistory(
    sessionId: string,
    limit?: number
  ): Promise<(DocChatHistory & { id: string })[]> {
    return await this.getAll({
      filters: [{ field: 'sessionId', operator: '==', value: sessionId }],
      sorts: [{ field: 'timestamp', direction: 'asc' }],
      limit,
    });
  }

  /**
   * Get recent messages for a session (for context)
   */
  async getRecentMessages(
    sessionId: string,
    count: number = 10
  ): Promise<(DocChatHistory & { id: string })[]> {
    const messages = await this.getAll({
      filters: [{ field: 'sessionId', operator: '==', value: sessionId }],
      sorts: [{ field: 'timestamp', direction: 'desc' }],
      limit: count,
    });

    // Reverse to get chronological order
    return messages.reverse();
  }

  /**
   * Get all messages for a user across all sessions
   */
  async getUserMessages(
    userId: string,
    limit: number = 50
  ): Promise<(DocChatHistory & { id: string })[]> {
    return await this.getAll({
      filters: [{ field: 'userId', operator: '==', value: userId }],
      sorts: [{ field: 'timestamp', direction: 'desc' }],
      limit,
    });
  }

  /**
   * Count messages in a session
   */
  async countSessionMessages(sessionId: string): Promise<number> {
    return await this.count({
      filters: [{ field: 'sessionId', operator: '==', value: sessionId }],
    });
  }

  /**
   * Delete all messages for a session
   */
  async deleteSessionHistory(sessionId: string): Promise<number> {
    const messages = await this.getSessionHistory(sessionId);
    let deletedCount = 0;

    for (const message of messages) {
      await this.delete(message.id);
      deletedCount++;
    }

    console.log(`🗑️ Deleted ${deletedCount} messages from session: ${sessionId}`);
    return deletedCount;
  }

  /**
   * Get conversation history formatted for Gemini API
   */
  async getFormattedHistory(
    sessionId: string,
    limit?: number
  ): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    const history = await this.getRecentMessages(sessionId, limit);
    
    return history.map(msg => ({
      role: msg.role,
      content: msg.role === 'user' ? msg.message : (msg.response || msg.message),
    }));
  }

  /**
   * Update message metadata (e.g., after getting response stats)
   */
  async updateMetadata(
    messageId: string,
    metadata: DocChatHistory['metadata']
  ): Promise<void> {
    await this.update(messageId, { metadata } as Partial<DocChatHistory>);
  }

  /**
   * Get average response time for a session
   */
  async getAverageResponseTime(sessionId: string): Promise<number | null> {
    const messages = await this.getAll({
      filters: [
        { field: 'sessionId', operator: '==', value: sessionId },
        { field: 'role', operator: '==', value: 'assistant' },
      ],
    });

    const responseTimes = messages
      .map(msg => msg.metadata?.responseTime)
      .filter((time): time is number => time !== undefined);

    if (responseTimes.length === 0) return null;

    const sum = responseTimes.reduce((acc, time) => acc + time, 0);
    return sum / responseTimes.length;
  }
}

export default new DocChatHistoryService();
