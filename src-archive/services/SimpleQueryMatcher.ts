import { QueryFilter, QuerySort } from './DatabaseService';

/**
 * Parameter extractor configuration
 */
export interface ParameterExtractor {
  name: string;
  type: 'string' | 'number' | 'boolean';
  captureGroup: number;
  normalizer?: 'capitalize' | 'uppercase' | 'lowercase' | 'trim';
}

/**
 * Extracted parameters from query matching
 */
export interface ExtractedParams {
  [key: string]: string | number | boolean;
}

/**
 * Query pattern definition
 */
export interface QueryPattern {
  id: string;
  name: string;
  priority: number;
  regex: RegExp;
  parameterExtractors: ParameterExtractor[];
  filterBuilder: (params: ExtractedParams) => QueryFilter[];
  sortBuilder: (params: ExtractedParams) => QuerySort[];
}

/**
 * Pattern match result
 */
export interface MatchResult {
  matched: boolean;
  pattern?: QueryPattern;
  params?: ExtractedParams;
  confidence: number;
}

/**
 * Pattern validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  conflicts?: string[];
}

/**
 * SimpleQueryMatcher - Matches user queries against predefined patterns
 * 
 * Responsibilities:
 * - Register and manage query patterns
 * - Match queries against patterns with priority ordering
 * - Extract parameters from matched queries
 * - Validate patterns for conflicts
 */
export class SimpleQueryMatcher {
  private patterns: QueryPattern[] = [];
  private sortedPatterns: QueryPattern[] = [];
  private compiledPatterns: Map<string, RegExp> = new Map();

  constructor(patterns: QueryPattern[] = []) {
    patterns.forEach(pattern => this.addPattern(pattern));
  }

  /**
   * Match a query against registered patterns
   * Returns the highest priority match
   */
  match(query: string): MatchResult {
    if (!query || query.trim().length === 0) {
      return {
        matched: false,
        confidence: 0,
      };
    }

    const normalizedQuery = query.trim();

    // Try to match each pattern in priority order (pre-sorted)
    // Early exit on first match
    for (const pattern of this.sortedPatterns) {
      const regex = this.compiledPatterns.get(pattern.id) || pattern.regex;
      const match = normalizedQuery.match(regex);

      if (match) {
        // Extract parameters
        const params = this.extractParameters(match, pattern.parameterExtractors);
        
        return {
          matched: true,
          pattern,
          params,
          confidence: 1.0, // Exact regex match = 100% confidence
        };
      }
    }

    return {
      matched: false,
      confidence: 0,
    };
  }

  /**
   * Add a new pattern to the matcher
   * Validates the pattern before adding
   */
  addPattern(pattern: QueryPattern): void {
    const validation = this.validatePattern(pattern);
    
    if (!validation.valid) {
      throw new Error(
        `Invalid pattern "${pattern.id}": ${validation.errors.join(', ')}`
      );
    }

    // Check for conflicts with existing patterns
    if (validation.conflicts && validation.conflicts.length > 0) {
      throw new Error(
        `Pattern "${pattern.id}" conflicts with: ${validation.conflicts.join(', ')}`
      );
    }

    this.patterns.push(pattern);
    this.compiledPatterns.set(pattern.id, pattern.regex);
    
    // Re-sort patterns by priority (highest first) for optimized matching
    this.sortPatternsByPriority();
  }

