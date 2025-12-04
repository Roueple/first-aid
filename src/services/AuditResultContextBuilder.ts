/**
 * AuditResultContextBuilder
 * 
 * Specialized context builder for audit results that combines:
 * 1. Keyword-based relevance scoring (fast, structured queries)
 * 2. Semantic similarity search (complex, analytical queries)
 * 3. Hybrid approach (best of both worlds)
 * 
 * This is the core RAG component that selects the most relevant audit results
 * to provide as context to the AI for answering user queries.
 */

import { AuditResult } from './AuditResultService';
import { semanticSearchService, SemanticSearchResult } from './SemanticSearchService';
import { auditResultAdapter } from './AuditResultAdapter';
import { ExtractedFilters } from '../types/queryRouter.types';

/**
 * Context selection strategy
 */
export type ContextStrategy = 'keyword' | 'semantic' | 'hybrid';

/**
 * Context building options
 */
export interface ContextBuildOptions {
  /** Maximum number of audit results to include */
  maxResults?: number;
  /** Maximum token count for context */
  maxTokens?: number;
  /** Context selection strategy */
  strategy?: ContextStrategy;
  /** Minimum relevance/similarity threshold */
  minThreshold?: number;
}

/**
 * Context building result
 */
export interface ContextBuildResult {
  /** Formatted context string for AI */
  contextString: string;
  /** Selected audit results */
  selectedResults: AuditResult[];
  /** Strategy used */
  strategyUsed: ContextStrategy;
  /** Estimated token count */
  estimatedTokens: number;
  /** Selection metadata */
  metadata: {
    totalCandidates: number;
    selectedCount: number;
    averageRelevance: number;
    truncated: boolean;
  };
}

/**
 * AuditResultContextBuilder class
 */
export class AuditResultContextBuilder {
  private readonly DEFAULT_MAX_RESULTS = 20;
  private readonly DEFAULT_MAX_TOKENS = 10000;
  private readonly CHARS_PER_TOKEN = 4;

  /**
   * Build context from audit results using intelligent selection
   * 
   * @param query - User's natural language query
   * @param auditResults - Pool of audit results to select from
   * @param filters - Extracted filters from query
   * @param options - Context building options
   * @returns Context building result
   */
  async buildContext(
    query: string,
    auditResults: AuditResult[],
    filters: ExtractedFilters,
    options: ContextBuildOptions = {}
  ): Promise<ContextBuildResult> {
    const {
      maxResults = this.DEFAULT_MAX_RESULTS,
      maxTokens = this.DEFAULT_MAX_TOKENS,
      strategy = this.determineStrategy(query, filters),
      minThreshold = 0.2,
    } = options;

    console.log(`📚 Building context with strategy: ${strategy}`);
    console.log(`   Query: "${query}"`);
    console.log(`   Candidates: ${auditResults.length}`);
    console.log(`   Max results: ${maxResults}, Max tokens: ${maxTokens}`);

    if (auditResults.length === 0) {
      return this.emptyContext();
    }

    // Select audit results based on strategy
    let selectedResults: AuditResult[];
    let relevanceScores: number[];

    switch (strategy) {
      case 'semantic':
        ({ selectedResults, relevanceScores } = await this.selectWithSemantic(
          query,
          auditResults,
          maxResults,
          minThreshold
        ));
        break;

      case 'hybrid':
        ({ selectedResults, relevanceScores } = await this.selectWithHybrid(
          query,
          auditResults,
          filters,
          maxResults,
          minThreshold
        ));
        break;

      case 'keyword':
      default:
        ({ selectedResults, relevanceScores } = this.selectWithKeyword(
          auditResults,
          filters,
          maxResults
        ));
        break;
    }

    // Build context string with token limit
    const { contextString, truncated, actualCount } = this.buildContextString(
      selectedResults,
      maxTokens
    );

    const estimatedTokens = Math.ceil(contextString.length / this.CHARS_PER_TOKEN);
    const averageRelevance = relevanceScores.length > 0
      ? relevanceScores.reduce((sum, score) => sum + score, 0) / relevanceScores.length
      : 0;

    console.log(`✅ Context built: ${actualCount} results, ${estimatedTokens} tokens`);
    console.log(`   Average relevance: ${averageRelevance.toFixed(2)}`);

    return {
      contextString,
      selectedResults: selectedResults.slice(0, actualCount),
      strategyUsed: strategy,
      estimatedTokens,
      metadata: {
        totalCandidates: auditResults.length,
        selectedCount: actualCount,
        averageRelevance,
        truncated,
      },
    };
  }

