/**
 * SmartQueryRouter
 * 
 * New intelligent query routing system with the following flow:
 * 1. Mask sensitive data (local)
 * 2. Recognize intent using LLM (understand what user really wants)
 * 3. Route to SQL (simple), RAG (complex), or Hybrid based on intent
 * 4. Unmask results and return complete, accurate data
 * 
 * This handles variations in wording that express the same intent:
 * - "show me critical findings 2024"
 * - "show me severity critical 2024"  
 * - "show me highest risk findings 2024"
 * All recognized as the same intent: Critical severity findings from 2024
 */

import { dataMaskingService, MaskingToken } from './DataMaskingService';
import { intentRecognitionService, RecognizedIntent } from './IntentRecognitionService';
import { ResponseFormatter } from './ResponseFormatter';
import auditResultService from './AuditResultService';
import { sendMessageToGemini, isGeminiConfigured } from './GeminiService';
import { transparentLogger } from './TransparentLogger';
import { auditResultContextBuilder } from './AuditResultContextBuilder';
import { auditResultAdapter } from './AuditResultAdapter';
import { 
  QueryResponse, 
  QueryOptions,
  QueryMetadata,
  QueryErrorResponse,
  QueryRouterError,
  ExtractedFilters
} from '../types/queryRouter.types';
import { AuditResult } from './AuditResultService';
import { FindingFilters } from '../types/filter.types';

export interface SmartQueryResult extends QueryResponse {
  /** Recognized intent for transparency */
  recognizedIntent?: RecognizedIntent;
}

export class SmartQueryRouter {
  // private contextBuilder: ContextBuilder;
  private responseFormatter: ResponseFormatter;

  constructor() {
    // this.contextBuilder = new ContextBuilder();
    this.responseFormatter = new ResponseFormatter();
  }

  /**
   * Main entry point - process query with new intelligent flow
   * 
   * Flow:
   * 1. Mask sensitive data (local for queries, server for findings)
   * 2. Recognize intent (LLM understands what user wants)
   * 3. Route intelligently (SQL/RAG/Hybrid)
   * 4. Unmask and return results
   */
  async processQuery(
    userQuery: string,
    options: QueryOptions = {}
  ): Promise<SmartQueryResult | QueryErrorResponse> {
    const startTime = Date.now();

    // Start transparent logging
    transparentLogger.logFlowStart(userQuery, options.sessionId);

    try {
      // ========================================================================
      // STEP 1: LOCAL MASKING
      // ========================================================================
      transparentLogger.startStep(1, 'LOCAL MASKING', { query: userQuery });
      
      const maskingResult = dataMaskingService.maskSensitiveData(userQuery);
      const { maskedText, tokens } = maskingResult;
      
      transparentLogger.logMasking(userQuery, maskedText, tokens);
      transparentLogger.endStep(1, 'LOCAL MASKING', { 
        maskedQuery: maskedText,
        tokensCreated: tokens.length 
      });

      // ========================================================================
      // STEP 2: INTENT RECOGNITION
      // ========================================================================
      transparentLogger.startStep(2, 'INTENT RECOGNITION', { maskedQuery: maskedText });
      
      const intent = await intentRecognitionService.recognizeIntent(maskedText);
      
      transparentLogger.logIntent(intent);
      transparentLogger.endStep(2, 'INTENT RECOGNITION', {
        intent: intent.intent,
        confidence: intent.confidence,
        filters: intent.filters
      });

      // ========================================================================
      // STEP 3: ROUTE DECISION
      // ========================================================================
      transparentLogger.startStep(3, 'ROUTE DECISION');
      
      const queryType = this.determineQueryType(intent, options);
      const reason = intent.requiresAnalysis ? 'Requires AI analysis' : 'Simple data retrieval';
      const hasFilters = Object.keys(intent.filters).length > 0;
      
      transparentLogger.logRouting(queryType, reason, hasFilters);
      transparentLogger.endStep(3, 'ROUTE DECISION', { 
        queryType,
        reason,
        hasFilters 
      });

      // ========================================================================
      // STEP 4: QUERY EXECUTION
      // ========================================================================
      transparentLogger.startStep(4, `EXECUTE ${queryType.toUpperCase()} QUERY`);
      
      let response: QueryResponse | QueryErrorResponse;

      switch (queryType) {
        case 'simple':
          response = await this.executeSimpleQuery(intent, startTime, options);
          break;
        
        case 'complex':
          response = await this.executeComplexQuery(intent, startTime, options, maskedText, tokens);
          break;
        
        case 'hybrid':
          response = await this.executeHybridQuery(intent, startTime, options, maskedText, tokens);
          break;
        
        default:
          throw new Error(`Unknown query type: ${queryType}`);
      }

      transparentLogger.endStep(4, `EXECUTE ${queryType.toUpperCase()} QUERY`, {
        type: 'type' in response ? response.type : 'error',
        findingsCount: 'findings' in response ? response.findings?.length : 0
      });

      // ========================================================================
      // STEP 5: LOCAL UNMASKING
      // ========================================================================
      transparentLogger.startStep(5, 'LOCAL UNMASKING');
      
      if ('answer' in response) {
        const originalAnswer = response.answer;
        response.answer = dataMaskingService.unmaskSensitiveData(
          response.answer,
          tokens
        );
        
        transparentLogger.logUnmasking(originalAnswer, response.answer, tokens);
      }
      
      transparentLogger.endStep(5, 'LOCAL UNMASKING');

      // Add recognized intent to response for transparency
      if ('type' in response) {
        (response as SmartQueryResult).recognizedIntent = intent;
      }

      // ========================================================================
      // FLOW COMPLETE
      // ========================================================================
      const totalDuration = Date.now() - startTime;
      transparentLogger.logFlowEnd(response, totalDuration);

      return response;

    } catch (error) {
      transparentLogger.error('Smart query router error', error);
      return this.handleError(error, startTime, userQuery, options);
    }
  }

