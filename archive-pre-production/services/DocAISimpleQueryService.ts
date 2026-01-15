/**
 * DocAI Simple Query Service
 * 
 * New core logic for DocAI Filter Mode with minimal LLM intervention
 * 
 * Flow:
 * 1. User inputs query
 * 2. LLM extracts filters from query
 * 3. Confirm interpretation with user (local)
 * 4. Execute Firebase query (local)
 * 5. Show results (max 10 in chat) + downloadable XLSX (local)
 */

import { AuditResultService } from './AuditResultService';
import {
  extractFilters,
  needsDatabaseInfo,
  getDatabaseInfo,
} from './DocAIFilterExtractor';
import {
  buildQuery,
  validateFilters,
  ExtractedFilters,
} from './DocAIQueryBuilder';
import {
  formatResultsAsText,
  formatResultsAsExcel,
  formatConfirmation,
  formatStatistics,
  generateExcelFilename,
} from './DocAIResultFormatter';

export interface SimpleQueryResult {
  success: boolean;
  message: string;
  resultsCount: number;
  excelBuffer?: Buffer;
  excelFilename?: string;
  metadata: {
    extractedFilters: ExtractedFilters;
    queryDescription: string;
    executionTime: number;
    needsConfirmation: boolean;
  };
}

/**
 * DocAI Simple Query Service
 */
export class DocAISimpleQueryService {
  private auditResultService: AuditResultService;
  private pendingConfirmations: Map<
    string,
    {
      filters: ExtractedFilters;
      query: string;
      timestamp: number;
    }
  > = new Map();

  constructor(auditResultService?: AuditResultService) {
    this.auditResultService = auditResultService || new AuditResultService();
  }

