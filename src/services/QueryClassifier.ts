/**
 * QueryClassifier Service
 * 
 * Analyzes natural language queries to determine the optimal execution strategy.
 * Classifies queries as 'simple', 'complex', or 'hybrid' based on pattern matching.
 * 
 * @see .kiro/specs/smart-query-router/design.md
 * @see .kiro/specs/smart-query-router/requirements.md
 * 
 * Requirements covered:
 * - 1.1: Simple query classification for filterable-only queries
 * - 1.2: Complex query classification for analytical queries
 * - 1.3: Hybrid query classification for data retrieval + analysis
 * - 1.4: Confidence score between 0 and 1
 * - 1.5: Default to complex if confidence < 0.6
 */

import { 
  QueryIntent, 
  QueryType, 
  ExtractedFilters 
} from '../types/queryRouter.types';
import { FindingSeverity, FindingStatus, ProjectType } from '../types/finding.types';

// ============================================================================
// Pattern Definitions
// ============================================================================

/**
 * Simple query indicators - queries that can be answered by direct database lookup
 * These patterns match queries asking for listings, counts, or filtered data
 */
export const SIMPLE_PATTERNS: RegExp[] = [
  /\b(show|list|find|get|display|give me|what are)\b.*\b(findings?|issues?|problems?|items?|records?)\b/i,
  /\bhow many\b.*\b(findings?|issues?|problems?)\b/i,
  /\b(in|from|during)\s+\d{4}\b/i,
  /\b(critical|high|medium|low)\s+(priority|severity|findings?|issues?)\b/i,
  /\b(open|closed|in progress|deferred)\s+(findings?|status|issues?)\b/i,
  /\b(all|every)\s+(findings?|issues?)\b/i,
  /\bfindings?\s+(in|from|for|at)\b/i,
  /\b(hotel|apartment|hospital|school|university|clinic|mall|office|house)\s+(findings?|issues?|projects?)\b/i,
  /\bcount\s+(of\s+)?(findings?|issues?)\b/i,
  /\b(filter|search)\s+(by|for)\b/i,
];

/**
 * Complex query indicators - queries requiring AI reasoning and analysis
 * These patterns match analytical, recommendation, or insight-seeking queries
 */
export const COMPLEX_PATTERNS: RegExp[] = [
  /\b(what|why|how)\s+should\b/i,
  /\b(recommend|suggest|advise|propose)\b/i,
  /\b(analyze|analysis|analyse)\b/i,
  /\b(patterns?|trends?|tendenc(y|ies))\b/i,
  /\b(compare|comparison|versus|vs\.?)\b/i,
  /\b(predict|forecast|anticipate|expect)\b/i,
  /\b(prioritize|priority|important|focus|urgent)\s+(on|for|based)\b/i,
  /\bbased on\b.*\b(findings?|data|history|historical)\b/i,
  /\b(insights?|conclusions?|takeaways?)\b/i,
  /\b(improve|improvement|better|optimize)\b/i,
  /\b(risk|risks|risky)\s+(assessment|analysis|evaluation)\b/i,
  /\b(root cause|causes?|reasons?)\s+(analysis|for|of|behind)\b/i,
  /\b(summary|summarize|summarise|overview)\b/i,
  /\b(explain|explanation|elaborate)\b/i,
  /\bwhat\s+(can|could|would|might)\b/i,
];

/**
 * Hybrid query indicators - queries needing both data retrieval and AI analysis
 * These patterns match queries that explicitly request data followed by analysis
 */
export const HYBRID_PATTERNS: RegExp[] = [
  /\b(show|list|find|get)\b.*\b(and|then)\b.*\b(explain|analyze|summarize|analyse)\b/i,
  /\b(findings?|issues?)\b.*\b(and|then)\b.*\b(what|why|how)\b/i,
  /\b(list|show)\b.*\b(with|including)\b.*\b(analysis|explanation|summary)\b/i,
  /\b(get|find)\b.*\b(and)\b.*\b(recommend|suggest|advise)\b/i,
  /\b(display|show)\b.*\b(explain|describe)\b.*\b(patterns?|trends?)\b/i,
];

// ============================================================================
// Alias Mappings (for filter extraction hints)
// ============================================================================

/**
 * Project type aliases for detection
 */
export const PROJECT_TYPE_ALIASES: Record<string, ProjectType> = {
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
  'offices': 'Office Building',
  'landed house': 'Landed House',
  'house': 'Landed House',
  'houses': 'Landed House',
  'insurance': 'Insurance',
  'mixed-use': 'Mixed-Use Development',
  'mixed use': 'Mixed-Use Development',
};

