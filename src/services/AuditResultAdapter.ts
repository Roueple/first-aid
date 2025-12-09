/**
 * AuditResultAdapter
 * 
 * Bridges the gap between AuditResult and Finding types.
 * Converts audit results to a format compatible with the existing RAG context builder.
 * 
 * This adapter allows the SmartQueryRouter to work seamlessly with audit results
 * while maintaining compatibility with the Finding-based context builder.
 */

import { AuditResult } from './AuditResultService';
import { Finding, FindingSeverity } from '../types/finding.types';
import { Timestamp } from 'firebase/firestore';

/**
 * Extended Finding type that includes audit result data
 */
export interface AuditResultFinding extends Finding {
  // Original audit result fields
  auditResultId: string;
  sh: string;
  bobot: number;
  kadar: number;
  nilai: number;
}

/**
 * AuditResultAdapter class
 */
export class AuditResultAdapter {
  /**
   * Convert AuditResult to Finding format for RAG context
   * 
   * Maps audit result fields to finding fields:
   * - descriptions → findingDescription
   * - riskArea → findingTitle
   * - department → findingDepartment
   * - nilai → findingTotal (for severity calculation)
   */
  convertToFinding(auditResult: AuditResult): AuditResultFinding {
    // Calculate priority level from nilai (score)
    const priorityLevel = this.calculatePriorityFromNilai(auditResult.nilai);

    // Generate a finding ID from audit result ID
    const findingId = `AR-${auditResult.auditResultId}`;

    // Create timestamp if not exists
    const now = Timestamp.now();

    return {
      // Core identification
      id: findingId,
      auditYear: auditResult.year,

      // Organizational structure
      subholding: auditResult.sh,
      projectType: this.mapProjectType(auditResult.projectName),
      projectName: auditResult.projectName,
      findingDepartment: auditResult.department,

      // Audit team (use defaults for audit results)
      executor: 'System',
      reviewer: 'System',
      manager: 'System',

      // Finding classification
      controlCategory: 'Detective', // Default for audit results
      processArea: auditResult.riskArea,

      // Finding details
      findingTitle: auditResult.riskArea,
      findingDescription: auditResult.descriptions,
      rootCause: `Risk identified in ${auditResult.riskArea}`,
      impactDescription: `Impact score: ${auditResult.nilai}`,
      recommendation: `Address ${auditResult.code} findings in ${auditResult.department}`,

      // Severity & Priority
      findingBobot: auditResult.bobot,
      findingKadar: auditResult.kadar,
      findingTotal: auditResult.nilai,
      priorityLevel,

      // Tags
      primaryTag: auditResult.code,
      secondaryTags: [auditResult.department, auditResult.riskArea],

      // Metadata
      creationTimestamp: auditResult.createdAt || now,
      lastModifiedDate: auditResult.updatedAt || now,
      modifiedBy: auditResult.createdBy || 'System',
      notes: `Audit Result ID: ${auditResult.auditResultId}`,

      // Status tracking
      status: 'Open', // Default status for audit results
      dateIdentified: auditResult.createdAt || now,

      // Import tracking
      originalSource: 'audit-results',
      importBatch: `audit-results-${auditResult.year}`,

      // Original audit result fields
      auditResultId: auditResult.auditResultId,
      sh: auditResult.sh,
      bobot: auditResult.bobot,
      kadar: auditResult.kadar,
      nilai: auditResult.nilai,
    };
  }

  /**
   * Convert multiple audit results to findings
   */
  convertManyToFindings(auditResults: AuditResult[]): AuditResultFinding[] {
    return auditResults.map(ar => this.convertToFinding(ar));
  }

  /**
   * Calculate priority level from nilai (score)
   * 
   * Nilai ranges from 1-20 (bobot 1-4 × kadar 1-5)
   * - Critical: 16-20
   * - High: 11-15
   * - Medium: 6-10
   * - Low: 1-5
   */
  private calculatePriorityFromNilai(nilai: number): FindingSeverity {
    if (nilai >= 16) return 'Critical';
    if (nilai >= 11) return 'High';
    if (nilai >= 6) return 'Medium';
    return 'Low';
  }

  /**
   * Map project name to project type
   * Uses heuristics to determine project type from name
   */
  private mapProjectType(projectName: string): any {
    const nameLower = projectName.toLowerCase();

    if (nameLower.includes('hotel')) return 'Hotel';
    if (nameLower.includes('hospital') || nameLower.includes('rumah sakit')) return 'Hospital';
    if (nameLower.includes('clinic') || nameLower.includes('klinik')) return 'Clinic';
    if (nameLower.includes('apartment') || nameLower.includes('apartemen')) return 'Apartment';
    if (nameLower.includes('mall') || nameLower.includes('plaza')) return 'Mall';
    if (nameLower.includes('office')) return 'Office Building';
    if (nameLower.includes('school') || nameLower.includes('sekolah')) return 'School';
    if (nameLower.includes('university') || nameLower.includes('universitas')) return 'University';
    if (nameLower.includes('insurance') || nameLower.includes('asuransi')) return 'Insurance';
    if (nameLower.includes('house') || nameLower.includes('rumah')) return 'Landed House';

    // Default to Mixed-Use if can't determine
    return 'Mixed-Use Development';
  }

