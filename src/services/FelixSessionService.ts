import { Timestamp } from 'firebase/firestore';
import DatabaseService from './DatabaseService';
import { FelixSession, createFelixSession } from '../types/felix.types';

/**
 * FelixSessionService - Manages Felix chat sessions
 * 
 * Handles:
 * - Creating new sessions for users
 * - Tracking session activity
 * - Session lifecycle (active/inactive)
 */
export class FelixSessionService extends DatabaseService<FelixSession> {
  constructor() {
    super('felix_sessions');
  }

  /**
   * Create a new session for a user
   */
  async createSession(userId: string, metadata?: FelixSession['sessionMetadata']): Promise<string> {
    const session = createFelixSession(userId);
    if (metadata) {
      session.sessionMetadata = metadata;
    }
    
    const sessionId = await this.create(session);
    console.log(`📝 Created new Felix session: ${sessionId} for user: ${userId}`);
    return sessionId;
  }

  /**
   * Get active session for a user (most recent)
   */
  async getActiveSession(userId: string): Promise<(FelixSession & { id: string }) | null> {
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
  async getOrCreateSession(userId: string, metadata?: FelixSession['sessionMetadata']): Promise<string> {
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
    } as Partial<FelixSession>);
  }

  /**
   * Update session title
   */
  async updateTitle(sessionId: string, title: string): Promise<void> {
    await this.update(sessionId, {
      title,
      updatedAt: Timestamp.now(),
    } as Partial<FelixSession>);
    console.log(`📝 Updated Felix session title: ${sessionId} -> "${title}"`);
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
      } as Partial<FelixSession>);
    }
  }

  /**
   * Mark session as inactive
   */
  async deactivateSession(sessionId: string): Promise<void> {
    await this.update(sessionId, {
      isActive: false,
      updatedAt: Timestamp.now(),
    } as Partial<FelixSession>);
    console.log(`🔒 Deactivated Felix session: ${sessionId}`);
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string, limit: number = 10): Promise<(FelixSession & { id: string })[]> {
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
    
    // Import FelixChatService dynamically to avoid circular dependency
    const { default: FelixChatService } = await import('./FelixChatService');
    
    // Soft delete all chats in this session
    await FelixChatService.softDeleteSessionChats(sessionId);
    
    // Soft delete the session itself
    await this.update(sessionId, {
      deletedAt: now,
      isActive: false,
      updatedAt: now,
    } as Partial<FelixSession>);
    
    console.log(`🗑️ Soft deleted Felix session: ${sessionId}`);
  }

  /**
   * Permanently delete a session (hard delete - use with caution)
   */
  async permanentlyDeleteSession(sessionId: string): Promise<void> {
    const { default: FelixChatService } = await import('./FelixChatService');
    
    // Permanently delete all chats in this session
    await FelixChatService.permanentlyDeleteSessionChats(sessionId);
    
    // Permanently delete the session itself
    await this.delete(sessionId);
    console.log(`💀 Permanently deleted Felix session: ${sessionId}`);
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

    console.log(`🗑️ Soft deleted ${deletedCount} old Felix sessions`);
    return deletedCount;
  }

  /**
   * Restore a soft-deleted session
   */
  async restoreSession(sessionId: string): Promise<void> {
    const { default: FelixChatService } = await import('./FelixChatService');
    
    // Restore all chats in this session
    await FelixChatService.restoreSessionChats(sessionId);
    
    // Restore the session itself
    await this.update(sessionId, {
      deletedAt: null,
      updatedAt: Timestamp.now(),
    } as Partial<FelixSession>);
    
    console.log(`♻️ Restored Felix session: ${sessionId}`);
  }
}

export default new FelixSessionService();