  /**
   * Determine query type based on recognized intent
   */
  private determineQueryType(
    intent: RecognizedIntent,
    options: QueryOptions
  ): 'simple' | 'complex' | 'hybrid' {
    // Allow manual override
    if (options.forceQueryType) {
      return options.forceQueryType;
    }

    // ✅ FIX: If has keywords, ALWAYS use hybrid (semantic search + filters)
    // This fixes the zero-results issue where keywords were only client-side filtered
    if (intent.filters.keywords && intent.filters.keywords.length > 0) {
      return 'hybrid';
    }

    // If requires analysis, use complex or hybrid
    if (intent.requiresAnalysis) {
      // If filters are specific, use hybrid (filter + analyze)
      const hasSpecificFilters = Object.keys(intent.filters).length > 0;
      return hasSpecificFilters ? 'hybrid' : 'complex';
    }

    // Simple data retrieval
    return 'simple';
  }

  /**
   * Execute simple query - direct database lookup
   */
  private async executeSimpleQuery(
    intent: RecognizedIntent,
    startTime: number,
    options: QueryOptions
  ): Promise<QueryResponse> {
    const findingFilters = this.convertToFindingFilters(intent.filters);
    const page = options.page || 1;

    transparentLogger.substep('Querying database...');
    const dbStartTime = Date.now();
    
    const result = await this.queryAuditResults(findingFilters, page);
    
    const dbDuration = Date.now() - dbStartTime;
    transparentLogger.logDatabaseQuery(findingFilters, result.length, dbDuration);

    if (result.length === 0) {
      transparentLogger.warn('No audit results found matching criteria');
      const metadata = this.buildMetadata('simple', startTime, 0, intent);
      return {
        type: 'simple',
        answer: 'No audit results match your search criteria. Try:\n' +
                '- Broadening your filters\n' +
                '- Using different keywords\n' +
                '- Expanding the date range',
        findings: [],
        metadata
      };
    }

    transparentLogger.success(`Found ${result.length} audit results`);
    const metadata = this.buildMetadata('simple', startTime, result.length, intent);
    return this.responseFormatter.formatSimpleResults(result as any, metadata, page);
  }

