/**
 * Audit Service
 * 
 * Provides methods for logging audit events to track user actions
 * and system operations for security and compliance purposes.
 * 
 * Requirements: 10.1, 10.2, 10.5
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { AuditAction, ResourceType, AuditLog, AuditLogFilters } from '../types/audit.types';

/**
 * Request payload for logging an audit event
 */
interface LogAuditEventRequest {
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details?: Record<string, any>;
}

/**
 * Response from logging an audit event
 */
interface LogAuditEventResponse {
  success: boolean;
  logId: string;
  timestamp: string;
}

/**
 * Audit Service class for logging user actions and system events
 */
export class AuditService {
  private functions = getFunctions();

  /**
   * Log an audit event
   * 
   * @param action - The action being performed (e.g., 'login', 'create', 'update')
   * @param resourceType - The type of resource being acted upon (e.g., 'finding', 'report')
   * @param resourceId - Optional ID of the specific resource
   * @param details - Optional additional details about the action
   * @returns Promise resolving to the log ID and timestamp
   */
  async logEvent(
    action: AuditAction,
    resourceType: ResourceType,
    resourceId?: string,
    details?: Record<string, any>
  ): Promise<LogAuditEventResponse> {
    try {
      const logAuditEvent = httpsCallable<LogAuditEventRequest, LogAuditEventResponse>(
        this.functions,
        'logAuditEvent'
      );

      const result = await logAuditEvent({
        action,
        resourceType,
        resourceId,
        details
      });

      return result.data;
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging failures shouldn't break the app
      return {
        success: false,
        logId: '',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Log a login event
   * 
   * @param userId - The ID of the user logging in
   * @param method - The authentication method used
   */
  async logLogin(userId: string, method: string = 'email'): Promise<void> {
    await this.logEvent('login', 'user', userId, {
      loginMethod: method,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log a logout event
   * 
   * @param userId - The ID of the user logging out
   */
  async logLogout(userId: string): Promise<void> {
    await this.logEvent('logout', 'user', userId, {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log a finding creation event
   * 
   * @param findingId - The ID of the created finding
   * @param details - Additional details about the finding
   */
  async logFindingCreate(findingId: string, details?: Record<string, any>): Promise<void> {
    await this.logEvent('create', 'finding', findingId, details);
  }

  /**
   * Log a finding update event
   * 
   * @param findingId - The ID of the updated finding
   * @param changedFields - The fields that were changed
   */
  async logFindingUpdate(findingId: string, changedFields?: string[]): Promise<void> {
    await this.logEvent('update', 'finding', findingId, {
      changedFields
    });
  }

  /**
   * Log a finding deletion event
   * 
   * @param findingId - The ID of the deleted finding
   */
  async logFindingDelete(findingId: string): Promise<void> {
    await this.logEvent('delete', 'finding', findingId);
  }

  /**
   * Log an AI query event
   * 
   * @param sessionId - The chat session ID
   * @param query - The user's query
   * @param responseTime - Time taken to generate response (ms)
   */
  async logAIQuery(sessionId: string, query: string, responseTime?: number): Promise<void> {
    await this.logEvent('ai_query', 'chat', sessionId, {
      queryLength: query.length,
      responseTime,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log a report generation event
   * 
   * @param reportId - The ID of the generated report
   * @param format - The report format (PDF, Excel, etc.)
   * @param criteria - The report criteria used
   */
  async logReportGenerate(
    reportId: string,
    format: string,
    criteria?: Record<string, any>
  ): Promise<void> {
    await this.logEvent('report_generate', 'report', reportId, {
      format,
      criteria
    });
  }

  /**
   * Log a report download event
   * 
   * @param reportId - The ID of the downloaded report
   */
  async logReportDownload(reportId: string): Promise<void> {
    await this.logEvent('report_download', 'report', reportId);
  }

  /**
   * Log an import event
   * 
   * @param batchId - The import batch ID
   * @param findingsCount - Number of findings imported
   * @param successCount - Number of successful imports
   * @param failureCount - Number of failed imports
   */
  async logImport(
    batchId: string,
    findingsCount: number,
    successCount: number,
    failureCount: number
  ): Promise<void> {
    await this.logEvent('import', 'finding', batchId, {
      findingsCount,
      successCount,
      failureCount,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log an export event
   * 
   * @param resourceType - The type of resource being exported
   * @param format - The export format
   * @param recordCount - Number of records exported
   */
  async logExport(
    resourceType: ResourceType,
    format: string,
    recordCount: number
  ): Promise<void> {
    await this.logEvent('export', resourceType, undefined, {
      format,
      recordCount,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get audit logs with optional filters
   * 
   * @param filters - Optional filters for the audit logs
   * @param maxResults - Maximum number of results to return (default: 100)
   * @returns Promise resolving to an array of audit logs
   */
  async getAuditLogs(filters?: AuditLogFilters, maxResults: number = 100): Promise<AuditLog[]> {
    try {
      const logsRef = collection(db, 'auditLogs');
      let q = query(logsRef, orderBy('timestamp', 'desc'), limit(maxResults));

      // Apply filters
      if (filters) {
        if (filters.userId) {
          q = query(logsRef, where('userId', '==', filters.userId), orderBy('timestamp', 'desc'), limit(maxResults));
        }

        if (filters.action && filters.action.length > 0) {
          q = query(logsRef, where('action', 'in', filters.action), orderBy('timestamp', 'desc'), limit(maxResults));
        }

        if (filters.resourceType && filters.resourceType.length > 0) {
          q = query(logsRef, where('resourceType', 'in', filters.resourceType), orderBy('timestamp', 'desc'), limit(maxResults));
        }

        if (filters.dateRange) {
          const startTimestamp = Timestamp.fromDate(filters.dateRange.start);
          const endTimestamp = Timestamp.fromDate(filters.dateRange.end);
          q = query(
            logsRef,
            where('timestamp', '>=', startTimestamp),
            where('timestamp', '<=', endTimestamp),
            orderBy('timestamp', 'desc'),
            limit(maxResults)
          );
        }
      }

      const snapshot = await getDocs(q);
      const logs: AuditLog[] = [];

      snapshot.forEach((doc) => {
        logs.push({
          id: doc.id,
          ...doc.data()
        } as AuditLog);
      });

      return logs;
    } catch (error) {
      console.error('Failed to get audit logs:', error);
      throw error;
    }
  }

  /**
   * Export audit logs to CSV format
   * 
   * @param logs - Array of audit logs to export
   * @returns CSV string
   */
  exportToCSV(logs: AuditLog[]): string {
    if (logs.length === 0) {
      return 'No logs to export';
    }

    // CSV headers
    const headers = ['Timestamp', 'User ID', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'Details'];
    const csvRows = [headers.join(',')];

    // Add data rows
    logs.forEach(log => {
      const timestamp = log.timestamp instanceof Timestamp 
        ? log.timestamp.toDate().toISOString() 
        : new Date(log.timestamp as any).toISOString();
      
      const details = JSON.stringify(log.details || {}).replace(/"/g, '""');
      
      const row = [
        timestamp,
        log.userId,
        log.action,
        log.resourceType,
        log.resourceId || '',
        log.ipAddress || '',
        `"${details}"`
      ];
      
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Download audit logs as CSV file
   * 
   * @param logs - Array of audit logs to download
   * @param filename - Optional filename (default: audit-logs-{timestamp}.csv)
   */
  downloadCSV(logs: AuditLog[], filename?: string): void {
    const csv = this.exportToCSV(logs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename || `audit-logs-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Log an error event
   * 
   * @param userId - The ID of the user who encountered the error
   * @param operation - The operation that failed
   * @param errorDetails - Details about the error
   */
  async logError(
    userId: string,
    operation: string,
    errorDetails: Record<string, any>
  ): Promise<void> {
    await this.logEvent('error', 'system', undefined, {
      operation,
      ...errorDetails,
      timestamp: new Date().toISOString()
    });
  }
}

// Export singleton instance
export const auditService = new AuditService();
