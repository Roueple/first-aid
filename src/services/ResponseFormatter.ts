/**
 * ResponseFormatter Service
 * 
 * Formats query results with metadata for consistent output across
 * simple, complex, and hybrid query types.
 * 
 * @see .kiro/specs/smart-query-router/design.md
 * @see .kiro/specs/smart-query-router/requirements.md
 */

import { 
  QueryResponse, 
  QueryMetadata, 
  FindingSummary,
  PaginationInfo,
  QueryType 
} from '../types/queryRouter.types';
import { Finding } from '../types/finding.types';
import { Timestamp } from 'firebase/firestore';

/**
 * ResponseFormatter class for formatting query responses
 */
export class ResponseFormatter {
  private static readonly PAGE_SIZE = 50;
  private static readonly MAX_FINDINGS_DISPLAY = 50;

  /**
   * Format simple query results
   * Requirements: 3.3, 3.5
   * 
   * @param findings - Array of findings to format
   * @param metadata - Query execution metadata
   * @param page - Current page number (1-indexed)
   * @returns Formatted query response
   */
  formatSimpleResults(
    findings: Finding[], 
    metadata: QueryMetadata,
    page: number = 1
  ): QueryResponse {
    const totalCount = findings.length;
    const startIndex = (page - 1) * ResponseFormatter.PAGE_SIZE;
    const endIndex = startIndex + ResponseFormatter.PAGE_SIZE;
    const paginatedFindings = findings.slice(startIndex, endIndex);
    
    // Convert findings to summaries
    const findingSummaries = paginatedFindings.map(f => this.toFindingSummary(f));
    
    // Build answer text
    let answer = this.buildSimpleAnswerText(findingSummaries, totalCount);
    
    // Add pagination info if needed
    const pagination = totalCount > ResponseFormatter.PAGE_SIZE 
      ? this.buildPaginationInfo(totalCount, page)
      : undefined;
    
    if (pagination) {
      answer += `\n\n📄 Showing page ${pagination.currentPage} of ${pagination.totalPages} (${totalCount} total results)`;
    }
    
    return {
      type: 'simple',
      answer,
      findings: findingSummaries,
      metadata,
      pagination
    };
  }

  /**
   * Format AI response with finding references
   * Requirements: 4.5
   * 
   * @param aiResponse - AI-generated response text
   * @param findings - Findings used as context
   * @param metadata - Query execution metadata
   * @returns Formatted query response
   */
  formatAIResponse(
    aiResponse: string, 
    findings: Finding[], 
    metadata: QueryMetadata
  ): QueryResponse {
    // Add finding references section
    const findingSummaries = findings.map(f => this.toFindingSummary(f));
    
    let answer = aiResponse;
    
    // Add source references section
    if (findings.length > 0) {
      answer += '\n\n---\n\n**📚 Source Findings Referenced:**\n\n';
      answer += this.buildFindingReferencesList(findingSummaries);
    }
    
    return {
      type: 'complex',
      answer,
      findings: findingSummaries,
      metadata
    };
  }

  /**
   * Format hybrid response with separated sections
   * Requirements: 5.3
   * 
   * @param findings - Database query results
   * @param aiAnalysis - AI analysis of the findings
   * @param metadata - Query execution metadata
   * @param page - Current page number (1-indexed)
   * @returns Formatted query response
   */
  formatHybridResponse(
    findings: Finding[],
    aiAnalysis: string,
    metadata: QueryMetadata,
    page: number = 1
  ): QueryResponse {
    const totalCount = findings.length;
    const startIndex = (page - 1) * ResponseFormatter.PAGE_SIZE;
    const endIndex = startIndex + ResponseFormatter.PAGE_SIZE;
    const paginatedFindings = findings.slice(startIndex, endIndex);
    
    const findingSummaries = paginatedFindings.map(f => this.toFindingSummary(f));
    
    // Build separated sections
    let answer = '## 🔍 Database Results\n\n';
    answer += this.buildSimpleAnswerText(findingSummaries, totalCount);
    
    // Add pagination info if needed
    const pagination = totalCount > ResponseFormatter.PAGE_SIZE 
      ? this.buildPaginationInfo(totalCount, page)
      : undefined;
    
    if (pagination) {
      answer += `\n\n📄 Page ${pagination.currentPage} of ${pagination.totalPages}`;
    }
    
    answer += '\n\n---\n\n## 🤖 AI Analysis\n\n';
    answer += aiAnalysis;
    
    return {
      type: 'hybrid',
      answer,
      findings: findingSummaries,
      metadata,
      pagination
    };
  }