  /**
   * Execute complex query - AI analysis with RAG
   */
  private async executeComplexQuery(
    intent: RecognizedIntent,
    startTime: number,
    options: QueryOptions,
    maskedQuery: string,
    _queryTokens: MaskingToken[]
  ): Promise<QueryResponse | QueryErrorResponse> {
    if (!isGeminiConfigured()) {
      throw new Error('AI service not configured');
    }

    // Get relevant audit results for context
    transparentLogger.substep('Retrieving audit results for context...');
    const findingFilters = this.convertToFindingFilters(intent.filters);
    const dbStartTime = Date.now();
    
    const allResults = await this.queryAuditResults(findingFilters, 1);
    
    const dbDuration = Date.now() - dbStartTime;
    transparentLogger.logDatabaseQuery(findingFilters, allResults.length, dbDuration);

    // Register project mappings for pseudonymization
    this.registerProjectMappings(allResults);

    // Use new hybrid RAG context builder
    transparentLogger.substep('Building context with hybrid RAG...');
    const contextStartTime = Date.now();
    
    const contextResult = await auditResultContextBuilder.buildContext(
      maskedQuery,
      allResults,
      intent.filters,
      {
        maxResults: 20,
        maxTokens: 10000,
        strategy: 'hybrid', // Use hybrid for complex queries
      }
    );
    
    const contextDuration = Date.now() - contextStartTime;
    transparentLogger.success(`Context built in ${contextDuration}ms using ${contextResult.strategyUsed} strategy`);
    transparentLogger.data('Selected audit results', contextResult.selectedResults.length);
    transparentLogger.data('Average relevance', contextResult.metadata.averageRelevance.toFixed(2));

    // Convert selected audit results to findings format for response
    const relevantFindings = auditResultAdapter.convertManyToFindings(contextResult.selectedResults);

    // Pseudonymize project names in context (LOCAL - prevents project names from reaching LLM)
    transparentLogger.substep('PROJECT NAME PSEUDONYMIZATION');
    let contextForAI = dataMaskingService.pseudonymizeProjectNames(contextResult.contextString);
    transparentLogger.success(`Project names replaced with IDs`);

    // Additional server-side pseudonymization if needed (for other sensitive data)
    if (options.sessionId) {
      try {
        transparentLogger.substep('SERVER PSEUDONYMIZATION');
        const pseudoStartTime = Date.now();
        
        // Pseudonymize the context string directly
        contextForAI = await dataMaskingService.pseudonymizeText(contextForAI, options.sessionId);
        
        const pseudoDuration = Date.now() - pseudoStartTime;
        transparentLogger.success(`Context pseudonymization completed in ${pseudoDuration}ms`);
      } catch (error) {
        transparentLogger.warn('Failed to pseudonymize context, using original data', error);
      }
    }

    const tokensUsed = contextResult.estimatedTokens + auditResultContextBuilder.estimateTokens(maskedQuery);
    transparentLogger.data('Total context tokens', tokensUsed);

    // Build AI prompt
    const prompt = this.buildAIPrompt(intent, contextForAI);

    // Get AI response
    transparentLogger.substep('Sending to AI (Gemini)...');
    const aiStartTime = Date.now();
    const thinkingMode = options.thinkingMode || 'low';
    
    transparentLogger.logAIProcessing(tokensUsed, thinkingMode);
    let aiResponse = await sendMessageToGemini(prompt, thinkingMode, options.sessionId);
    
    const aiDuration = Date.now() - aiStartTime;
    transparentLogger.success(`AI processing completed in ${aiDuration}ms`);

    // Depseudonymize project names in AI response (LOCAL - restore human-readable names)
    transparentLogger.substep('PROJECT NAME DEPSEUDONYMIZATION');
    aiResponse = dataMaskingService.depseudonymizeProjectNames(aiResponse);
    transparentLogger.success(`Project IDs replaced with names`);

    // Depseudonymize AI response (SERVER MODE)
    if (options.sessionId) {
      try {
        transparentLogger.substep('SERVER DEPSEUDONYMIZATION');
        const depseudoStartTime = Date.now();
        
        aiResponse = await dataMaskingService.depseudonymizeText(aiResponse, options.sessionId);
        
        const depseudoDuration = Date.now() - depseudoStartTime;
        transparentLogger.logDepseudonymization(options.sessionId);
        transparentLogger.success(`Depseudonymization completed in ${depseudoDuration}ms`);
      } catch (error) {
        transparentLogger.warn('Failed to depseudonymize AI response', error);
      }
    }

    // Clear project mappings after use
    dataMaskingService.clearProjectMappings();

    // Build metadata
    const metadata = this.buildMetadata(
      'complex',
      startTime,
      relevantFindings.length,
      intent,
      tokensUsed
    );

    return this.responseFormatter.formatAIResponse(aiResponse, relevantFindings, metadata);
  }

