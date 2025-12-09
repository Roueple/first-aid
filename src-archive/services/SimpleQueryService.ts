import { SimpleQueryMatcher, QueryPattern, MatchResult } from './SimpleQueryMatcher';
import { SimpleQueryExecutor, SimpleQueryResult } from './SimpleQueryExecutor';
import { AuditResultService } from './AuditResultService';
import { allPatterns } from './queryPatterns';
import { getConfig, recordMatch, recordFallback } from '../config/simpleQuery.config';

/**
 * Query cache entry
 */
interface QueryCacheEntry {
  key: string;
  result: SimpleQueryResult;
  timestamp: number;
  ttl: number;
}

/**
 * SimpleQueryService - Main service coordinating pattern matching and execution
 * 
 * Responsibilities:
 * - Coordinate SimpleQueryMatcher and SimpleQueryExecutor
 * - Process queries with pattern matching
 * - Collect and return metadata (execution time, pattern matched, results count)
 * - Manage patterns (add, validate, list)
 * - Cache query results with TTL
 */
export class SimpleQueryService {
  private matcher: SimpleQueryMatcher;
  private executor: SimpleQueryExecutor;
  private cache: Map<string, QueryCacheEntry>;
  private cacheEnabled: boolean;
  private defaultCacheTTL: number;

  constructor(
    auditResultService: AuditResultService,
    patterns: QueryPattern[] = allPatterns,
    options: {
      cacheEnabled?: boolean;
      cacheTTL?: number;
    } = {}
  ) {
    // Use configuration if no explicit options provided
    const config = getConfig();
    
    this.matcher = new SimpleQueryMatcher(patterns);
    this.executor = new SimpleQueryExecutor(auditResultService);
    this.cache = new Map();
    this.cacheEnabled = options.cacheEnabled ?? config.cacheEnabled;
    this.defaultCacheTTL = options.cacheTTL ?? config.cacheTTL;
  }

  /**
   * Process a query through pattern matching and execution
   * Returns null if no pattern matches (caller should fall back to LLM)
   */
  async processQuery(
    query: string,
    _userId: string,
    _sessionId?: string
  ): Promise<SimpleQueryResult | null> {
    const startTime = Date.now();

    try {
      // Check cache first if enabled
      let cacheHit = false;
      if (this.cacheEnabled) {
        const cachedResult = this.getCachedResult(query);
        if (cachedResult) {
          cacheHit = true;
          // Update execution time to reflect cache hit
          const cacheHitTime = Date.now() - startTime;
          
          // Record metrics
          recordMatch(cachedResult.metadata.patternMatched, cacheHitTime, true);
          
          return {
            ...cachedResult,
            metadata: {
              ...cachedResult.metadata,
              executionTimeMs: cacheHitTime,
            },
          };
        }
      }

      // Match query against patterns
      const matchResult: MatchResult = this.matcher.match(query);

      if (!matchResult.matched || !matchResult.pattern || !matchResult.params) {
        // No pattern matched - return null to trigger fallback
        recordFallback(query);
        return null;
      }

      // Execute the matched pattern
      const result = await this.executor.execute(
        matchResult.pattern,
        matchResult.params
      );

      // Update execution time to include matching time
      const totalExecutionTime = Date.now() - startTime;
      result.metadata.executionTimeMs = totalExecutionTime;

      // Record metrics
      recordMatch(matchResult.pattern.id, totalExecutionTime, cacheHit);

      // Cache the result if enabled
      if (this.cacheEnabled) {
        this.cacheResult(query, result, this.defaultCacheTTL);
      }

      return result;
    } catch (error) {
      console.error('SimpleQueryService error:', error);
      // Return null to trigger fallback to LLM
      recordFallback(query);
      return null;
    }
  }

  /**
   * Get all available patterns
   */
  getAvailablePatterns(): QueryPattern[] {
    return this.matcher.getPatterns();
  }

  /**
   * Add a custom pattern
   * Validates the pattern before adding
   * @throws Error if pattern is invalid or conflicts with existing patterns
   */
  addCustomPattern(pattern: QueryPattern): void {
    this.matcher.addPattern(pattern);
  }

  /**
   * Get a pattern by ID
   */
  getPatternById(id: string): QueryPattern | undefined {
    return this.matcher.getPatternById(id);
  }

  /**
   * Remove a pattern by ID
   */
  removePattern(id: string): boolean {
    return this.matcher.removePattern(id);
  }

  /**
   * Validate a pattern without adding it
   */
  validatePattern(pattern: QueryPattern) {
    return this.matcher.validatePattern(pattern);
  }

  /**
   * Get pattern match result without executing
   * Useful for testing and debugging
   */
  matchQuery(query: string): MatchResult {
    return this.matcher.match(query);
  }

  /**
   * Generate cache key from query
   */
  private generateCacheKey(query: string): string {
    // Normalize query for consistent caching
    return query.trim().toLowerCase();
  }

  /**
   * Get cached result if available and not expired
   */
  private getCachedResult(query: string): SimpleQueryResult | null {
    const key = this.generateCacheKey(query);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if cache entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Cache expired, remove it
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  /**
   * Cache a query result
   */
  private cacheResult(query: string, result: SimpleQueryResult, ttl: number): void {
    const key = this.generateCacheKey(query);
    
    this.cache.set(key, {
      key,
      result,
      timestamp: Date.now(),
      ttl,
    });

    // Clean up expired entries periodically
    this.cleanupExpiredCache();
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cached results
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    enabled: boolean;
    ttl: number;
  } {
    return {
      size: this.cache.size,
      enabled: this.cacheEnabled,
      ttl: this.defaultCacheTTL,
    };
  }

  /**
   * Enable or disable caching
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }

  /**
   * Set cache TTL
   */
  setCacheTTL(ttl: number): void {
    this.defaultCacheTTL = ttl;
  }
}
