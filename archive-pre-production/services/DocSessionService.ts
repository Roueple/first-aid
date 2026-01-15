import { Timestamp } from 'firebase/firestore';
import DatabaseService from './DatabaseService';
import { DocSession, createDocSession } from '../types/docAI.types';

/**
 * DocSessionService - Manages DocAI chat sessions
 * 
 * Simplified 2-table structure:
 * - doc_sessions: User sessions (one per user session)
 * - doc_chats: Chat messages (many per session)
 * 
 * Handles:
 * - Creating new sessions for users
 * - Tracking session activity
 * - Managing anonymization maps
 * - Session lifecycle (active/inactive)
 */
export class DocSessionService extends DatabaseService<DocSession> {
  constructor() {
    super('doc_sessions');
  }

  /**
   * Create a new session for a user
   */
  async createSession(userId: string, metadata?: DocSession['sessionMetadata']): Promise<string> {
    const session = createDocSession(userId);
    if (metadata) {
      session.sessionMetadata = metadata;
    }
    
    const sessionId = await this.create(session);
    console.log(`📝 Created new DocAI session: ${sessionId} for user: ${userId}`);
    return sessionId;
  }

  /**
   * Get active session for a user (most recent)
   */
  async getActiveSession(userId: string): Promise<(DocSession & { id: string }) | null> {
    const sessions = await this.getAll({
      filters: [
        { field: 'userId', operator: '==', value: userId },
        { field: 'isActive', operator: '==', value: true },
      ],
      sorts: [{ field: 'lastActivityAt', direction: 'desc' }],
      limit: 1,
    });

    return sessions.length > 0 ? sessions[0] : null;
  }

  /**
   * Get or create active session for user
   */
  async getOrCreateSession(userId: string, metadata?: DocSession['sessionMetadata']): Promise<string> {
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
    } as Partial<DocSession>);
  }

  /**
   * Update session title
   */
  async updateTitle(sessionId: string, title: string): Promise<void> {
    await this.update(sessionId, {
      title,
      updatedAt: Timestamp.now(),
    } as Partial<DocSession>);
    console.log(`📝 Updated session title: ${sessionId} -> "${title}"`);
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
      } as Partial<DocSession>);
    }
  }

  /**
   * Update anonymization map for session
   */
  async updateAnonymizationMap(
    sessionId: string,
    newMappings: Record<string, string>
  ): Promise<void> {
    const session = await this.getById(sessionId);
    if (session) {
      const updatedMap = {
        ...session.anonymizationMap,
        ...newMappings,
      };
      await this.update(sessionId, {
        anonymizationMap: updatedMap,
        updatedAt: Timestamp.now(),
      } as Partial<DocSession>);
    }
  }

  /**
   * Mark session as inactive
   */
  async deactivateSession(sessionId: string): Promise<void> {
    await this.update(sessionId, {
      isActive: false,
      updatedAt: Timestamp.now(),
    } as Partial<DocSession>);
    console.log(`🔒 Deactivated DocAI session: ${sessionId}`);
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string, limit: number = 10): Promise<(DocSession & { id: string })[]> {
    return await this.getAll({
      filters: [{ field: 'userId', operator: '==', value: userId }],
      sorts: [{ field: 'createdAt', direction: 'desc' }],
      limit,
    });
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

    let deletedCount = 0;
    for (const session of oldSessions) {
      await this.delete(session.id);
      deletedCount++;
    }

    console.log(`🗑️ Deleted ${deletedCount} old DocAI sessions`);
    return deletedCount;
  }
}

export default new DocSessionService();