  /**
   * Execute hybrid query - database + AI analysis
   */
  private async executeHybridQuery(
    intent: RecognizedIntent,
    startTime: number,
    options: QueryOptions,
    maskedQuery: string,
    _queryTokens: MaskingToken[]
  ): Promise<QueryResponse | QueryErrorResponse> {
    // Step 1: Get filtered audit results
    transparentLogger.substep('Querying database...');
    const findingFilters = this.convertToFindingFilters(intent.filters);
    const page = options.page || 1;
    const dbStartTime = Date.now();
    
    const result = await this.queryAuditResults(findingFilters, page);
    
    const dbDuration = Date.now() - dbStartTime;
    transparentLogger.logDatabaseQuery(findingFilters, result.length, dbDuration);

    if (result.length === 0) {
      transparentLogger.warn('No audit results found matching criteria');
      const metadata = this.buildMetadata('hybrid', startTime, 0, intent);
      return {
        type: 'hybrid',
        answer: 'No audit results match your search criteria.',
        findings: [],
        metadata
      };
    }

    // Step 2: AI analysis if configured
    if (!isGeminiConfigured()) {
      transparentLogger.warn('AI not configured, returning database results only');
      const metadata = this.buildMetadata('hybrid', startTime, result.length, intent);
      const findings = auditResultAdapter.convertManyToFindings(result);
      return this.responseFormatter.formatSimpleResults(findings, metadata, page);
    }

    // Register project mappings for pseudonymization
    this.registerProjectMappings(result);

    // Use new hybrid RAG context builder
    transparentLogger.substep('Building context with hybrid RAG...');
    const contextStartTime = Date.now();
    
    // ✅ FIX: Use semantic search for keyword queries to find relevant results
    // even when exact text match fails
    const hasKeywords = intent.filters.keywords && intent.filters.keywords.length > 0;
    const strategy = hasKeywords ? 'semantic' : 'keyword';
    
    const contextResult = await auditResultContextBuilder.buildContext(
      maskedQuery,
      result,
      intent.filters,
      {
        maxResults: 20,
        maxTokens: 10000,
        strategy, // Use semantic for keyword queries, keyword for others
      }
    );
    
    const contextDuration = Date.now() - contextStartTime;
    transparentLogger.success(`Context built in ${contextDuration}ms using ${contextResult.strategyUsed} strategy`);
    transparentLogger.data('Selected audit results', contextResult.selectedResults.length);

    // Pseudonymize project names in context (LOCAL - prevents project names from reaching LLM)
    transparentLogger.substep('PROJECT NAME PSEUDONYMIZATION');
    let contextForAI = dataMaskingService.pseudonymizeProjectNames(contextResult.contextString);
    transparentLogger.success(`Project names replaced with IDs`);

    // Additional server-side pseudonymization if needed (for other sensitive data)
    if (options.sessionId) {
      try {
        transparentLogger.substep('SERVER PSEUDONYMIZATION');
        const pseudoStartTime = Date.now();
        
        contextForAI = await dataMaskingService.pseudonymizeText(contextForAI, options.sessionId);
        
        const pseudoDuration = Date.now() - pseudoStartTime;
        transparentLogger.success(`Context pseudonymization completed in ${pseudoDuration}ms`);
      } catch (error) {
        transparentLogger.warn('Failed to pseudonymize context, using original data', error);
      }
    }

    const tokensUsed = contextResult.estimatedTokens + auditResultContextBuilder.estimateTokens(maskedQuery);
    transparentLogger.data('Context tokens', tokensUsed);

    // Get AI analysis
    transparentLogger.substep('Sending to AI (Gemini)...');
    const aiStartTime = Date.now();
    const prompt = this.buildAIPrompt(intent, contextForAI);
    const thinkingMode = options.thinkingMode || 'low';
    
    transparentLogger.logAIProcessing(tokensUsed, thinkingMode);
    let aiAnalysis = await sendMessageToGemini(prompt, thinkingMode, options.sessionId);
    
    const aiDuration = Date.now() - aiStartTime;
    transparentLogger.success(`AI processing completed in ${aiDuration}ms`);

    // Depseudonymize project names in AI response (LOCAL - restore human-readable names)
    transparentLogger.substep('PROJECT NAME DEPSEUDONYMIZATION');
    aiAnalysis = dataMaskingService.depseudonymizeProjectNames(aiAnalysis);
    transparentLogger.success(`Project IDs replaced with names`);

    // Depseudonymize AI response (SERVER MODE)
    if (options.sessionId) {
      try {
        transparentLogger.substep('SERVER DEPSEUDONYMIZATION');
        const depseudoStartTime = Date.now();
        
        aiAnalysis = await dataMaskingService.depseudonymizeText(aiAnalysis, options.sessionId);
        
        const depseudoDuration = Date.now() - depseudoStartTime;
        transparentLogger.logDepseudonymization(options.sessionId);
        transparentLogger.success(`Depseudonymization completed in ${depseudoDuration}ms`);
      } catch (error) {
        transparentLogger.warn('Failed to depseudonymize AI analysis', error);
      }
    }

    // Clear project mappings after use
    dataMaskingService.clearProjectMappings();

    // Build metadata
    const metadata = this.buildMetadata(
      'hybrid',
      startTime,
      result.length,
      intent,
      tokensUsed
    );

    // Convert all results to findings for response
    const allFindings = auditResultAdapter.convertManyToFindings(result);

    return this.responseFormatter.formatHybridResponse(
      allFindings,
      aiAnalysis,
      metadata,
      page
    );
  }

