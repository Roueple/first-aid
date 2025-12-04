/**
 * QueryRouterService
 * 
 * Main orchestrator for the Smart Query Router system.
 * Routes queries to appropriate execution paths based on classification.
 * 
 * @see .kiro/specs/smart-query-router/design.md
 * @see .kiro/specs/smart-query-router/requirements.md
 * 
 * Requirements covered:
 * - 3.1: Simple query execution via direct Firestore
 * - 4.1: Complex query execution with AI analysis
 * - 5.1, 5.2: Hybrid query execution (database + AI)
 * - 8.1, 8.2, 8.3, 8.4, 8.5: Error handling with fallbacks
 */

import { 
  QueryResponse, 
  QueryOptions, 
  QueryIntent,
  QueryType,
  QueryMetadata,
  ExtractedFilters,
  QueryRouterError,
  QueryErrorResponse
} from '../types/queryRouter.types';
import { AuditResult } from './AuditResultService';
import { FindingFilters } from '../types/filter.types';
import { QueryClassifier } from './QueryClassifier';
import { FilterExtractor } from './FilterExtractor';
import { SmartFilterExtractor, smartFilterExtractor } from './SmartFilterExtractor';
import { ContextBuilder } from './ContextBuilder';
import { ResponseFormatter } from './ResponseFormatter';
import auditResultService from './AuditResultService';
import { sendMessageToGemini, isGeminiConfigured } from './GeminiService';

/**
 * QueryRouterService interface
 */
export interface IQueryRouterService {
  /**
   * Main entry point - routes query to appropriate handler
   */
  routeQuery(userQuery: string, options?: QueryOptions): Promise<QueryResponse | QueryErrorResponse>;
  
  /**
   * Get query classification without executing
   */
  classifyQuery(userQuery: string): Promise<QueryIntent>;
  
  /**
   * Execute with specific query type (override classification)
   */
  executeAs(userQuery: string, queryType: QueryType, options?: QueryOptions): Promise<QueryResponse | QueryErrorResponse>;
}

/**
 * QueryRouterService implementation
 */
export class QueryRouterService implements IQueryRouterService {
  private classifier: QueryClassifier;
  private filterExtractor: FilterExtractor;
  private smartFilterExtractor: SmartFilterExtractor;
  private contextBuilder: ContextBuilder;
  private responseFormatter: ResponseFormatter;

  constructor() {
    this.classifier = new QueryClassifier();
    this.filterExtractor = new FilterExtractor();
    this.smartFilterExtractor = smartFilterExtractor;
    this.contextBuilder = new ContextBuilder();
    this.responseFormatter = new ResponseFormatter();
  }

  /**
   * Main entry point - classify and route query
   * Requirements: 3.1, 4.1, 5.1, 8.1
   */
  async routeQuery(
    userQuery: string, 
    options: QueryOptions = {}
  ): Promise<QueryResponse | QueryErrorResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Classify the query
      const intent = await this.classifyQuery(userQuery);
      
      // Use forced query type if provided, otherwise use classified type
      const queryType = options.forceQueryType || intent.type;
      