/**
 * Severity aliases for detection
 */
export const SEVERITY_ALIASES: Record<string, FindingSeverity> = {
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
 * Status aliases for detection
 */
export const STATUS_ALIASES: Record<string, FindingStatus> = {
  'open': 'Open',
  'pending': 'Open',
  'new': 'Open',
  'in progress': 'In Progress',
  'in-progress': 'In Progress',
  'ongoing': 'In Progress',
  'working': 'In Progress',
  'closed': 'Closed',
  'resolved': 'Closed',
  'done': 'Closed',
  'completed': 'Closed',
  'fixed': 'Closed',
  'deferred': 'Deferred',
  'postponed': 'Deferred',
  'delayed': 'Deferred',
};

// ============================================================================
// QueryClassifier Interface
// ============================================================================

export interface IQueryClassifier {
  /**
   * Classify query and extract intent
   */
  classify(query: string): Promise<QueryIntent>;
  
  /**
   * Check if query matches simple patterns
   */
  isSimpleQuery(query: string): boolean;
  
  /**
   * Check if query requires AI analysis
   */
  requiresAIAnalysis(query: string): boolean;
}

// ============================================================================
// QueryClassifier Implementation
// ============================================================================

export class QueryClassifier implements IQueryClassifier {
  /**
   * Classify a query and return the intent with extracted filters
   * 
   * @param query - The natural language query to classify
   * @returns QueryIntent with type, confidence, and extracted filters
   */
  async classify(query: string): Promise<QueryIntent> {
    const normalizedQuery = query.trim().toLowerCase();
    
    // Calculate pattern match scores
    const simpleScore = this.calculatePatternScore(normalizedQuery, SIMPLE_PATTERNS);
    const complexScore = this.calculatePatternScore(normalizedQuery, COMPLEX_PATTERNS);
    const hybridScore = this.calculatePatternScore(normalizedQuery, HYBRID_PATTERNS);
    
    // Extract analysis keywords that triggered complex classification
    const analysisKeywords = this.extractAnalysisKeywords(normalizedQuery);
    
    // Extract basic filters for the intent
    const extractedFilters = this.extractBasicFilters(query);
    
    // Determine query type and confidence
    const { type, confidence } = this.determineQueryType(
      simpleScore, 
      complexScore, 
      hybridScore,
      analysisKeywords.length > 0
    );
    
    // Apply fallback rule: if confidence < 0.6, default to complex (Requirement 1.5)
    const finalType = confidence < 0.6 ? 'complex' : type;
    const requiresAI = finalType === 'complex' || finalType === 'hybrid';
    
    return {
      type: finalType,
      confidence: Math.min(Math.max(confidence, 0), 1), // Ensure bounds [0, 1]
      extractedFilters,
      requiresAI,
      analysisKeywords,
    };
  }
  
  /**
   * Check if a query matches simple query patterns
   * 
   * @param query - The query to check
   * @returns true if the query appears to be a simple lookup query
   */
  isSimpleQuery(query: string): boolean {
    const normalizedQuery = query.trim().toLowerCase();
    const simpleScore = this.calculatePatternScore(normalizedQuery, SIMPLE_PATTERNS);
    const complexScore = this.calculatePatternScore(normalizedQuery, COMPLEX_PATTERNS);
    
    // Simple if it matches simple patterns and doesn't strongly match complex patterns
    return simpleScore > 0 && simpleScore > complexScore;
  }
  
  /**
   * Check if a query requires AI analysis
   * 
   * @param query - The query to check
   * @returns true if the query requires AI reasoning
   */
  requiresAIAnalysis(query: string): boolean {
    const normalizedQuery = query.trim().toLowerCase();
    const complexScore = this.calculatePatternScore(normalizedQuery, COMPLEX_PATTERNS);
    const hybridScore = this.calculatePatternScore(normalizedQuery, HYBRID_PATTERNS);
    
    return complexScore > 0 || hybridScore > 0;
  }
  
  // ============================================================================
  // Private Helper Methods
  // ============================================================================
  
  /**
   * Calculate a score based on how many patterns match the query
   * 
   * @param query - Normalized query string
   * @param patterns - Array of regex patterns to match
   * @returns Score between 0 and 1 based on match count and strength
   */
  private calculatePatternScore(query: string, patterns: RegExp[]): number {
    let matchCount = 0;
    let totalWeight = 0;
    
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        matchCount++;
        // Weight by match length relative to query length
        const matchWeight = match[0].length / query.length;
        totalWeight += Math.min(matchWeight * 2, 1); // Cap individual weight at 1
      }
    }
    
    if (matchCount === 0) return 0;
    
    // Combine match count and weight for final score
    const countScore = Math.min(matchCount / 3, 1); // Normalize: 3+ matches = max
    const weightScore = totalWeight / matchCount;
    
    return (countScore * 0.6 + weightScore * 0.4);
  }
  
  /**
   * Determine the query type based on pattern scores
   * 
   * @param simpleScore - Score for simple patterns
   * @param complexScore - Score for complex patterns
   * @param hybridScore - Score for hybrid patterns
   * @param hasAnalysisKeywords - Whether analysis keywords were found
   * @returns Object with type and confidence
   */
  private determineQueryType(
    simpleScore: number,
    complexScore: number,
    hybridScore: number,
    hasAnalysisKeywords: boolean
  ): { type: QueryType; confidence: number } {
    // Hybrid takes precedence if it has a strong match
    if (hybridScore > 0.3 && hybridScore >= simpleScore * 0.5) {
      return {
        type: 'hybrid',
        confidence: Math.min(hybridScore + 0.2, 1),
      };
    }
    
    // If both simple and complex have matches, consider hybrid
    if (simpleScore > 0.2 && complexScore > 0.2) {
      return {
        type: 'hybrid',
        confidence: Math.min((simpleScore + complexScore) / 2 + 0.1, 1),
      };
    }
    
    // Complex if it has higher score or analysis keywords
    if (complexScore > simpleScore || (hasAnalysisKeywords && complexScore > 0)) {
      return {
        type: 'complex',
        confidence: Math.min(complexScore + 0.3, 1),
      };
    }
    
    // Simple if it has a clear match
    if (simpleScore > 0) {
      return {
        type: 'simple',
        confidence: Math.min(simpleScore + 0.4, 1),
      };
    }
    
    // Default to complex with low confidence if no patterns match
    return {
      type: 'complex',
      confidence: 0.4,
    };
  }
  
  /**
   * Extract keywords that indicate analytical/complex query intent
   * 
   * @param query - Normalized query string
   * @returns Array of matched analysis keywords
   */
  private extractAnalysisKeywords(query: string): string[] {
    const keywords: string[] = [];
    const analyticalTerms = [
      'recommend', 'suggest', 'advise', 'analyze', 'analyse', 'analysis',
      'compare', 'comparison', 'pattern', 'patterns', 'trend', 'trends',
      'predict', 'forecast', 'prioritize', 'priority', 'insight', 'insights',
      'improve', 'improvement', 'optimize', 'summary', 'summarize', 'explain',
      'why', 'how should', 'what should', 'based on'
    ];
    
    for (const term of analyticalTerms) {
      if (query.includes(term)) {
        keywords.push(term);
      }
    }
    
    return keywords;
  }
  
  /**
   * Extract basic filters from the query for the intent
   * This is a lightweight extraction - full extraction is done by FilterExtractor
   * 
   * @param query - Original query string
   * @returns ExtractedFilters with detected values
   */
  private extractBasicFilters(query: string): ExtractedFilters {
    const filters: ExtractedFilters = {};
    const normalizedQuery = query.toLowerCase();
    
    // Extract year (4-digit years between 2000-2099)
    const yearMatch = query.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      filters.year = parseInt(yearMatch[1], 10);
    }
    
    // Handle relative year references
    const currentYear = new Date().getFullYear();
    if (normalizedQuery.includes('last year')) {
      filters.year = currentYear - 1;
    } else if (normalizedQuery.includes('this year')) {
      filters.year = currentYear;
    }
    
    // Extract project type
    for (const [alias, projectType] of Object.entries(PROJECT_TYPE_ALIASES)) {
      if (normalizedQuery.includes(alias)) {
        filters.projectType = projectType;
        break;
      }
    }
    
    // Extract severity
    const severities: FindingSeverity[] = [];
    for (const [alias, severity] of Object.entries(SEVERITY_ALIASES)) {
      if (normalizedQuery.includes(alias) && !severities.includes(severity)) {
        severities.push(severity);
      }
    }
    if (severities.length > 0) {
      filters.severity = severities;
    }
    
    // Extract status
    const statuses: FindingStatus[] = [];
    for (const [alias, status] of Object.entries(STATUS_ALIASES)) {
      if (normalizedQuery.includes(alias) && !statuses.includes(status)) {
        statuses.push(status);
      }
    }
    if (statuses.length > 0) {
      filters.status = statuses;
    }
    
    return filters;
  }
}

// ============================================================================
// Default Export
// ============================================================================

/**
 * Default QueryClassifier instance
 */
export const queryClassifier = new QueryClassifier();

