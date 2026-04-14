import { Timestamp } from 'firebase/firestore';
import DatabaseService from './DatabaseService';
import { BernardSession, createBernardSession } from '../types/bernard.types';

/**
 * BernardSessionService - Manages Bernard chat sessions
 * 
 * Handles:
 * - Creating new sessions for users
 * - Tracking session activity
 * - Session lifecycle (active/inactive)
 */
export class BernardSessionService extends DatabaseService<BernardSession> {
  constructor() {
    super('bernard_sessions');
  }

  /**
   * Create a new session for a user
   */
  async createSession(userId: string, metadata?: BernardSession['sessionMetadata']): Promise<string> {
    const session = createBernardSession(userId);
    if (metadata) {
      session.sessionMetadata = metadata;
    }
    
    const sessionId = await this.create(session);
    console.log(`📝 Created new Bernard session: ${sessionId} for user: ${userId}`);
    return sessionId;
  }

  /**
   * Get active session for a user (most recent)
   */
  async getActiveSession(userId: string): Promise<(BernardSession & { id: string }) | null> {
    const sessions = await this.getAll({
      filters: [
        { field: 'userId', operator: '==', value: userId },
        { field: 'isActive', operator: '==', value: true },
      ],
      sorts: [{ field: 'lastActivityAt', direction: 'desc' }],
      limit: 5, // Get a few extra to filter in memory
    });

    // Filter out deleted sessions in memory
    const activeSessions = sessions.filter(s => !s.deletedAt);
    return activeSessions.length > 0 ? activeSessions[0] : null;
  }

  /**
   * Get or create active session for user
   */
  async getOrCreateSession(userId: string, metadata?: BernardSession['sessionMetadata']): Promise<string> {
    const activeSession = await this.getActiveSession(userId);
    
    if (activeSession) {
      // Update last activity
      await this.updateActivity(activeSession.id);
      return activeSession.id;
    }

    // Create new session
    return await this.createSession(userId, metadata);
  }

  /**
   * Update session activity timestamp
   */
  async updateActivity(sessionId: string): Promise<void> {
    await this.update(sessionId, {
      lastActivityAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    } as Partial<BernardSession>);
  }

  /**
   * Update session title
   */
  async updateTitle(sessionId: string, title: string): Promise<void> {
    await this.update(sessionId, {
      title,
      updatedAt: Timestamp.now(),
    } as Partial<BernardSession>);
    console.log(`📝 Updated Bernard session title: ${sessionId} -> "${title}"`);
  }

  /**
   * Increment message count for session
   */
  async incrementMessageCount(sessionId: string): Promise<void> {
    const session = await this.getById(sessionId);
    if (session) {
      await this.update(sessionId, {
        messageCount: (session.messageCount || 0) + 1,
        lastActivityAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      } as Partial<BernardSession>);
    }
  }

  /**
   * Mark session as inactive
   */
  async deactivateSession(sessionId: string): Promise<void> {
    await this.update(sessionId, {
      isActive: false,
      updatedAt: Timestamp.now(),
    } as Partial<BernardSession>);
    console.log(`🔒 Deactivated Bernard session: ${sessionId}`);
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string, limit: number = 10): Promise<(BernardSession & { id: string })[]> {
    const sessions = await this.getAll({
      filters: [
        { field: 'userId', operator: '==', value: userId },
      ],
      sorts: [{ field: 'createdAt', direction: 'desc' }],
      limit: limit * 2, // Get extra to filter in memory
    });

    // Filter out deleted sessions in memory
    return sessions.filter(s => !s.deletedAt).slice(0, limit);
  }

  /**
   * Soft delete a session and its associated chats
   */
  async deleteSession(sessionId: string): Promise<void> {
    const now = Timestamp.now();
    
    // Import BernardChatService dynamically to avoid circular dependency
    const { default: BernardChatService } = await import('./BernardChatService');
    
    // Soft delete all chats in this session
    await BernardChatService.softDeleteSessionChats(sessionId);
    
    // Soft delete the session itself
    await this.update(sessionId, {
      deletedAt: now,
      isActive: false,
      updatedAt: now,
    } as Partial<BernardSession>);
    
    console.log(`🗑️ Soft deleted Bernard session: ${sessionId}`);
  }

  /**
   * Permanently delete a session (hard delete - use with caution)
   */
  async permanentlyDeleteSession(sessionId: string): Promise<void> {
    const { default: BernardChatService } = await import('./BernardChatService');
    
    // Permanently delete all chats in this session
    await BernardChatService.permanentlyDeleteSessionChats(sessionId);
    
    // Permanently delete the session itself
    await this.delete(sessionId);
    console.log(`💀 Permanently deleted Bernard session: ${sessionId}`);
  }

  /**
   * Delete old inactive sessions (cleanup)
   */
  async deleteOldSessions(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    const oldSessions = await this.getAll({
      filters: [
        { field: 'isActive', operator: '==', value: false },
        { field: 'lastActivityAt', operator: '<', value: cutoffTimestamp },
      ],
    });

    // Filter out already deleted sessions in memory
    const sessionsToDelete = oldSessions.filter(s => !s.deletedAt);

    let deletedCount = 0;
    for (const session of sessionsToDelete) {
      await this.deleteSession(session.id);
      deletedCount++;
    }

    console.log(`🗑️ Soft deleted ${deletedCount} old Bernard sessions`);
    return deletedCount;
  }

  /**
   * Restore a soft-deleted session
   */
  async restoreSession(sessionId: string): Promise<void> {
    const { default: BernardChatService } = await import('./BernardChatService');
    
    // Restore all chats in this session
    await BernardChatService.restoreSessionChats(sessionId);
    
    // Restore the session itself
    await this.update(sessionId, {
      deletedAt: null,
      updatedAt: Timestamp.now(),
    } as Partial<BernardSession>);
    
    console.log(`♻️ Restored Bernard session: ${sessionId}`);
  }
}

export default new BernardSessionService();