      // Step 2: Route to appropriate handler
      return await this.executeQueryByType(
        userQuery,
        queryType,
        intent,
        startTime,
        options
      );
    } catch (error) {
      // Requirement 8.1: Fallback on classification error
      console.error('Query routing error:', error);
      return this.handleError(
        error,
        'CLASSIFICATION_ERROR',
        startTime,
        userQuery,
        options
      );
    }
  }

  /**
   * Get query classification without executing
   */
  async classifyQuery(userQuery: string): Promise<QueryIntent> {
    return await this.classifier.classify(userQuery);
  }

  /**
   * Execute with specific query type (override classification)
   */
  async executeAs(
    userQuery: string,
    queryType: QueryType,
    options: QueryOptions = {}
  ): Promise<QueryResponse | QueryErrorResponse> {
    const startTime = Date.now();

    try {
      // Get intent for filter extraction
      const intent = await this.classifyQuery(userQuery);
      
      // Execute with forced type
      return await this.executeQueryByType(
        userQuery,
        queryType,
        intent,
        startTime,
        options
      );
    } catch (error) {
      console.error('Query execution error:', error);
      return this.handleError(
        error,
        'CLASSIFICATION_ERROR',
        startTime,
        userQuery,
        options
      );
    }
  }

  /**
   * Execute query based on type
   * Requirements: 3.1, 4.1, 5.1, 5.2
   */
  private async executeQueryByType(
    userQuery: string,
    queryType: QueryType,
    intent: QueryIntent,
    startTime: number,
    options: QueryOptions
  ): Promise<QueryResponse | QueryErrorResponse> {
    switch (queryType) {
      case 'simple':
        return await this.executeSimpleQuery(userQuery, intent, startTime, options);
      
      case 'complex':
        return await this.executeComplexQuery(userQuery, intent, startTime, options);
      
      case 'hybrid':
        return await this.executeHybridQuery(userQuery, intent, startTime, options);
      
      default:
        throw new Error(`Unknown query type: ${queryType}`);
    }
  }

  /**
   * Execute simple query - direct Firestore lookup
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  private async executeSimpleQuery(
    userQuery: string,
    intent: QueryIntent,
    startTime: number,
    options: QueryOptions
  ): Promise<QueryResponse | QueryErrorResponse> {
    try {
      // Extract and validate filters using smart extraction (AI + patterns)
      const extractedFilters = await this.smartFilterExtractor.extractWithHybrid(userQuery);
      const validation = this.filterExtractor.validateFilters(extractedFilters);
      
      if (!validation.valid) {
        console.warn('Filter validation warnings:', validation.errors);
      }
      
      // Convert to FindingFilters format
      const findingFilters = this.convertToFindingFilters(validation.sanitizedFilters);
      
      // Query audit-results
      const page = options.page || 1;
      const result = await this.queryAuditResults(findingFilters, page);
      
      // Requirement 3.4: Handle zero results
      if (result.length === 0) {
        const metadata = this.responseFormatter.buildMetadata(
          'simple',
          startTime,
          0,
          intent.confidence,
          extractedFilters
        );
        
        return {
          type: 'simple',
          answer: 'No audit results match your search criteria. Try broadening your search by:\n' +
                  '- Removing some filters\n' +
                  '- Using different keywords\n' +
                  '- Expanding the date range',
          findings: [],
          metadata
        };
      }
      
      // Build metadata
      const metadata = this.responseFormatter.buildMetadata(
        'simple',
        startTime,
        result.length,
        intent.confidence,
        extractedFilters
      );
      
      // Format response
      return this.responseFormatter.formatSimpleResults(
        result as any,
        metadata,
        page
      );
    } catch (error) {
      // Requirement 8.2: Handle Firestore errors
      console.error('Simple query execution error:', error);
      return this.handleError(
        error,
        'DATABASE_ERROR',
        startTime,
        userQuery,
        options,
        intent
      );
    }
  }

  /**
   * Execute complex query - AI analysis with RAG context
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
   */
  private async executeComplexQuery(
    userQuery: string,
    intent: QueryIntent,
    startTime: number,
    options: QueryOptions
  ): Promise<QueryResponse | QueryErrorResponse> {
    try {
      // Check if Gemini is configured
      if (!isGeminiConfigured()) {
        throw new Error('AI service is not configured');
      }
      
      // Extract filters to find relevant context using smart extraction
      const extractedFilters = await this.smartFilterExtractor.extractWithHybrid(userQuery);
      const validation = this.filterExtractor.validateFilters(extractedFilters);
      
      // Get relevant audit results for context
      const findingFilters = this.convertToFindingFilters(validation.sanitizedFilters);
      const allResults = await this.queryAuditResults(findingFilters, 1);
      
      // Requirement 4.2: Select top 20 most relevant audit results
      const relevantFindings = this.contextBuilder.selectRelevantFindings(
        allResults as any,
        extractedFilters,
        20
      );
      
      // Requirement 7.1: Build context with token limit
      const context = this.contextBuilder.buildContext(relevantFindings, 10000);
      
      // Estimate tokens used
      const tokensUsed = this.contextBuilder.estimateTokens(context + userQuery);
      
      // Build prompt with context
      const prompt = this.buildAIPrompt(userQuery, context);
      
      // Requirement 4.3: Call GeminiService
      const thinkingMode = options.thinkingMode || 'low';
      const aiResponse = await sendMessageToGemini(
        prompt,
        thinkingMode,
        options.sessionId
      );
      
      // Build metadata
      const metadata = this.responseFormatter.buildMetadata(
        'complex',
        startTime,
        relevantFindings.length,
        intent.confidence,
        extractedFilters,
        tokensUsed
      );
      
      // Requirement 4.5: Format response with finding references
      return this.responseFormatter.formatAIResponse(
        aiResponse,
        relevantFindings,
        metadata
      );
    } catch (error) {
      // Requirement 8.3: Handle AI errors with fallback
      console.error('Complex query execution error:', error);
      return this.handleError(
        error,
        'AI_ERROR',
        startTime,
        userQuery,
        options,
        intent
      );
    }
  }

  /**
   * Execute hybrid query - database retrieval + AI analysis
   * Requirements: 5.1, 5.2, 5.3, 5.4
   */
  private async executeHybridQuery(
    userQuery: string,
    intent: QueryIntent,
    startTime: number,
    options: QueryOptions
  ): Promise<QueryResponse | QueryErrorResponse> {
    try {
      // Step 1: Execute database query portion using smart extraction
      const extractedFilters = await this.smartFilterExtractor.extractWithHybrid(userQuery);
      const validation = this.filterExtractor.validateFilters(extractedFilters);
      
      const findingFilters = this.convertToFindingFilters(validation.sanitizedFilters);
      const page = options.page || 1;
      const result = await this.queryAuditResults(findingFilters, page);
      
      // Requirement 5.4: Handle zero results - skip AI analysis
      if (result.length === 0) {
        const metadata = this.responseFormatter.buildMetadata(
          'hybrid',
          startTime,
          0,
          intent.confidence,
          extractedFilters
        );
        
        return {
          type: 'hybrid',
          answer: 'No audit results match your search criteria. Try broadening your search by:\n' +
                  '- Removing some filters\n' +
                  '- Using different keywords\n' +
                  '- Expanding the date range',
          findings: [],
          metadata
        };
      }
      
      // Step 2: Pass audit results to AI for analysis
      if (!isGeminiConfigured()) {
        // Fallback to simple results if AI not available
        const metadata = this.responseFormatter.buildMetadata(
          'hybrid',
          startTime,
          result.length,
          intent.confidence,
          extractedFilters
        );
        
        return this.responseFormatter.formatSimpleResults(
          result as any,
          metadata,
          page
        );
      }
      
      // Select relevant audit results for AI context
      const relevantFindings = this.contextBuilder.selectRelevantFindings(
        result as any,
        extractedFilters,
        20
      );
      
      // Build context
      const context = this.contextBuilder.buildContext(relevantFindings, 10000);
      const tokensUsed = this.contextBuilder.estimateTokens(context + userQuery);
      
      // Build AI prompt
      const prompt = this.buildAIPrompt(userQuery, context);
      
      // Get AI analysis
      const thinkingMode = options.thinkingMode || 'low';
      const aiAnalysis = await sendMessageToGemini(
        prompt,
        thinkingMode,
        options.sessionId
      );
      
      // Build metadata
      const metadata = this.responseFormatter.buildMetadata(
        'hybrid',
        startTime,
        result.length,
        intent.confidence,
        extractedFilters,
        tokensUsed
      );
      
      // Requirement 5.3: Format with separated sections
      return this.responseFormatter.formatHybridResponse(
        result as any,
        aiAnalysis,
        metadata,
        page
      );
    } catch (error) {
      console.error('Hybrid query execution error:', error);
      return this.handleError(
        error,
        error instanceof Error && error.message.includes('AI') ? 'AI_ERROR' : 'DATABASE_ERROR',
        startTime,
        userQuery,
        options,
        intent
      );
    }
  }

  /**
   * Query audit results with filters
   */
  private async queryAuditResults(filters: FindingFilters, page: number = 1): Promise<AuditResult[]> {
    const pageSize = 50;
    const queryFilters: any[] = [];

    // Map filters to audit-results fields
    if (filters.auditYear && filters.auditYear.length > 0) {
      queryFilters.push({ field: 'year', operator: '==', value: filters.auditYear[0] });
    }

    if (filters.findingDepartment && filters.findingDepartment.length > 0) {
      queryFilters.push({ field: 'department', operator: '==', value: filters.findingDepartment[0] });
    }

    const results = await auditResultService.getAll({
      filters: queryFilters,
      sorts: [{ field: 'year', direction: 'desc' }],
    });

    // Client-side filtering for text search
    let filteredResults = results;
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filteredResults = results.filter(r => 
        r.projectName.toLowerCase().includes(searchLower) ||
        r.department.toLowerCase().includes(searchLower) ||
        r.riskArea.toLowerCase().includes(searchLower) ||
        r.descriptions.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredResults.slice(start, end);
  }

  /**
   * Convert ExtractedFilters to FindingFilters format
   */
  private convertToFindingFilters(extracted: ExtractedFilters): FindingFilters {
    const filters: FindingFilters = {};
    
    // Map severity to priorityLevel (correct field name in database)
    if (extracted.severity) {
      filters.priorityLevel = extracted.severity;
    }
    
    if (extracted.status) {
      filters.status = extracted.status;
    }
    
    // Map department to findingDepartment (correct field name in database)
    if (extracted.department) {
      filters.findingDepartment = [extracted.department];
    }
    
    // Map year to auditYear (correct field name in database)
    if (extracted.year) {
      filters.auditYear = [extracted.year];
    }
    
    // Map projectType (correct field name in database)
    if (extracted.projectType) {
      filters.projectType = [extracted.projectType];
    }
    
    if (extracted.keywords && extracted.keywords.length > 0) {
      filters.searchText = extracted.keywords.join(' ');
    }
    
    if (extracted.dateRange) {
      filters.dateIdentified = extracted.dateRange;
    }
    
    return filters;
  }

  /**
   * Build AI prompt with context
   */
  private buildAIPrompt(userQuery: string, context: string): string {
    return `You are an AI assistant analyzing audit findings data. Use the following findings as context to answer the user's question.

${context}

---

User Question: ${userQuery}

Please provide a comprehensive answer based on the findings data above. Include specific references to findings when relevant.`;
  }

  /**
   * Handle errors with appropriate fallbacks
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
   */
  private async handleError(
    error: unknown,
    errorCode: QueryRouterError['code'],
    startTime: number,
    userQuery: string,
    options: QueryOptions,
    intent?: QueryIntent
  ): Promise<QueryErrorResponse> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    let suggestion: string | undefined;
    let fallbackData: Finding[] | undefined;
    
    // Provide specific suggestions based on error type
    switch (errorCode) {
      case 'DATABASE_ERROR':
        // Requirement 8.2: Firestore error handling
        suggestion = 'Unable to search findings. Please try again in a moment.';
        break;
      
      case 'AI_ERROR':
        // Requirement 8.3: AI error with fallback to database results
        suggestion = 'AI analysis unavailable. Showing database results only.';
        
        // Try to get fallback data
        try {
          if (intent) {
            const extractedFilters = await this.smartFilterExtractor.extractFilters(userQuery);
            const validation = this.filterExtractor.validateFilters(extractedFilters);
            const findingFilters = this.convertToFindingFilters(validation.sanitizedFilters);
            const result = await this.queryAuditResults(findingFilters, options.page || 1);
            fallbackData = result as any;
          }
        } catch (fallbackError) {
          console.error('Failed to get fallback data:', fallbackError);
        }
        break;
      
      case 'RATE_LIMIT_ERROR':
        // Requirement 8.4: Rate limit handling
        suggestion = 'AI query limit exceeded. Please try using simpler search queries or try again later.';
        break;
      
      case 'CLASSIFICATION_ERROR':
        // Requirement 8.1: Classification error fallback
        suggestion = 'Unable to process query. Please try rephrasing your question.';
        break;
      
      case 'VALIDATION_ERROR':
        suggestion = 'Invalid query parameters. Please check your search criteria.';
        break;
    }
    
    // Build error metadata
    const metadata: QueryMetadata = {
      queryType: intent?.type || 'complex',
      executionTimeMs: Date.now() - startTime,
      findingsAnalyzed: fallbackData?.length || 0,
      confidence: intent?.confidence || 0,
      extractedFilters: intent?.extractedFilters || {},
    };
    
    // Requirement 8.5: Log error details
    console.error('Query Router Error:', {
      code: errorCode,
      message: errorMessage,
      query: userQuery,
      metadata,
    });
    
    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        suggestion,
        fallbackData,
      },
      metadata,
    };
  }
}

// Export singleton instance
export const queryRouterService = new QueryRouterService();

