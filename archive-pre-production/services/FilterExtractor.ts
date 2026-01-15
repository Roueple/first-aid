/**
 * FilterExtractor Service
 * 
 * Extracts structured filter parameters from natural language queries
 * using pattern matching and validation against the Finding schema.
 * 
 * @see .kiro/specs/smart-query-router/design.md
 * @see .kiro/specs/smart-query-router/requirements.md
 */

import {
  ExtractedFilters,
  FilterValidationResult,
} from '../types/queryRouter.types';
import {
  FindingSeverity,
  FindingStatus,
  ProjectType,
} from '../types/finding.types';

// ============================================================================
// Alias Mapping Tables
// ============================================================================

/**
 * Project type aliases mapping
 * Maps common variations to valid ProjectType enum values
 */
const PROJECT_TYPE_ALIASES: Record<string, ProjectType> = {
  'hotel': 'Hotel',
  'hotels': 'Hotel',
  'apartment': 'Apartment',
  'apartments': 'Apartment',
  'flat': 'Apartment',
  'flats': 'Apartment',
  'hospital': 'Hospital',
  'hospitals': 'Hospital',
  'clinic': 'Clinic',
  'clinics': 'Clinic',
  'school': 'School',
  'schools': 'School',
  'university': 'University',
  'universities': 'University',
  'college': 'University',
  'mall': 'Mall',
  'malls': 'Mall',
  'shopping center': 'Mall',
  'shopping centre': 'Mall',
  'office': 'Office Building',
  'office building': 'Office Building',
  'landed house': 'Landed House',
  'house': 'Landed House',
  'houses': 'Landed House',
  'insurance': 'Insurance',
  'mixed-use': 'Mixed-Use Development',
  'mixed use': 'Mixed-Use Development',
};

/**
 * Severity aliases mapping
 * Maps common severity terms to valid FindingSeverity enum values
 */
const SEVERITY_ALIASES: Record<string, FindingSeverity> = {
  'critical': 'Critical',
  'urgent': 'Critical',
  'severe': 'Critical',
  'high': 'High',
  'important': 'High',
  'medium': 'Medium',
  'moderate': 'Medium',
  'low': 'Low',
  'minor': 'Low',
};

/**
 * Status aliases mapping
 * Maps common status terms to valid FindingStatus enum values
 */
const STATUS_ALIASES: Record<string, FindingStatus> = {
  'open': 'Open',
  'pending': 'Open',
  'new': 'Open',
  'in progress': 'In Progress',
  'ongoing': 'In Progress',
  'working': 'In Progress',
  'closed': 'Closed',
  'resolved': 'Closed',
  'done': 'Closed',
  'completed': 'Closed',
  'deferred': 'Deferred',
  'postponed': 'Deferred',
  'delayed': 'Deferred',
};

// ============================================================================
// FilterExtractor Class
// ============================================================================

/**
 * Service for extracting structured filters from natural language queries
 */
export class FilterExtractor {
  /**
   * Extract filters using pattern matching (fast, no API cost)
   * @param query - Natural language query string
   * @returns Extracted filters
   */
  extractWithPatterns(query: string): ExtractedFilters {
    const filters: ExtractedFilters = {};
    const lowerQuery = query.toLowerCase();

    // Extract year
    const year = this.extractYear(lowerQuery);
    if (year !== undefined) {
      filters.year = year;
    }

    // Extract project type
    const projectType = this.extractProjectType(lowerQuery);
    if (projectType !== undefined) {
      filters.projectType = projectType;
    }

    // Extract severity
    const severity = this.extractSeverity(lowerQuery);
    if (severity.length > 0) {
      filters.severity = severity;
    }

    // Extract status
    const status = this.extractStatus(lowerQuery);
    if (status.length > 0) {
      filters.status = status;
    }

    // Extract department
    const department = this.extractDepartment(lowerQuery);
    if (department !== undefined) {
      filters.department = department;
    }

    // Extract keywords
    const keywords = this.extractKeywords(query);
    if (keywords.length > 0) {
      filters.keywords = keywords;
    }

    return filters;
  }

  /**
   * Extract year from query
   * Handles 4-digit years and relative references
   * @param query - Lowercase query string
   * @returns Extracted year as string or undefined
   */
  private extractYear(query: string): string | undefined {
    const currentYear = new Date().getFullYear();

    // Check for relative year references
    if (/\b(this year|current year)\b/i.test(query)) {
      return String(currentYear);
    }
    if (/\b(last year|previous year)\b/i.test(query)) {
      return String(currentYear - 1);
    }
    if (/\b(next year)\b/i.test(query)) {
      return String(currentYear + 1);
    }

    // Extract 4-digit year (2000-2099)
    const yearMatch = query.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      if (year >= 2000 && year <= 2099) {
        return String(year);
      }
    }

