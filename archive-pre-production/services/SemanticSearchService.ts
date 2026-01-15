/**
 * SemanticSearchService
 * 
 * Provides semantic search capabilities using Gemini embeddings API.
 * Enables finding semantically similar audit results even when keywords don't match.
 * 
 * Examples:
 * - "water damage" matches "flooding issues"
 * - "financial irregularities" matches "accounting discrepancies"
 * - "safety violations" matches "hazardous conditions"
 * 
 * Architecture:
 * - Uses Gemini text-embedding-004 model for generating embeddings
 * - Stores embeddings in memory cache (can be extended to Firestore)
 * - Calculates cosine similarity for semantic matching
 * - Falls back to keyword search if embeddings unavailable
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AuditResult } from './AuditResultService';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Embedding vector (768 dimensions for text-embedding-004)
 */
export type EmbeddingVector = number[];

/**
 * Cached embedding for an audit result
 */
interface CachedEmbedding {
  auditResultId: string;
  embedding: EmbeddingVector;
  text: string;
  timestamp: number;
}

/**
 * Semantic search result with similarity score
 */
export interface SemanticSearchResult {
  auditResult: AuditResult;
  similarityScore: number; // 0-1, higher is more similar
  matchReason: 'semantic' | 'keyword' | 'hybrid';
}

/**
 * SemanticSearchService class
 */
export class SemanticSearchService {
  private genAI: GoogleGenerativeAI | null = null;
  private embeddingModel: any = null;
  private embeddingCache: Map<string, CachedEmbedding> = new Map();
  private isInitialized = false;
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly EMBEDDING_MODEL = 'text-embedding-004';

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Gemini API for embeddings
   */
  private initialize(): void {
    if (!API_KEY) {
      console.warn('⚠️ Gemini API key not configured - semantic search will use keyword fallback');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(API_KEY);
      this.embeddingModel = this.genAI.getGenerativeModel({ model: this.EMBEDDING_MODEL });
      this.isInitialized = true;
      console.log('✅ Semantic Search Service initialized with', this.EMBEDDING_MODEL);
    } catch (error) {
      console.error('❌ Failed to initialize Semantic Search Service:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Check if semantic search is available
   */
  isAvailable(): boolean {
    return this.isInitialized && this.embeddingModel !== null;
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text: string): Promise<EmbeddingVector | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      return null;
    }
  }

  /**
   * Build searchable text from audit result
   * Note: Excludes projectName to prevent data leakage to LLM embeddings
   * Uses projectId instead for identification
   */
  private buildSearchableText(auditResult: AuditResult): string {
    return [
      auditResult.projectId || 'UNKNOWN_PROJECT',
      auditResult.department,
      auditResult.riskArea,
      auditResult.description,
      auditResult.code,
    ].filter(Boolean).join(' ');
  }

  /**
   * Get or generate embedding for audit result
   */
  async getAuditResultEmbedding(auditResult: AuditResult): Promise<EmbeddingVector | null> {
    const cacheKey = auditResult.auditResultId;
    
    // Check cache
    const cached = this.embeddingCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.embedding;
    }

    // Generate new embedding
    const text = this.buildSearchableText(auditResult);
    const embedding = await this.generateEmbedding(text);

    if (embedding) {
      // Cache it
      this.embeddingCache.set(cacheKey, {
        auditResultId: auditResult.auditResultId,
        embedding,
        text,
        timestamp: Date.now(),
      });
    }

    return embedding;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: EmbeddingVector, vecB: EmbeddingVector): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Calculate keyword similarity (fallback method)
   */
  private keywordSimilarity(query: string, text: string): number {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const textLower = text.toLowerCase();
    
    if (queryWords.length === 0) {
      return 0;
    }

    let matchCount = 0;
    for (const word of queryWords) {
      if (textLower.includes(word)) {
        matchCount++;
      }
    }

    return matchCount / queryWords.length;
  }

  /**
   * Search audit results using semantic similarity
   * 
   * @param query - Natural language search query
   * @param auditResults - Pool of audit results to search
   * @param topK - Number of top results to return
   * @param minSimilarity - Minimum similarity threshold (0-1)
   * @returns Ranked search results with similarity scores
   */
  async semanticSearch(
    query: string,
    auditResults: AuditResult[],
    topK: number = 20,
    minSimilarity: number = 0.3
  ): Promise<SemanticSearchResult[]> {
    console.log(`🔍 Semantic search: "${query}" across ${auditResults.length} audit results`);

    if (auditResults.length === 0) {
      return [];
    }

    // Try semantic search first
    if (this.isAvailable()) {
      try {
        return await this.semanticSearchWithEmbeddings(query, auditResults, topK, minSimilarity);
      } catch (error) {
        console.warn('Semantic search failed, falling back to keyword search:', error);
      }
    }

    // Fallback to keyword search
    return this.keywordSearch(query, auditResults, topK, minSimilarity);
  }

  /**
   * Semantic search using embeddings
   */
  private async semanticSearchWithEmbeddings(
    query: string,
    auditResults: AuditResult[],
    topK: number,
    minSimilarity: number
  ): Promise<SemanticSearchResult[]> {
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);
    if (!queryEmbedding) {
      throw new Error('Failed to generate query embedding');
    }

