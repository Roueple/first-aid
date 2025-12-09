import { Timestamp } from 'firebase/firestore';
import DatabaseService from './DatabaseService';
import { DocQueryLog, createDocQueryLog } from '../types/docAI.types';

/**
 * DocQueryLogService - Analytics and debugging for DocAI queries
 * 
 * Handles:
 * - Logging query execution details
 * - Tracking performance metrics
 * - Analyzing query patterns
 * - Debugging failed queries
 */
export class DocQueryLogService extends DatabaseService<DocQueryLog> {
  constructor() {
    super('doc_query_logs');
  }

  /**
   * Log a query execution
   */
  async logQuery(
    sessionId: string,
    userId: string,
    queryData: Partial<Omit<DocQueryLog, 'id' | 'sessionId' | 'userId' | 'timestamp'>>
  ): Promise<string> {
    const log = {
      ...createDocQueryLog(sessionId, userId, queryData.success ?? true),
      ...queryData,
    };

    const id = await this.create(log);
    
    if (!log.success) {
      console.warn(`⚠️ Query failed in session ${sessionId}: ${log.errorMessage}`);
    }
    
    return id;
  }

  /**
   * Log a successful query
   */
  async logSuccess(
    sessionId: string,
    userId: string,
    data: {
      intent?: string;
      filtersUsed?: Record<string, any>;
      queryType?: DocQueryLog['queryType'];
      resultsCount?: number;
      dataSourcesQueried?: string[];
      executionTimeMs?: number;
      contextUsed?: DocQueryLog['contextUsed'];
      chatHistoryId?: string;
    }
  ): Promise<string> {
    return await this.logQuery(sessionId, userId, {
      ...data,
      success: true,
    });
  }

  /**
   * Log a failed query
   */
  async logFailure(
    sessionId: string,
    userId: string,
    errorMessage: string,
    data?: {
      intent?: string;
      filtersUsed?: Record<string, any>;
      queryType?: DocQueryLog['queryType'];
      executionTimeMs?: number;
      chatHistoryId?: string;
    }
  ): Promise<string> {
    return await this.logQuery(sessionId, userId, {
      ...data,
      success: false,
      errorMessage,
    });
  }

  /**
   * Get query logs for a session
   */
  async getSessionLogs(
    sessionId: string,
    limit?: number
  ): Promise<(DocQueryLog & { id: string })[]> {
    return await this.getAll({
      filters: [{ field: 'sessionId', operator: '==', value: sessionId }],
      sorts: [{ field: 'timestamp', direction: 'desc' }],
      limit,
    });
  }

  /**
   * Get query logs for a user
   */
  async getUserLogs(
    userId: string,
    limit: number = 50
  ): Promise<(DocQueryLog & { id: string })[]> {
    return await this.getAll({
      filters: [{ field: 'userId', operator: '==', value: userId }],
      sorts: [{ field: 'timestamp', direction: 'desc' }],
      limit,
    });
  }

  /**
   * Get failed queries for debugging
   */
  async getFailedQueries(
    userId?: string,
    limit: number = 20
  ): Promise<(DocQueryLog & { id: string })[]> {
    const filters = [{ field: 'success', operator: '==', value: false }];
    
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
   * Get query statistics for a session
   */
  async getSessionStats(sessionId: string): Promise<{
    totalQueries: number;
    successfulQueries: number;
    failedQueries: number;
    averageExecutionTime: number | null;
    queryTypes: Record<string, number>;
    dataSourcesUsed: Record<string, number>;
  }> {
    const logs = await this.getSessionLogs(sessionId);

    const stats = {
      totalQueries: logs.length,
      successfulQueries: logs.filter(log => log.success).length,
      failedQueries: logs.filter(log => !log.success).length,
      averageExecutionTime: null as number | null,
      queryTypes: {} as Record<string, number>,
      dataSourcesUsed: {} as Record<string, number>,
    };

    // Calculate average execution time
    const executionTimes = logs
      .map(log => log.executionTimeMs)
      .filter((time): time is number => time !== undefined);
    
    if (executionTimes.length > 0) {
      stats.averageExecutionTime = 
        executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
    }

    // Count query types
    logs.forEach(log => {
      if (log.queryType) {
        stats.queryTypes[log.queryType] = (stats.queryTypes[log.queryType] || 0) + 1;
      }
    });

    // Count data sources
    logs.forEach(log => {
      if (log.dataSourcesQueried) {
        log.dataSourcesQueried.forEach(source => {
          stats.dataSourcesUsed[source] = (stats.dataSourcesUsed[source] || 0) + 1;
        });
      }
    });

    return stats;
  }

  /**
   * Get user query analytics
   */
  async getUserAnalytics(userId: string): Promise<{
    totalQueries: number;
    successRate: number;
    averageExecutionTime: number | null;
    mostUsedIntent: string | null;
    mostQueriedDataSource: string | null;
  }> {
    const logs = await this.getUserLogs(userId, 1000); // Get more for better analytics

    const totalQueries = logs.length;
    const successfulQueries = logs.filter(log => log.success).length;
    const successRate = totalQueries > 0 ? (successfulQueries / totalQueries) * 100 : 0;

    // Average execution time
    const executionTimes = logs
      .map(log => log.executionTimeMs)
      .filter((time): time is number => time !== undefined);
    
    const averageExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
      : null;

    // Most used intent
    const intentCounts: Record<string, number> = {};
    logs.forEach(log => {
      if (log.intent) {
        intentCounts[log.intent] = (intentCounts[log.intent] || 0) + 1;
      }
    });
    const mostUsedIntent = Object.keys(intentCounts).length > 0
      ? Object.entries(intentCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    // Most queried data source
    const sourceCounts: Record<string, number> = {};
    logs.forEach(log => {
      if (log.dataSourcesQueried) {
        log.dataSourcesQueried.forEach(source => {
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        });
      }
    });
    const mostQueriedDataSource = Object.keys(sourceCounts).length > 0
      ? Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    return {
      totalQueries,
      successRate,
      averageExecutionTime,
      mostUsedIntent,
      mostQueriedDataSource,
    };
  }

  /**
   * Delete logs for a session
   */
  async deleteSessionLogs(sessionId: string): Promise<number> {
    const logs = await this.getSessionLogs(sessionId);
    let deletedCount = 0;

    for (const log of logs) {
      await this.delete(log.id);
      deletedCount++;
    }

    console.log(`🗑️ Deleted ${deletedCount} query logs from session: ${sessionId}`);
    return deletedCount;
  }
}

export default new DocQueryLogService();