  /**
   * Sort patterns by priority (highest first)
   * This optimization ensures we check higher priority patterns first
   */
  private sortPatternsByPriority(): void {
    this.sortedPatterns = [...this.patterns].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Validate a pattern for correctness and conflicts
   */
  validatePattern(pattern: QueryPattern): ValidationResult {
    const errors: string[] = [];
    const conflicts: string[] = [];

    // Validate required fields
    if (!pattern.id || pattern.id.trim().length === 0) {
      errors.push('Pattern ID is required');
    }

    if (!pattern.name || pattern.name.trim().length === 0) {
      errors.push('Pattern name is required');
    }

    if (typeof pattern.priority !== 'number') {
      errors.push('Pattern priority must be a number');
    }

    if (!(pattern.regex instanceof RegExp)) {
      errors.push('Pattern regex must be a RegExp instance');
    }

    if (!Array.isArray(pattern.parameterExtractors)) {
      errors.push('Parameter extractors must be an array');
    }

    if (typeof pattern.filterBuilder !== 'function') {
      errors.push('Filter builder must be a function');
    }

    if (typeof pattern.sortBuilder !== 'function') {
      errors.push('Sort builder must be a function');
    }

    // Validate parameter extractors
    if (Array.isArray(pattern.parameterExtractors)) {
      pattern.parameterExtractors.forEach((extractor, index) => {
        if (!extractor.name) {
          errors.push(`Parameter extractor ${index} missing name`);
        }
        if (!['string', 'number', 'boolean'].includes(extractor.type)) {
          errors.push(`Parameter extractor ${index} has invalid type`);
        }
        if (typeof extractor.captureGroup !== 'number' || extractor.captureGroup < 0) {
          errors.push(`Parameter extractor ${index} has invalid capture group`);
        }
      });
    }

    // Check for conflicts with existing patterns
    if (pattern.regex instanceof RegExp) {
      for (const existingPattern of this.patterns) {
        // Skip if checking against itself
        if (existingPattern.id === pattern.id) {
          continue;
        }

        // Check if patterns have identical regex
        if (existingPattern.regex.source === pattern.regex.source &&
            existingPattern.regex.flags === pattern.regex.flags) {
          conflicts.push(existingPattern.id);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    };
  }

  /**
   * Extract parameters from regex match using extractors
   */
  private extractParameters(
    match: RegExpMatchArray,
    extractors: ParameterExtractor[]
  ): ExtractedParams {
    const params: ExtractedParams = {};

    for (const extractor of extractors) {
      // Get the captured value (capture groups start at 1)
      let value = match[extractor.captureGroup] || match[extractor.captureGroup + 1];
      
      if (value === undefined || value === null) {
        continue;
      }

      // Apply normalizer if specified
      if (extractor.normalizer) {
        value = this.normalizeValue(value, extractor.normalizer);
      }

      // Convert to the specified type
      params[extractor.name] = this.convertType(value, extractor.type);
    }

    return params;
  }

  /**
   * Normalize a string value
   */
  private normalizeValue(value: string, normalizer: string): string {
    switch (normalizer) {
      case 'capitalize':
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      case 'uppercase':
        return value.toUpperCase();
      case 'lowercase':
        return value.toLowerCase();
      case 'trim':
        return value.trim();
      default:
        return value;
    }
  }

  /**
   * Convert a string value to the specified type
   */
  private convertType(value: string, type: 'string' | 'number' | 'boolean'): string | number | boolean {
    switch (type) {
      case 'number': {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      }
      case 'boolean':
        return value.toLowerCase() === 'true' || value === '1';
      case 'string':
      default:
        return value;
    }
  }

  /**
   * Get all registered patterns
   */
  getPatterns(): QueryPattern[] {
    return [...this.patterns];
  }

  /**
   * Get a pattern by ID
   */
  getPatternById(id: string): QueryPattern | undefined {
    return this.patterns.find(p => p.id === id);
  }

  /**
   * Remove a pattern by ID
   */
  removePattern(id: string): boolean {
    const index = this.patterns.findIndex(p => p.id === id);
    if (index !== -1) {
      this.patterns.splice(index, 1);
      this.compiledPatterns.delete(id);
      // Re-sort after removal
      this.sortPatternsByPriority();
      return true;
    }
    return false;
  }

  /**
   * Clear all patterns
   */
  clearPatterns(): void {
    this.patterns = [];
    this.sortedPatterns = [];
    this.compiledPatterns.clear();
  }
}