    return undefined;
  }

  /**
   * Extract project type from query
   * @param query - Lowercase query string
   * @returns Extracted project type or undefined
   */
  private extractProjectType(query: string): ProjectType | undefined {
    // Sort aliases by length (longest first) to match more specific terms first
    const sortedAliases = Object.keys(PROJECT_TYPE_ALIASES).sort(
      (a, b) => b.length - a.length
    );

    for (const alias of sortedAliases) {
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${alias}\\b`, 'i');
      if (regex.test(query)) {
        return PROJECT_TYPE_ALIASES[alias];
      }
    }

    return undefined;
  }

  /**
   * Extract severity levels from query
   * @param query - Lowercase query string
   * @returns Array of extracted severity levels
   */
  private extractSeverity(query: string): FindingSeverity[] {
    const severities = new Set<FindingSeverity>();

    // Sort aliases by length (longest first) to match more specific terms first
    const sortedAliases = Object.keys(SEVERITY_ALIASES).sort(
      (a, b) => b.length - a.length
    );

    for (const alias of sortedAliases) {
      const regex = new RegExp(`\\b${alias}\\b`, 'i');
      if (regex.test(query)) {
        severities.add(SEVERITY_ALIASES[alias]);
      }
    }

    return Array.from(severities);
  }

  /**
   * Extract status values from query
   * @param query - Lowercase query string
   * @returns Array of extracted status values
   */
  private extractStatus(query: string): FindingStatus[] {
    const statuses = new Set<FindingStatus>();

    // Sort aliases by length (longest first) to match more specific terms first
    const sortedAliases = Object.keys(STATUS_ALIASES).sort(
      (a, b) => b.length - a.length
    );

    for (const alias of sortedAliases) {
      const regex = new RegExp(`\\b${alias}\\b`, 'i');
      if (regex.test(query)) {
        statuses.add(STATUS_ALIASES[alias]);
      }
    }

    return Array.from(statuses);
  }

  /**
   * Extract department from query
   * Handles both explicit mentions ("IT department") and implicit mentions ("IT findings")
   * @param query - Lowercase query string
   * @returns Extracted department or undefined
   */
  private extractDepartment(query: string): string | undefined {
    // Common department names (case-insensitive)
    const commonDepartments = [
      'IT', 'HR', 'Finance', 'Sales', 'Procurement', 'Legal',
      'Marketing', 'Operations', 'Accounting', 'Admin', 'Administration',
      'Engineering', 'R&D', 'Research', 'Development', 'Customer Service',
      'Support', 'Logistics', 'Supply Chain', 'Quality', 'QA', 'QC',
      'Production', 'Manufacturing', 'Warehouse', 'Security', 'Facilities',
      'Maintenance', 'Compliance', 'Audit', 'Risk', 'Treasury', 'Tax',
      'Payroll', 'Benefits', 'Training', 'Recruitment', 'Communications'
    ];

    // Pattern 1: Explicit department mention with "department" or "dept" keyword
    const explicitPatterns = [
      /\b(?:in|from|at|for)\s+(?:the\s+)?([A-Za-z][A-Za-z\s&]+?)\s+(?:department|dept)\b/i,
      /\b(?:department|dept):\s*([A-Za-z\s&]+)/i,
      /\b(?:department|dept)\s+(?:is|=|:)?\s*([A-Za-z\s&]+)/i,
    ];

    for (const pattern of explicitPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Pattern 2: Implicit department mention (e.g., "IT findings", "HR issues", "show me Finance")
    // Check if any common department name appears in the query
    for (const dept of commonDepartments) {
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${dept}\\b`, 'i');
      if (regex.test(query)) {
        // Verify it's not part of another context (e.g., "IT system" might still mean IT department)
        // For now, we'll accept any match as a department reference
        return dept;
      }
    }

    // Pattern 3: Department mentioned with context words
    const contextPatterns = [
      /\b(?:show|list|find|get|display)\s+(?:me\s+)?([A-Za-z]+)\s+(?:findings?|issues?|problems?)/i,
      /\b([A-Za-z]+)\s+(?:findings?|issues?|problems?)\s+(?:in|from|for)/i,
      /\b(?:in|from|for)\s+([A-Za-z]+)\s+(?:findings?|issues?|problems?)/i,
    ];

    for (const pattern of contextPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].trim();
        // Check if the candidate is a known department
        if (commonDepartments.some(d => d.toLowerCase() === candidate.toLowerCase())) {
          return candidate;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract keywords for text search
   * Extracts quoted phrases and significant terms
   * @param query - Original query string (preserves case)
   * @returns Array of keywords
   */
  private extractKeywords(query: string): string[] {
    const keywords: string[] = [];

    // Extract quoted phrases
    const quotedPhrases = query.match(/"([^"]+)"/g);
    if (quotedPhrases) {
      quotedPhrases.forEach(phrase => {
        // Remove quotes
        keywords.push(phrase.replace(/"/g, ''));
      });
    }

    // Extract significant terms (3+ characters, not common words)
    const commonWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
      'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how',
      'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did',
      'its', 'let', 'put', 'say', 'she', 'too', 'use', 'show', 'list', 'find',
      'from', 'with', 'that', 'this', 'have', 'what', 'when', 'where', 'which',
      'about', 'there', 'their', 'would', 'could', 'should', 'findings', 'finding',
    ]);

    // Remove quoted content to avoid duplicate extraction
    const queryWithoutQuotes = query.replace(/"[^"]+"/g, '');
    
    // Extract words
    const words = queryWithoutQuotes.match(/\b[A-Za-z]{3,}\b/g);
    if (words) {
      words.forEach(word => {
        const lowerWord = word.toLowerCase();
        if (!commonWords.has(lowerWord)) {
          keywords.push(word);
        }
      });
    }

    // Remove duplicates (case-insensitive)
    const uniqueKeywords = Array.from(
      new Map(keywords.map(k => [k.toLowerCase(), k])).values()
    );

    return uniqueKeywords;
  }

  /**
   * Validate extracted filters against Finding schema
   * @param filters - Extracted filters to validate
   * @returns Validation result with sanitized filters
   */
  validateFilters(filters: ExtractedFilters): FilterValidationResult {
    const errors: string[] = [];
    const sanitizedFilters: ExtractedFilters = {};

    // Validate year
    if (filters.year !== undefined) {
      const yearNum = parseInt(filters.year, 10);
      if (yearNum >= 2000 && yearNum <= 2099) {
        sanitizedFilters.year = filters.year;
      } else {
        errors.push(`Invalid year: ${filters.year}. Must be between 2000 and 2099.`);
      }
    }

    // Validate project type
    if (filters.projectType !== undefined) {
      const validProjectTypes: ProjectType[] = [
        'Hotel', 'Landed House', 'Apartment', 'School', 'University',
        'Insurance', 'Hospital', 'Clinic', 'Mall', 'Office Building',
        'Mixed-Use Development'
      ];
      if (validProjectTypes.includes(filters.projectType)) {
        sanitizedFilters.projectType = filters.projectType;
      } else {
        errors.push(`Invalid project type: ${filters.projectType}`);
      }
    }

    // Validate severity
    if (filters.severity !== undefined && filters.severity.length > 0) {
      const validSeverities: FindingSeverity[] = ['Critical', 'High', 'Medium', 'Low'];
      const validatedSeverities = filters.severity.filter(s => 
        validSeverities.includes(s)
      );
      if (validatedSeverities.length > 0) {
        sanitizedFilters.severity = validatedSeverities;
      }
      if (validatedSeverities.length < filters.severity.length) {
        const invalid = filters.severity.filter(s => !validSeverities.includes(s));
        errors.push(`Invalid severity values: ${invalid.join(', ')}`);
      }
    }

    // Validate status
    if (filters.status !== undefined && filters.status.length > 0) {
      const validStatuses: FindingStatus[] = ['Open', 'In Progress', 'Closed', 'Deferred'];
      const validatedStatuses = filters.status.filter(s => 
        validStatuses.includes(s)
      );
      if (validatedStatuses.length > 0) {
        sanitizedFilters.status = validatedStatuses;
      }
      if (validatedStatuses.length < filters.status.length) {
        const invalid = filters.status.filter(s => !validStatuses.includes(s));
        errors.push(`Invalid status values: ${invalid.join(', ')}`);
      }
    }

    // Department - no specific validation needed, just copy
    if (filters.department !== undefined) {
      sanitizedFilters.department = filters.department;
    }

    // Keywords - no specific validation needed, just copy
    if (filters.keywords !== undefined && filters.keywords.length > 0) {
      sanitizedFilters.keywords = filters.keywords;
    }

    // Date range - validate if present
    if (filters.dateRange !== undefined) {
      const { start, end } = filters.dateRange;
      if (start && end && start > end) {
        errors.push('Invalid date range: start date must be before end date');
      } else {
        sanitizedFilters.dateRange = filters.dateRange;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedFilters,
    };
  }

  /**
   * Extract filters using AI (Gemini function calling)
   * This is a placeholder for future implementation
   * @param query - Natural language query string
   * @returns Promise of extracted filters
   */
  async extractWithAI(query: string): Promise<ExtractedFilters> {
    // TODO: Implement Gemini function calling for more accurate extraction
    // For now, fall back to pattern-based extraction
    return this.extractWithPatterns(query);
  }
}

// Export singleton instance
export const filterExtractor = new FilterExtractor();