  /**
   * Determine optimal strategy based on query and filters
   */
  private determineStrategy(query: string, filters: ExtractedFilters): ContextStrategy {
    // If semantic search is not available, use keyword
    if (!semanticSearchService.isAvailable()) {
      return 'keyword';
    }

    // Check if query has analytical/complex intent
    const analyticalKeywords = [
      'why', 'how', 'analyze', 'compare', 'trend', 'pattern',
      'recommend', 'suggest', 'explain', 'understand', 'insight',
      'relationship', 'correlation', 'impact', 'cause', 'effect',
    ];

    const queryLower = query.toLowerCase();
    const hasAnalyticalIntent = analyticalKeywords.some(keyword => 
      queryLower.includes(keyword)
    );

    // If has specific filters, use hybrid (structured + semantic)
    const hasSpecificFilters = 
      filters.year !== undefined ||
      filters.department !== undefined ||
      filters.projectType !== undefined;

    if (hasAnalyticalIntent && hasSpecificFilters) {
      return 'hybrid';
    }

    if (hasAnalyticalIntent) {
      return 'semantic';
    }

    if (hasSpecificFilters) {
      return 'keyword';
    }

    // Default to hybrid for best results
    return 'hybrid';
  }

  /**
   * Select audit results using keyword-based relevance
   */
  private selectWithKeyword(
    auditResults: AuditResult[],
    filters: ExtractedFilters,
    maxResults: number
  ): { selectedResults: AuditResult[]; relevanceScores: number[] } {
    console.log('🔤 Using keyword-based selection');

    // Convert filters to adapter format
    const adapterFilters = {
      year: filters.year,
      department: filters.department,
      keywords: filters.keywords,
    };

    // Calculate relevance for each result
    const scored = auditResults.map(ar => ({
      auditResult: ar,
      relevance: auditResultAdapter.calculateRelevance(ar, adapterFilters),
    }));

    // Sort by relevance and take top N
    scored.sort((a, b) => b.relevance - a.relevance);
    const topScored = scored.slice(0, maxResults);

    return {
      selectedResults: topScored.map(s => s.auditResult),
      relevanceScores: topScored.map(s => s.relevance / 100), // Normalize to 0-1
    };
  }

  /**
   * Select audit results using semantic similarity
   */
  private async selectWithSemantic(
    query: string,
    auditResults: AuditResult[],
    maxResults: number,
    minThreshold: number
  ): Promise<{ selectedResults: AuditResult[]; relevanceScores: number[] }> {
    console.log('🧠 Using semantic similarity selection');

    const searchResults = await semanticSearchService.semanticSearch(
      query,
      auditResults,
      maxResults,
      minThreshold
    );

    return {
      selectedResults: searchResults.map(r => r.auditResult),
      relevanceScores: searchResults.map(r => r.similarityScore),
    };
  }

