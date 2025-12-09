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
  QueryType 
} from '../types/queryRouter.types';
import { Finding } from '../types/finding.types';


/**
 * ResponseFormatter class for formatting query responses
 */
export class ResponseFormatter {
  // private static readonly PAGE_SIZE = 50;
  // private static readonly MAX_FINDINGS_DISPLAY = 50;

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
    _page: number = 1
  ): QueryResponse {
    const totalCount = findings.length;
    
    // For chat display, we'll show table in UI component
    // Just provide a summary text here
    let answer = `Found **${totalCount}** finding${totalCount !== 1 ? 's' : ''} matching your criteria.\n\n`;
    
    if (totalCount > 10) {
      answer += `📊 Displaying first 10 results in table below. Download Excel to see all ${totalCount} findings.\n\n`;
    }
    
    // Add a marker for the UI to render the table
    answer += `[RENDER_TABLE]`;
    
    // Convert findings to summaries (limit to 10 for display)
    const displayFindings = findings.slice(0, 10);
    const findingSummaries = displayFindings.map(f => this.toFindingSummary(f));
    
    return {
      type: 'simple',
      answer,
      findings: findingSummaries,
      metadata,
      // Store all findings for Excel export (not just summaries)
      fullFindings: findings,
    } as any; // Type assertion to allow fullFindings
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
      answer += findingSummaries.map((summary, index) => {
        return `${index + 1}. [${summary.id}] ${summary.title}`;
      }).join('\n');
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
    _page: number = 1
  ): QueryResponse {
    const totalCount = findings.length;
    
    // Build separated sections
    let answer = '## 🔍 Database Results\n\n';
    answer += `Found **${totalCount}** finding${totalCount !== 1 ? 's' : ''} matching your criteria.\n\n`;
    
    if (totalCount > 10) {
      answer += `📊 Displaying first 10 results in table below. Download Excel to see all ${totalCount} findings.\n\n`;
    }
    
    // Add table marker
    answer += `[RENDER_TABLE]\n\n`;
    
    answer += '---\n\n## 🤖 AI Analysis\n\n';
    answer += aiAnalysis;
    
    // Convert findings to summaries (limit to 10 for display)
    const displayFindings = findings.slice(0, 10);
    const findingSummaries = displayFindings.map(f => this.toFindingSummary(f));
    
    return {
      type: 'hybrid',
      answer,
      findings: findingSummaries,
      metadata,
      // Store all findings for Excel export
      fullFindings: findings,
    } as any;
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
  // NOTE: Unused helper methods removed. Can be restored from git history if needed in future.
}

// Export singleton instance
export const responseFormatter = new ResponseFormatter();
