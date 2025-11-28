/**
 * ContextBuilder Service
 * 
 * Selects and formats relevant findings for AI context injection.
 * Implements relevance scoring, finding selection with limits, and token estimation.
 * 
 * Requirements:
 * - 4.2: Limit context injection to maximum of 20 findings
 * - 7.1: Limit total context to 10,000 tokens
 * - 7.4: Prioritize most relevant findings based on extracted filters
 * 
 * @see .kiro/specs/smart-query-router/design.md
 * @see .kiro/specs/smart-query-router/requirements.md
 */

import { Finding } from '../types/finding.types';
import { ExtractedFilters } from '../types/queryRouter.types';

/**
 * Maximum number of findings to include in context
 */
const MAX_FINDINGS_COUNT = 20;

/**
 * Maximum token count for context
 */
const MAX_CONTEXT_TOKENS = 10000;

/**
 * Approximate tokens per character (rough estimate: 1 token ≈ 4 characters)
 */
const CHARS_PER_TOKEN = 4;

/**
 * Finding with relevance score
 */
interface ScoredFinding {
  finding: Finding;
  relevanceScore: number;
}

/**
 * ContextBuilder service for preparing AI context from findings
 */
export class ContextBuilder {
  /**
   * Build context string from findings for AI analysis
   * 
   * @param findings - Array of findings to build context from
   * @param maxTokens - Maximum token count (default: 10,000)
   * @returns Context string formatted for AI
   */
  buildContext(findings: Finding[], maxTokens: number = MAX_CONTEXT_TOKENS): string {
    if (findings.length === 0) {
      return 'No findings available for analysis.';
    }

    let context = 'Relevant Findings:\n\n';
    let currentTokens = this.estimateTokens(context);

    for (let i = 0; i < findings.length; i++) {
      const finding = findings[i];
      const findingText = this.formatFindingForContext(finding, i + 1);
      const findingTokens = this.estimateTokens(findingText);

      // Check if adding this finding would exceed token limit
      if (currentTokens + findingTokens > maxTokens) {
        context += `\n[Context truncated: ${findings.length - i} additional findings omitted due to token limit]`;
        break;
      }

      context += findingText + '\n';
      currentTokens += findingTokens;
    }

    return context.trim();
  }

  /**
   * Select most relevant findings based on query filters
   * 
   * @param allFindings - All available findings
   * @param filters - Extracted filters from query
   * @param maxCount - Maximum number of findings to select (default: 20)
   * @returns Selected findings sorted by relevance
   */
  selectRelevantFindings(
    allFindings: Finding[],
    filters: ExtractedFilters,
    maxCount: number = MAX_FINDINGS_COUNT
  ): Finding[] {
    if (allFindings.length === 0) {
      return [];
    }

    // Score all findings
    const scoredFindings: ScoredFinding[] = allFindings.map(finding => ({
      finding,
      relevanceScore: this.calculateRelevanceScore(finding, filters),
    }));

    // Sort by relevance score (descending)
    scoredFindings.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Take top N findings
    const selectedFindings = scoredFindings
      .slice(0, maxCount)
      .map(sf => sf.finding);

    return selectedFindings;
  }

  /**
   * Estimate token count for a given text
   * Uses a simple heuristic: 1 token ≈ 4 characters
   * 
   * @param text - Text to estimate tokens for
   * @returns Estimated token count
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  /**
   * Calculate relevance score for a finding based on filters
   * Higher score = more relevant
   * 
   * @param finding - Finding to score
   * @param filters - Extracted filters from query
   * @returns Relevance score (0-100)
   */
  private calculateRelevanceScore(finding: Finding, filters: ExtractedFilters): number {
    let score = 0;

    // Year match (20 points)
    if (filters.year && finding.auditYear === filters.year) {
      score += 20;
    }

    // Project type match (20 points)
    if (filters.projectType && finding.projectType === filters.projectType) {
      score += 20;
    }

    // Severity match (15 points)
    if (filters.severity && filters.severity.includes(finding.priorityLevel)) {
      score += 15;
    }

    // Status match (15 points)
    if (filters.status && filters.status.includes(finding.status)) {
      score += 15;
    }

    // Department match (10 points)
    if (filters.department && 
        finding.findingDepartment.toLowerCase().includes(filters.department.toLowerCase())) {
      score += 10;
    }

    // Keyword matches (up to 20 points)
    if (filters.keywords && filters.keywords.length > 0) {
      const keywordScore = this.calculateKeywordScore(finding, filters.keywords);
      score += keywordScore;
    }

    return score;
  }

  /**
   * Calculate keyword match score for a finding
   * 
   * @param finding - Finding to check
   * @param keywords - Keywords to search for
   * @returns Keyword score (0-20)
   */
  private calculateKeywordScore(finding: Finding, keywords: string[]): number {
    const searchableText = [
      finding.findingTitle,
      finding.findingDescription,
      finding.rootCause,
      finding.impactDescription,
      finding.recommendation,
      finding.primaryTag,
      ...finding.secondaryTags,
    ].join(' ').toLowerCase();

    let matchCount = 0;
    for (const keyword of keywords) {
      if (searchableText.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    // Each keyword match is worth up to 20/keywords.length points
    // Maximum 20 points total
    return Math.min(20, (matchCount / keywords.length) * 20);
  }

  /**
   * Format a finding for context injection
   * 
   * @param finding - Finding to format
   * @param index - Finding number in the list
   * @returns Formatted finding text
   */
  private formatFindingForContext(finding: Finding, index: number): string {
    const dateStr = finding.dateIdentified?.toDate?.() 
      ? finding.dateIdentified.toDate().toISOString().split('T')[0]
      : 'N/A';

    return `Finding ${index} [${finding.id}]:
Title: ${finding.findingTitle}
Severity: ${finding.priorityLevel}
Status: ${finding.status}
Project: ${finding.projectType} - ${finding.projectName}
Department: ${finding.findingDepartment}
Year: ${finding.auditYear}
Date: ${dateStr}
Description: ${finding.findingDescription}
Root Cause: ${finding.rootCause}
Impact: ${finding.impactDescription}
Recommendation: ${finding.recommendation}
Tags: ${finding.primaryTag}${finding.secondaryTags.length > 0 ? ', ' + finding.secondaryTags.join(', ') : ''}
`;
  }
}

// Export singleton instance
export const contextBuilder = new ContextBuilder();