  /**
   * Select audit results using hybrid approach
   */
  private async selectWithHybrid(
    query: string,
    auditResults: AuditResult[],
    filters: ExtractedFilters,
    maxResults: number,
    minThreshold: number
  ): Promise<{ selectedResults: AuditResult[]; relevanceScores: number[] }> {
    console.log('🔀 Using hybrid selection (keyword + semantic)');

    // Step 1: Filter with keywords to reduce candidate pool
    const adapterFilters = {
      year: filters.year,
      department: filters.department,
      keywords: filters.keywords,
    };

    const keywordFiltered = auditResultAdapter.selectTopRelevant(
      auditResults,
      adapterFilters,
      maxResults * 3 // Get 3x candidates for semantic ranking
    );

    console.log(`   Keyword filtering: ${auditResults.length} → ${keywordFiltered.length}`);

    // Step 2: Apply semantic search on filtered results
    const searchResults = await semanticSearchService.hybridSearch(
      query,
      keywordFiltered,
      maxResults
    );

    return {
      selectedResults: searchResults.map(r => r.auditResult),
      relevanceScores: searchResults.map(r => r.similarityScore),
    };
  }

  /**
   * Build context string from selected audit results
   */
  private buildContextString(
    auditResults: AuditResult[],
    maxTokens: number
  ): { contextString: string; truncated: boolean; actualCount: number } {
    if (auditResults.length === 0) {
      return {
        contextString: 'No relevant audit results found.',
        truncated: false,
        actualCount: 0,
      };
    }

    let context = 'Relevant Audit Results:\n\n';
    let currentChars = context.length;
    let actualCount = 0;
    let truncated = false;

    for (let i = 0; i < auditResults.length; i++) {
      const ar = auditResults[i];
      const resultText = this.formatAuditResult(ar, i + 1);
      const resultChars = resultText.length;

      // Check token limit
      if ((currentChars + resultChars) / this.CHARS_PER_TOKEN > maxTokens) {
        const remaining = auditResults.length - i;
        context += `\n[Context truncated: ${remaining} additional audit results omitted due to token limit]\n`;
        truncated = true;
        break;
      }

      context += resultText + '\n';
      currentChars += resultChars;
      actualCount++;
    }

    return {
      contextString: context.trim(),
      truncated,
      actualCount,
    };
  }

  /**
   * Format audit result for context
   */
  private formatAuditResult(auditResult: AuditResult, index: number): string {
    const priorityLevel = this.calculatePriority(auditResult.nilai);

    return `Audit Result ${index} [${auditResult.auditResultId}]:
Project: ${auditResult.projectName}
Year: ${auditResult.year}
Department: ${auditResult.department}
Risk Area: ${auditResult.riskArea}
Description: ${auditResult.descriptions}
Code: ${auditResult.code}
Severity: ${priorityLevel} (Score: ${auditResult.nilai})
Subholding: ${auditResult.sh}
`;
  }

  /**
   * Calculate priority from nilai score
   */
  private calculatePriority(nilai: number): string {
    if (nilai >= 16) return 'Critical';
    if (nilai >= 11) return 'High';
    if (nilai >= 6) return 'Medium';
    return 'Low';
  }

  /**
   * Return empty context result
   */
  private emptyContext(): ContextBuildResult {
    return {
      contextString: 'No audit results available for analysis.',
      selectedResults: [],
      strategyUsed: 'keyword',
      estimatedTokens: 10,
      metadata: {
        totalCandidates: 0,
        selectedCount: 0,
        averageRelevance: 0,
        truncated: false,
      },
    };
  }

  /**
   * Estimate tokens for text
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  /**
   * Pre-warm semantic search cache for audit results
   */
  async prewarmCache(auditResults: AuditResult[]): Promise<void> {
    if (!semanticSearchService.isAvailable()) {
      console.log('⚠️ Semantic search not available, skipping cache prewarm');
      return;
    }

    console.log(`🔥 Prewarming semantic search cache for ${auditResults.length} audit results...`);
    await semanticSearchService.preGenerateEmbeddings(auditResults);
    console.log('✅ Cache prewarmed');
  }
}

// Export singleton instance
export const auditResultContextBuilder = new AuditResultContextBuilder();