  /**
   * Extract searchable text from audit result
   * Used for keyword-based relevance scoring
   */
  extractSearchableText(auditResult: AuditResult): string {
    return [
      auditResult.projectName,
      auditResult.department,
      auditResult.riskArea,
      auditResult.descriptions,
      auditResult.code,
      auditResult.sh,
    ].filter(Boolean).join(' ');
  }

  /**
   * Calculate relevance score for audit result based on filters
   * Similar to ContextBuilder's relevance scoring but adapted for audit results
   */
  calculateRelevance(
    auditResult: AuditResult,
    filters: {
      year?: number;
      department?: string;
      keywords?: string[];
      projectName?: string;
    }
  ): number {
    let score = 0;

    // Year match (30 points)
    if (filters.year && auditResult.year === filters.year) {
      score += 30;
    }

    // Department match (25 points)
    if (filters.department && 
        auditResult.department.toLowerCase().includes(filters.department.toLowerCase())) {
      score += 25;
    }

    // Project name match (20 points)
    if (filters.projectName &&
        auditResult.projectName.toLowerCase().includes(filters.projectName.toLowerCase())) {
      score += 20;
    }

    // Keyword matches (up to 25 points)
    if (filters.keywords && filters.keywords.length > 0) {
      const searchableText = this.extractSearchableText(auditResult).toLowerCase();
      let keywordMatches = 0;

      for (const keyword of filters.keywords) {
        if (searchableText.includes(keyword.toLowerCase())) {
          keywordMatches++;
        }
      }

      score += (keywordMatches / filters.keywords.length) * 25;
    }

    return score;
  }

  /**
   * Sort audit results by relevance
   */
  sortByRelevance(
    auditResults: AuditResult[],
    filters: {
      year?: number;
      department?: string;
      keywords?: string[];
      projectName?: string;
    }
  ): AuditResult[] {
    return auditResults
      .map(ar => ({
        auditResult: ar,
        relevance: this.calculateRelevance(ar, filters),
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .map(item => item.auditResult);
  }

  /**
   * Select top N most relevant audit results
   */
  selectTopRelevant(
    auditResults: AuditResult[],
    filters: {
      year?: number;
      department?: string;
      keywords?: string[];
      projectName?: string;
    },
    topN: number = 20
  ): AuditResult[] {
    const sorted = this.sortByRelevance(auditResults, filters);
    return sorted.slice(0, topN);
  }

  /**
   * Build context string from audit results
   * Formats audit results for AI context injection
   */
  buildContextString(auditResults: AuditResult[], maxTokens: number = 10000): string {
    if (auditResults.length === 0) {
      return 'No audit results available for analysis.';
    }

    const CHARS_PER_TOKEN = 4;
    let context = 'Relevant Audit Results:\n\n';
    let currentChars = context.length;

    for (let i = 0; i < auditResults.length; i++) {
      const ar = auditResults[i];
      const resultText = this.formatAuditResultForContext(ar, i + 1);
      const resultChars = resultText.length;

      // Check if adding this result would exceed token limit
      if ((currentChars + resultChars) / CHARS_PER_TOKEN > maxTokens) {
        context += `\n[Context truncated: ${auditResults.length - i} additional audit results omitted due to token limit]`;
        break;
      }

      context += resultText + '\n';
      currentChars += resultChars;
    }

    return context.trim();
  }

  /**
   * Format single audit result for context
   */
  private formatAuditResultForContext(auditResult: AuditResult, index: number): string {
    const priorityLevel = this.calculatePriorityFromNilai(auditResult.nilai);

    return `Audit Result ${index} [${auditResult.auditResultId}]:
Project: ${auditResult.projectName}
Year: ${auditResult.year}
Department: ${auditResult.department}
Risk Area: ${auditResult.riskArea}
Description: ${auditResult.descriptions}
Code: ${auditResult.code}
Severity: ${priorityLevel} (Score: ${auditResult.nilai} = Bobot ${auditResult.bobot} × Kadar ${auditResult.kadar})
Subholding: ${auditResult.sh}
`;
  }
}

// Export singleton instance
export const auditResultAdapter = new AuditResultAdapter();