  /**
   * Process a simple query
   * 
   * @param query - User's natural language query
   * @param userId - User ID for confirmation tracking
   * @param sessionId - Session ID for LLM context
   * @returns Query result with message and optional Excel export
   */
  async processQuery(
    query: string,
    userId: string,
    sessionId?: string
  ): Promise<SimpleQueryResult> {
    const startTime = Date.now();

    try {
      // Check if this is a confirmation response
      if (this.isConfirmationResponse(query)) {
        return await this.handleConfirmation(query, userId, startTime);
      }

      // Check if query needs database info
      if (needsDatabaseInfo(query)) {
        const dbInfo = await getDatabaseInfo();
        return {
          success: true,
          message: dbInfo,
          resultsCount: 0,
          metadata: {
            extractedFilters: {},
            queryDescription: 'Database information',
            executionTime: Date.now() - startTime,
            needsConfirmation: false,
          },
        };
      }

      // Step 1: Extract filters using LLM
      console.log('🔍 Extracting filters from query:', query);
      const extracted = await extractFilters(query, sessionId);

      // Validate filters
      const validation = validateFilters(extracted);
      if (!validation.valid) {
        return {
          success: false,
          message: `Filter tidak valid:\n${validation.errors.join('\n')}`,
          resultsCount: 0,
          metadata: {
            extractedFilters: extracted,
            queryDescription: 'Invalid filters',
            executionTime: Date.now() - startTime,
            needsConfirmation: false,
          },
        };
      }

      // Step 2: Build query
      console.log('🔨 Building Firebase query...');
      const queryBuild = await buildQuery(extracted, 10);

      // Step 3: Store for confirmation and ask user
      this.pendingConfirmations.set(userId, {
        filters: extracted,
        query,
        timestamp: Date.now(),
      });

      const confirmationMessage = formatConfirmation(
        query,
        queryBuild.description,
        queryBuild.filters.length
      );

      return {
        success: true,
        message: confirmationMessage,
        resultsCount: 0,
        metadata: {
          extractedFilters: extracted,
          queryDescription: queryBuild.description,
          executionTime: Date.now() - startTime,
          needsConfirmation: true,
        },
      };
    } catch (error) {
      console.error('❌ Simple query processing failed:', error);
      return {
        success: false,
        message: `Gagal memproses query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        resultsCount: 0,
        metadata: {
          extractedFilters: {},
          queryDescription: 'Error',
          executionTime: Date.now() - startTime,
          needsConfirmation: false,
        },
      };
    }
  }

  /**
   * Check if query is a confirmation response
   */
  private isConfirmationResponse(query: string): boolean {
    const lowerQuery = query.toLowerCase().trim();
    const yesPatterns = ['ya', 'yes', 'benar', 'betul', 'iya', 'ok', 'oke'];
    const noPatterns = ['tidak', 'no', 'bukan', 'salah', 'gak', 'nggak'];

    return (
      yesPatterns.some((p) => lowerQuery === p) ||
      noPatterns.some((p) => lowerQuery === p)
    );
  }

  /**
   * Handle confirmation response
   */
  private async handleConfirmation(
    response: string,
    userId: string,
    startTime: number
  ): Promise<SimpleQueryResult> {
    const pending = this.pendingConfirmations.get(userId);

    if (!pending) {
      return {
        success: false,
        message:
          'Tidak ada query yang menunggu konfirmasi. Silakan kirim query baru.',
        resultsCount: 0,
        metadata: {
          extractedFilters: {},
          queryDescription: 'No pending confirmation',
          executionTime: Date.now() - startTime,
          needsConfirmation: false,
        },
      };
    }

    // Check if confirmation is expired (5 minutes)
    const age = Date.now() - pending.timestamp;
    if (age > 5 * 60 * 1000) {
      this.pendingConfirmations.delete(userId);
      return {
        success: false,
        message:
          'Konfirmasi sudah kadaluarsa. Silakan kirim query baru.',
        resultsCount: 0,
        metadata: {
          extractedFilters: {},
          queryDescription: 'Confirmation expired',
          executionTime: Date.now() - startTime,
          needsConfirmation: false,
        },
      };
    }

    const lowerResponse = response.toLowerCase().trim();
    const isYes = ['ya', 'yes', 'benar', 'betul', 'iya', 'ok', 'oke'].some(
      (p) => lowerResponse === p
    );

    if (!isYes) {
      this.pendingConfirmations.delete(userId);
      return {
        success: true,
        message:
          'Baik, query dibatalkan. Silakan kirim query baru dengan kata-kata yang berbeda.',
        resultsCount: 0,
        metadata: {
          extractedFilters: pending.filters,
          queryDescription: 'Query cancelled',
          executionTime: Date.now() - startTime,
          needsConfirmation: false,
        },
      };
    }

    // Execute query
    try {
      console.log('✅ Confirmation received, executing query...');
      const queryBuild = await buildQuery(pending.filters, 10);

      // Execute Firebase query
      const results = await this.auditResultService.getAll({
        filters: queryBuild.filters,
        sorts: queryBuild.sorts,
      });

      console.log(`📊 Query returned ${results.length} results`);

      // Clear pending confirmation
      this.pendingConfirmations.delete(userId);

      // Format results
      const message = formatResultsAsText(
        results,
        queryBuild.description,
        10
      );

      // Generate Excel export
      let excelBuffer: Buffer | undefined;
      let excelFilename: string | undefined;

      if (results.length > 0) {
        excelBuffer = formatResultsAsExcel(results, queryBuild.description);
        excelFilename = generateExcelFilename(queryBuild.description);
      }

      // Add statistics if results > 10
      let finalMessage = message;
      if (results.length > 10) {
        finalMessage += '\n\n' + formatStatistics(results);
      }

      return {
        success: true,
        message: finalMessage,
        resultsCount: results.length,
        excelBuffer,
        excelFilename,
        metadata: {
          extractedFilters: pending.filters,
          queryDescription: queryBuild.description,
          executionTime: Date.now() - startTime,
          needsConfirmation: false,
        },
      };
    } catch (error) {
      console.error('❌ Query execution failed:', error);
      this.pendingConfirmations.delete(userId);

      return {
        success: false,
        message: `Gagal mengeksekusi query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        resultsCount: 0,
        metadata: {
          extractedFilters: pending.filters,
          queryDescription: 'Execution error',
          executionTime: Date.now() - startTime,
          needsConfirmation: false,
        },
      };
    }
  }

  /**
   * Clear pending confirmation for user
   */
  clearPendingConfirmation(userId: string): void {
    this.pendingConfirmations.delete(userId);
  }

  /**
   * Clear all expired confirmations (older than 5 minutes)
   */
  clearExpiredConfirmations(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [userId, pending] of this.pendingConfirmations.entries()) {
      if (now - pending.timestamp > maxAge) {
        this.pendingConfirmations.delete(userId);
      }
    }
  }
}

export default DocAISimpleQueryService;