  /**
   * Build metadata for query response
   * Requirements: 6.1, 6.2, 6.3, 6.4
   * 
   * @param queryType - Type of query executed
   * @param startTime - Query start timestamp
   * @param findingsCount - Number of findings analyzed
   * @param confidence - Classification confidence score
   * @param extractedFilters - Filters extracted from query
   * @param tokensUsed - Token usage for AI queries (optional)
   * @returns Query metadata object
   */
  buildMetadata(
    queryType: QueryType,
    startTime: number,
    findingsCount: number,
    confidence: number,
    extractedFilters: any,
    tokensUsed?: number
  ): QueryMetadata {
    const executionTimeMs = Date.now() - startTime;
    
    return {
      queryType,
      executionTimeMs,
      findingsAnalyzed: findingsCount,
      tokensUsed,
      confidence,
      extractedFilters
    };
  }

  /**
   * Convert Finding to FindingSummary
   * Requirements: 3.3
   * 
   * @param finding - Full finding object
   * @returns Summarized finding
   */
  private toFindingSummary(finding: Finding): FindingSummary {
    return {
      id: finding.id,
      title: finding.findingTitle,
      severity: finding.priorityLevel,
      status: finding.status,
      projectType: finding.projectType,
      year: finding.auditYear
    };
  }

  /**
   * Build answer text for simple query results
   * Requirements: 3.3
   * 
   * @param summaries - Finding summaries
   * @param totalCount - Total number of findings
   * @returns Formatted answer text
   */
  private buildSimpleAnswerText(summaries: FindingSummary[], totalCount: number): string {
    if (summaries.length === 0) {
      return 'No findings match your search criteria. Try broadening your search by:\n' +
             '- Removing some filters\n' +
             '- Using different keywords\n' +
             '- Expanding the date range';
    }
    
    let text = `Found ${totalCount} finding${totalCount !== 1 ? 's' : ''}:\n\n`;
    
    summaries.forEach((summary, index) => {
      const severityEmoji = this.getSeverityEmoji(summary.severity);
      const statusEmoji = this.getStatusEmoji(summary.status);
      
      text += `${index + 1}. **${summary.title}**\n`;
      text += `   ${severityEmoji} ${summary.severity} | ${statusEmoji} ${summary.status} | `;
      text += `${summary.projectType} | ${summary.year}\n`;
      text += `   ID: ${summary.id}\n\n`;
    });
    
    return text.trim();
  }

  /**
   * Build finding references list
   * Requirements: 4.5
   * 
   * @param summaries - Finding summaries
   * @returns Formatted references list
   */
  private buildFindingReferencesList(summaries: FindingSummary[]): string {
    return summaries.map((summary, index) => {
      const severityEmoji = this.getSeverityEmoji(summary.severity);
      return `${index + 1}. [${summary.id}] ${summary.title} (${severityEmoji} ${summary.severity})`;
    }).join('\n');
  }

  /**
   * Build pagination info
   * Requirements: 3.5
   * 
   * @param totalCount - Total number of results
   * @param currentPage - Current page number (1-indexed)
   * @returns Pagination information
   */
  private buildPaginationInfo(totalCount: number, currentPage: number): PaginationInfo {
    const totalPages = Math.ceil(totalCount / ResponseFormatter.PAGE_SIZE);
    
    return {
      totalCount,
      currentPage,
      pageSize: ResponseFormatter.PAGE_SIZE,
      totalPages,
      hasMore: currentPage < totalPages
    };
  }

  /**
   * Get emoji for severity level
   * 
   * @param severity - Finding severity
   * @returns Emoji representation
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'Critical': return '🔴';
      case 'High': return '🟠';
      case 'Medium': return '🟡';
      case 'Low': return '🟢';
      default: return '⚪';
    }
  }

  /**
   * Get emoji for status
   * 
   * @param status - Finding status
   * @returns Emoji representation
   */
  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'Open': return '📂';
      case 'In Progress': return '⏳';
      case 'Closed': return '✅';
      case 'Deferred': return '⏸️';
      default: return '❓';
    }
  }
}

// Export singleton instance
export const responseFormatter = new ResponseFormatter();