    // Calculate similarities
    const results: SemanticSearchResult[] = [];
    
    for (const auditResult of auditResults) {
      const embedding = await this.getAuditResultEmbedding(auditResult);
      
      if (!embedding) {
        continue;
      }

      const similarity = this.cosineSimilarity(queryEmbedding, embedding);
      
      if (similarity >= minSimilarity) {
        results.push({
          auditResult,
          similarityScore: similarity,
          matchReason: 'semantic',
        });
      }
    }

    // Sort by similarity (descending) and take top K
    results.sort((a, b) => b.similarityScore - a.similarityScore);
    const topResults = results.slice(0, topK);

    console.log(`✅ Semantic search found ${topResults.length} results (min similarity: ${minSimilarity})`);
    
    return topResults;
  }

  /**
   * Keyword-based search (fallback)
   */
  private keywordSearch(
    query: string,
    auditResults: AuditResult[],
    topK: number,
    minSimilarity: number
  ): Promise<SemanticSearchResult[]> {
    console.log('📝 Using keyword search fallback');

    const results: SemanticSearchResult[] = [];

    for (const auditResult of auditResults) {
      const text = this.buildSearchableText(auditResult);
      const similarity = this.keywordSimilarity(query, text);

      if (similarity >= minSimilarity) {
        results.push({
          auditResult,
          similarityScore: similarity,
          matchReason: 'keyword',
        });
      }
    }

    // Sort by similarity (descending) and take top K
    results.sort((a, b) => b.similarityScore - a.similarityScore);
    const topResults = results.slice(0, topK);

    console.log(`✅ Keyword search found ${topResults.length} results`);

    return Promise.resolve(topResults);
  }

  /**
   * Hybrid search: Combine semantic and keyword matching
   * 
   * @param query - Search query
   * @param auditResults - Pool of audit results
   * @param topK - Number of results to return
   * @returns Hybrid search results with combined scoring
   */
  async hybridSearch(
    query: string,
    auditResults: AuditResult[],
    topK: number = 20
  ): Promise<SemanticSearchResult[]> {
    console.log(`🔀 Hybrid search: "${query}"`);

    if (!this.isAvailable()) {
      // If semantic search unavailable, use keyword only
      return this.keywordSearch(query, auditResults, topK, 0.1);
    }

    try {
      // Get semantic results
      const semanticResults = await this.semanticSearchWithEmbeddings(
        query,
        auditResults,
        topK * 2, // Get more candidates
        0.2 // Lower threshold for semantic
      );

      // Get keyword results
      const keywordResults = await this.keywordSearch(
        query,
        auditResults,
        topK * 2,
        0.1 // Lower threshold for keywords
      );

      // Combine results with weighted scoring
      const combinedMap = new Map<string, SemanticSearchResult>();

      // Add semantic results (weight: 0.7)
      for (const result of semanticResults) {
        combinedMap.set(result.auditResult.auditResultId, {
          ...result,
          similarityScore: result.similarityScore * 0.7,
          matchReason: 'hybrid',
        });
      }

      // Add/merge keyword results (weight: 0.3)
      for (const result of keywordResults) {
        const existing = combinedMap.get(result.auditResult.auditResultId);
        if (existing) {
          // Combine scores
          existing.similarityScore += result.similarityScore * 0.3;
        } else {
          combinedMap.set(result.auditResult.auditResultId, {
            ...result,
            similarityScore: result.similarityScore * 0.3,
            matchReason: 'hybrid',
          });
        }
      }

      // Sort and take top K
      const combined = Array.from(combinedMap.values());
      combined.sort((a, b) => b.similarityScore - a.similarityScore);
      const topResults = combined.slice(0, topK);

      console.log(`✅ Hybrid search found ${topResults.length} results`);

      return topResults;
    } catch (error) {
      console.error('Hybrid search failed:', error);
      // Fallback to keyword only
      return this.keywordSearch(query, auditResults, topK, 0.1);
    }
  }

  /**
   * Pre-generate embeddings for a batch of audit results
   * Useful for warming up the cache
   */
  async preGenerateEmbeddings(auditResults: AuditResult[]): Promise<void> {
    if (!this.isAvailable()) {
      console.warn('Semantic search not available, skipping embedding generation');
      return;
    }

    console.log(`🔄 Pre-generating embeddings for ${auditResults.length} audit results...`);
    
    let generated = 0;
    let cached = 0;

    for (const auditResult of auditResults) {
      const cacheKey = auditResult.auditResultId;
      
      if (this.embeddingCache.has(cacheKey)) {
        cached++;
        continue;
      }

      await this.getAuditResultEmbedding(auditResult);
      generated++;

      // Rate limiting: small delay every 10 requests
      if (generated % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Embeddings ready: ${generated} generated, ${cached} cached`);
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
    console.log('🗑️ Embedding cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; oldestEntry: number | null } {
    let oldestTimestamp: number | null = null;

    for (const entry of this.embeddingCache.values()) {
      if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    }

    return {
      size: this.embeddingCache.size,
      oldestEntry: oldestTimestamp,
    };
  }
}

// Export singleton instance
export const semanticSearchService = new SemanticSearchService();