  /**
   * Register project name to ID mappings for pseudonymization
   * This prevents project names from being sent to LLM
   */
  private registerProjectMappings(auditResults: AuditResult[]): void {
    const mappings: Array<[string, string]> = [];
    
    for (const result of auditResults) {
      if (result.projectName && result.projectId) {
        mappings.push([result.projectName, result.projectId]);
      }
    }
    
    dataMaskingService.registerProjectMappings(mappings);
    transparentLogger.data('Project mappings registered', mappings.length);
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

    if (filters.projectType && filters.projectType.length > 0) {
      // Need to query projects first to get project names
      // For now, skip this filter or implement project-based filtering
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
        r.description.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredResults.slice(start, end);
  }

  /**
   * Convert intent filters to FindingFilters format
   */
  private convertToFindingFilters(filters: ExtractedFilters): FindingFilters {
    const findingFilters: FindingFilters = {};

    if (filters.severity) {
      findingFilters.priorityLevel = filters.severity;
    }

    if (filters.status) {
      findingFilters.status = filters.status;
    }

    if (filters.department) {
      findingFilters.findingDepartment = [filters.department];
      console.log(`✅ DEPARTMENT FILTER: Using Firestore query for department="${filters.department}"`);
    }

    if (filters.year) {
      findingFilters.auditYear = [filters.year];
    }

    if (filters.projectType) {
      findingFilters.projectType = [filters.projectType];
    }

    if (filters.keywords && filters.keywords.length > 0) {
      console.warn(`⚠️ KEYWORDS FILTER: Will use client-side search for keywords="${filters.keywords.join(' ')}"`);
      findingFilters.searchText = filters.keywords.join(' ');
    }

    if (filters.dateRange) {
      findingFilters.dateIdentified = filters.dateRange;
    }

    return findingFilters;
  }

  /**
   * Build AI prompt with intent and context
   */
  private buildAIPrompt(intent: RecognizedIntent, context: string): string {
    return `You are an AI assistant analyzing audit findings data.

User Intent: ${intent.intent}

Context (Relevant Findings):
${context}

---

Based on the findings above, provide a comprehensive answer to the user's intent.
Include specific references to findings when relevant.
Be accurate and complete in your response.`;
  }

  /**
   * Build metadata for response
   */
  private buildMetadata(
    queryType: 'simple' | 'complex' | 'hybrid',
    startTime: number,
    findingsCount: number,
    intent: RecognizedIntent,
    tokensUsed?: number
  ): QueryMetadata {
    return {
      queryType,
      executionTimeMs: Date.now() - startTime,
      findingsAnalyzed: findingsCount,
      confidence: intent.confidence,
      extractedFilters: intent.filters,
      tokensUsed,
    };
  }

  /**
   * Handle errors with appropriate fallbacks
   */
  private handleError(
    error: unknown,
    startTime: number,
    userQuery: string,
    _options: QueryOptions
  ): QueryErrorResponse {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    let errorCode: QueryRouterError['code'] = 'CLASSIFICATION_ERROR';
    let suggestion = 'Unable to process query. Please try rephrasing.';

    if (errorMessage.includes('AI service')) {
      errorCode = 'AI_ERROR';
      suggestion = 'AI service unavailable. Try a simpler search query.';
    } else if (errorMessage.includes('database') || errorMessage.includes('Firestore')) {
      errorCode = 'DATABASE_ERROR';
      suggestion = 'Database error. Please try again.';
    }

    const metadata: QueryMetadata = {
      queryType: 'complex',
      executionTimeMs: Date.now() - startTime,
      findingsAnalyzed: 0,
      confidence: 0,
      extractedFilters: {},
    };

    console.error('Smart Query Router Error:', {
      code: errorCode,
      message: errorMessage,
      query: userQuery,
    });

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        suggestion,
      },
      metadata,
    };
  }
}

// Export singleton instance
export const smartQueryRouter = new SmartQueryRouter();
