import { GoogleGenAI } from "@google/genai";
import BernardSessionService from './BernardSessionService';
import BernardChatService from './BernardChatService';
import DatabaseService from './DatabaseService';
import { findAllMatches } from '../utils/stringSimilarity';
import * as XLSX from 'xlsx';

export interface QueryFilter {
  field: string;
  operator: '==' | '!=' | '>' | '>=' | '<' | '<=' | 'array-contains' | 'in' | 'array-contains-any' | 'contains' | 'contains-any' | 'not-in';
  value: string | number | string[] | number[];
}

export interface ProjectSuggestion {
  name: string;
  score: number;
}

export interface AggregationResult {
  groupBy: string | string[]; // Single field or array of fields for multi-dimensional
  groupValue: string | number | Record<string, string | number>; // Single value or object for multi-dimensional
  count: number;
  sum?: number;
  avg?: number;
  min?: number;
  max?: number;
  filters?: QueryFilter[]; // Store filters to fetch underlying data
  [key: string]: any; // Allow additional aggregated fields
}

export interface QueryResult {
  success: boolean;
  message: string;
  results?: any[];
  aggregatedResults?: AggregationResult[];
  resultsCount: number;
  table?: string;
  excelBuffer?: ArrayBuffer;
  excelFilename?: string;
  needsConfirmation: boolean;
  filters?: QueryFilter[];
  suggestions?: ProjectSuggestion[];
  originalQuery?: string;
  isAggregated?: boolean;
  aggregationType?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  groupByField?: string | string[]; // Support multiple fields
  yearAggregation?: AggregationResult[]; // Auto-generated year chart data
}

/**
 * Bernard AI Service - Query-focused assistant
 * Uses Gemini 3 Pro Preview for intent understanding
 * 
 * Flow:
 * 1. User input → Gemini for intent classification (table structure only, no data)
 * 2. Extract filters from natural language
 * 3. Generate SQL/Firestore queries
 * 4. Execution temporarily disabled
 */
export class BernardService {
  private ai: GoogleGenAI;
  
  // Model fallback chain - try in order if one fails
  private readonly MODELS = [
    'gemini-2.5-flash',      // Primary: Latest stable, 500 req/day
    'gemini-2.0-flash',      // Fallback 1: Older but stable
    'gemini-2.5-pro',        // Fallback 2: More powerful but limited
  ];
  
  private currentModelIndex = 0;
  
  private get MODEL_NAME(): string {
    return this.MODELS[this.currentModelIndex];
  }

  // Table structure for AI context (NO DATA, structure only)
  private readonly TABLE_SCHEMA = `
DATABASE TABLES:

TABLE: audit_results (main audit findings table)
FIELDS:
- projectName (string): Project name (links to projects.projectName)
- subholding (string): Subholding code (e.g., "SH3A", "SH2", "SH1")
- year (number): Audit year (2022-2025)
- department (string): Department name - MUST use exact "departmentName" values from DEPARTMENT_TAGS list below
- riskArea (string): Risk area description
- description (string): Finding description text (Deskripsi)
- code (string): Finding code - F (Finding), NF (Non-Finding), O (Observation), R (Recommendation)
- weight (number): Bobot (weight value 1-10)
- severity (number): Kadar (severity level 1-5)
- value (number): Nilai (calculated score value)
- isRepeat (number): Temuan Ulangan (0 or 1, indicates repeat finding)
- uniqueId (string): SHA-256 hash for duplicate detection

TABLE: projects (project master data)
FIELDS:
- projectName (string): Full project name (e.g., "Aceh Water", "Ciputra World Jakarta 2")
- sh (string): Subholding code (e.g., "SH2", "SH3A")
- tbk (string): TBK status ("tbk" or "non")
- industry (string): Industry code (e.g., "Oth", "Com", "Res", "Hea", "Edu")
- category (string): Category name (e.g., "Others", "Commercial", "Residential", "Healthcare", "Education")
- location (string): Location (e.g., "Jakarta", "Aceh, Nanggroe Aceh Darussalam")
- tags (array): Tags array (e.g., ["AW", "Aceh Water Supply"], ["CWJ2", "Ciputra World"])

TABLE: department_tags (department reference data)
FIELDS:
- departmentName (string): Official department name (e.g., "Departemen IT", "Departemen Finance")
- tags (array): Searchable keywords/aliases for this department
- category (string): Department category (e.g., "IT", "Finance", "HR", "Marketing")
- findingsCount (number): Total findings count for this department (optional)

INDUSTRY & CATEGORY MAPPING:
- Oth → Others (Broker, Insurance, Water, etc.)
- Com → Commercial (Hotel, Mall, Office)
- Res → Residential (Apartment, Landed House)
- Hea → Healthcare (Hospital, Clinic)
- Edu → Education (School, University)

IMPORTANT QUERY RULES:
- For keyword searches (APAR, PPJB, IMB, etc.), use "description" field with "contains" operator
- Example: {"field": "description", "operator": "contains", "value": "APAR"}
- For project filtering, use "projectName" field (exact match)
- For year filtering, use "year" field (number type)
- For department filtering: Match user input against DEPARTMENT_TAGS list (check tags array for keywords like "IT", "HR", "Finance"), then use the exact "departmentName" value in the filter
- Example: User says "IT" → find departments where tags contain "IT" → use exact departmentName values
- For finding type, use "code" field: F (Finding), NF (Non-Finding), O (Observation), R (Recommendation)

SUBHOLDING (SH) CODES:
- SH1, SH2, SH3A, SH3B, SH4 (always uppercase)
- Use "subholding" field in audit_results table
- Use "sh" field in projects table
- Example: {"field": "subholding", "operator": "==", "value": "SH1"}

COMMON KEYWORDS (search in description field):
- Fire safety: APAR, Hydrant, Heat detector
- Facilities: Kolam renang, Lift, Escalator, CCTV, Security
- Finance: Cash Opname, Time Deposit, Escrow KPR, Aging schedule
- Legal: PPJB, SPPJB, AJB, PBB, PBG, IMB, SHGB, PPATK
- Marketing: NPV, Komisi, Digital Marketing, Rumah Contoh, Show Unit
- Construction: Kualitas Bangunan, Volume Pekerjaan, Pekerjaan Tambah
- Estate: IPL, Tunggakan air, Serah Terima
- HR: Kontrak kerja, BPJS, Asuransi, Clearance sheet
`;


  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY is not configured');
    }

    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Execute a confirmed query with selected project name
   */
  async executeConfirmedQuery(
    originalQuery: string,
    selectedProjectName: string | string[],
    userId: string,
    sessionId: string
  ): Promise<{ response: string; sessionId: string; queryResult?: QueryResult }> {
    const startTime = Date.now();

    try {
      // Re-extract filters from original query
      const prompt = `You are a database query assistant for an audit findings system.

${this.TABLE_SCHEMA}

USER QUERY: "${originalQuery}"

Analyze the user's query and extract database filters. Return a JSON object:
{
  "userIntent": "what user wants in Indonesian",
  "targetTable": "audit_results|projects|departments",
  "filters": [
    {"field": "fieldName", "operator": "==|!=|>|>=|<|<=|array-contains", "value": "value"}
  ],
  "isValidQuery": true/false,
  "invalidReason": "reason if not valid query"
}

Return ONLY the JSON object.`;

      const response = await this.generateContentWithFallback(prompt);
      const responseText = response.text?.trim() || '{}';
      let jsonText = responseText;
      if (responseText.includes('```')) {
        const match = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (match) jsonText = match[1];
      }

      const parsed = JSON.parse(jsonText);
      const userIntent = parsed.userIntent || 'Mencari audit findings';
      const targetTable = parsed.targetTable || 'audit_results';
      let filters: QueryFilter[] = parsed.filters || [];

      // Replace project name filter with confirmed name(s)
      filters = filters.map(f => {
        if (f.field === 'projectName') {
          if (Array.isArray(selectedProjectName)) {
            // Multiple projects selected - use "in" operator
            return { field: 'projectName', operator: 'in', value: selectedProjectName };
          } else {
            // Single project - use "==" operator
            return { ...f, value: selectedProjectName };
          }
        }
        return f;
      });

      // Execute query with original user query for context (no custom sorting for confirmed queries)
      const results = await this.executeQuery(filters, targetTable, originalQuery);
      const { excelBuffer, excelFilename } = await this.generateExcel(results, targetTable, userIntent);

      // AUTO-GENERATE YEAR CHART for audit_results queries with multiple results
      let yearAggregation: AggregationResult[] | undefined;
      if (targetTable === 'audit_results' && results.length > 0) {
        console.log(`📊 Auto-generating year aggregation chart for ${results.length} findings`);
        yearAggregation = await this.aggregateResults(results, 'year', 'count', undefined, 'asc', filters);
        console.log(`📊 Generated ${yearAggregation.length} year groups for chart`);
      }

      // More personalized, conversational response
      const resultText = results.length === 0 
        ? 'Tidak ada hasil yang ditemukan' 
        : results.length === 1 
          ? 'Ditemukan 1 hasil'
          : `Ditemukan ${results.length} hasil`;
      
      const projectText = Array.isArray(selectedProjectName)
        ? `${selectedProjectName.length} proyek`
        : selectedProjectName;
      
      const filterDesc = this.describeFilters(filters);
      const message = `${userIntent} di ${projectText}...\n\n${resultText}${filterDesc ? ' dengan filter:\n' + filterDesc : '.'}`

      const queryResult: QueryResult = {
        success: true,
        message,
        results,
        resultsCount: results.length,
        table: targetTable,
        excelBuffer,
        excelFilename,
        needsConfirmation: false,
        filters,
        yearAggregation,
      };

      // Save assistant response with queryResult (excluding binary data)
      await BernardChatService.addAssistantResponse(
        sessionId,
        userId,
        queryResult.message,
        {
          responseTime: Date.now() - startTime,
          modelVersion: this.MODEL_NAME,
          queryResult: {
            resultsCount: queryResult.resultsCount,
            results: queryResult.results,
            aggregatedResults: queryResult.aggregatedResults,
            table: queryResult.table,
            needsConfirmation: queryResult.needsConfirmation,
            suggestions: queryResult.suggestions,
            originalQuery: queryResult.originalQuery,
            isAggregated: queryResult.isAggregated,
            aggregationType: queryResult.aggregationType,
            groupByField: queryResult.groupByField,
            yearAggregation: queryResult.yearAggregation,
          },
          metadata: {
            resultsCount: queryResult.resultsCount,
            filters: queryResult.filters,
          }
        }
      );
      await BernardSessionService.incrementMessageCount(sessionId);

      return { 
        response: queryResult.message, 
        sessionId,
        queryResult 
      };
    } catch (error) {
      console.error('Bernard confirmed query error:', error);
      throw new Error(`Failed to execute confirmed query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process user query - single unified flow
   */
  async chat(
    message: string,
    userId: string,
    sessionId?: string
  ): Promise<{ response: string; sessionId: string; queryResult?: QueryResult }> {
    const startTime = Date.now();

    try {
      // Get or create session
      const activeSessionId = sessionId || await BernardSessionService.getOrCreateSession(userId);

      // Save user message
      await BernardChatService.addUserMessage(activeSessionId, userId, message);
      await BernardSessionService.incrementMessageCount(activeSessionId);

      // Check for demo command
      if (message.toLowerCase().trim() === 'demo') {
        const demoResponse = this.generateDemoResponse();
        await BernardChatService.addAssistantResponse(
          activeSessionId,
          userId,
          demoResponse,
          {
            responseTime: Date.now() - startTime,
            modelVersion: 'demo-mode',
            metadata: { isDemo: true }
          }
        );
        await BernardSessionService.incrementMessageCount(activeSessionId);

        return {
          response: demoResponse,
          sessionId: activeSessionId,
          queryResult: {
            success: true,
            message: demoResponse,
            resultsCount: 0,
            needsConfirmation: false,
          }
        };
      }

      // Process query through Gemini with session context
      const queryResult = await this.processQuery(message, activeSessionId);

      // Save assistant response with compact summary for context and queryResult
      const compactMessage = this.createCompactContextMessage(queryResult);
      
      await BernardChatService.addAssistantResponse(
        activeSessionId,
        userId,
        queryResult.message,
        {
          responseTime: Date.now() - startTime,
          modelVersion: this.MODEL_NAME,
          queryResult: {
            resultsCount: queryResult.resultsCount,
            results: queryResult.results,
            aggregatedResults: queryResult.aggregatedResults,
            table: queryResult.table,
            needsConfirmation: queryResult.needsConfirmation,
            suggestions: queryResult.suggestions,
            originalQuery: queryResult.originalQuery,
            isAggregated: queryResult.isAggregated,
            aggregationType: queryResult.aggregationType,
            groupByField: queryResult.groupByField,
            yearAggregation: queryResult.yearAggregation,
          },
          metadata: {
            resultsCount: queryResult.resultsCount,
            filters: queryResult.filters,
            compactContext: compactMessage, // For LLM context
          }
        }
      );
      await BernardSessionService.incrementMessageCount(activeSessionId);

      // Auto-generate title from first message
      const session = await BernardSessionService.getById(activeSessionId);
      if (session && !session.title && session.messageCount === 2) {
        const title = this.generateTitle(message);
        await BernardSessionService.updateTitle(activeSessionId, title);
      }

      return { 
        response: queryResult.message, 
        sessionId: activeSessionId,
        queryResult 
      };
    } catch (error) {
      console.error('Bernard chat error:', error);
      throw new Error(`Failed to process query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stream response (for typing effect)
   */
  async *streamChat(
    message: string,
    userId: string,
    sessionId?: string
  ): AsyncGenerator<string, { sessionId: string; queryResult?: QueryResult }> {
    const startTime = Date.now();

    try {
      // Get or create session
      const activeSessionId = sessionId || await BernardSessionService.getOrCreateSession(userId);

      // Save user message
      await BernardChatService.addUserMessage(activeSessionId, userId, message);
      await BernardSessionService.incrementMessageCount(activeSessionId);

      // Check for demo command
      if (message.toLowerCase().trim() === 'demo') {
        const demoResponse = this.generateDemoResponse();
        
        // Stream the demo response word by word for typing effect
        const words = demoResponse.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk = (i === 0 ? '' : ' ') + words[i];
          yield chunk;
        }

        await BernardChatService.addAssistantResponse(
          activeSessionId,
          userId,
          demoResponse,
          {
            responseTime: Date.now() - startTime,
            modelVersion: 'demo-mode',
            metadata: { isDemo: true }
          }
        );
        await BernardSessionService.incrementMessageCount(activeSessionId);

        // Auto-generate title
        const session = await BernardSessionService.getById(activeSessionId);
        if (session && !session.title && session.messageCount === 2) {
          await BernardSessionService.updateTitle(activeSessionId, 'Bernard Demo - Feature Showcase');
        }

        return {
          sessionId: activeSessionId,
          queryResult: {
            success: true,
            message: demoResponse,
            resultsCount: 0,
            needsConfirmation: false,
          }
        };
      }

      // Process query with session context
      const queryResult = await this.processQuery(message, activeSessionId);

      // Stream the response word by word for typing effect
      const words = queryResult.message.split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = (i === 0 ? '' : ' ') + words[i];
        yield chunk;
      }

      // Save assistant response with compact summary for context and queryResult
      const compactMessage = this.createCompactContextMessage(queryResult);
      
      await BernardChatService.addAssistantResponse(
        activeSessionId,
        userId,
        queryResult.message,
        {
          responseTime: Date.now() - startTime,
          modelVersion: this.MODEL_NAME,
          queryResult: {
            resultsCount: queryResult.resultsCount,
            results: queryResult.results,
            aggregatedResults: queryResult.aggregatedResults,
            table: queryResult.table,
            needsConfirmation: queryResult.needsConfirmation,
            suggestions: queryResult.suggestions,
            originalQuery: queryResult.originalQuery,
            isAggregated: queryResult.isAggregated,
            aggregationType: queryResult.aggregationType,
            groupByField: queryResult.groupByField,
            yearAggregation: queryResult.yearAggregation,
          },
          metadata: {
            resultsCount: queryResult.resultsCount,
            filters: queryResult.filters,
            compactContext: compactMessage, // For LLM context
          }
        }
      );
      await BernardSessionService.incrementMessageCount(activeSessionId);

      // Auto-generate title
      const session = await BernardSessionService.getById(activeSessionId);
      if (session && !session.title && session.messageCount === 2) {
        const title = this.generateTitle(message);
        await BernardSessionService.updateTitle(activeSessionId, title);
      }

      return { sessionId: activeSessionId, queryResult };
    } catch (error) {
      console.error('Bernard stream error:', error);
      throw new Error(`Failed to process query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate project name and suggest alternatives if needed
   * Returns null if exact match found, or suggestions array if alternatives available
   */
  private async validateProjectName(projectName: string): Promise<{ correctedName?: string; suggestions?: ProjectSuggestion[] }> {
    const allProjectNames = await this.getAllProjectNames();
    
    // Check for exact match (case-insensitive)
    const exactMatch = allProjectNames.find(
      name => name.toLowerCase() === projectName.toLowerCase()
    );
    
    if (exactMatch) {
      return { correctedName: exactMatch }; // Exact match found, use it
    }
    
    // Find similar matches with improved fuzzy matching
    // Lower threshold to 0.55 to catch more potential matches
    const matches = findAllMatches(projectName, allProjectNames, 0.55, 10);
    
    if (matches.length === 0) {
      return { suggestions: [] }; // No matches found
    }
    
    // Auto-accept very high confidence matches (>95%)
    // This handles minor variations like "CitraGarden" vs "Citra Garden"
    if (matches[0].score > 0.95) {
      console.log(`🎯 Auto-accepting high confidence match: "${matches[0].value}" (${Math.round(matches[0].score * 100)}% match for "${projectName}")`);
      return { correctedName: matches[0].value }; // Auto-accept with corrected name
    }
    
    // Return suggestions sorted by score
    return {
      suggestions: matches.map(m => ({
        name: m.value,
        score: m.score
      }))
    };
  }

  /**
   * Validate multiple project names and return suggestions for unmatched ones
   */
  private async validateProjectNames(projectNames: string[]): Promise<{
    validProjects: string[];
    invalidProjects: Array<{ query: string; suggestions: ProjectSuggestion[] }>;
  }> {
    const allProjectNames = await this.getAllProjectNames();
    const validProjects: string[] = [];
    const invalidProjects: Array<{ query: string; suggestions: ProjectSuggestion[] }> = [];

    for (const projectName of projectNames) {
      // Check for exact match (case-insensitive)
      const exactMatch = allProjectNames.find(
        name => name.toLowerCase() === projectName.toLowerCase()
      );

      if (exactMatch) {
        validProjects.push(exactMatch);
      } else {
        // Find similar matches
        const matches = findAllMatches(projectName, allProjectNames, 0.55, 10);
        invalidProjects.push({
          query: projectName,
          suggestions: matches.map(m => ({
            name: m.value,
            score: m.score
          }))
        });
      }
    }

    return { validProjects, invalidProjects };
  }

  /**
   * Core query processing - uses Gemini to understand intent, extract filters, and execute query
   */
  private async processQuery(query: string, sessionId?: string): Promise<QueryResult> {
    try {
      // Fetch department_tags from Firestore for LLM context
      let departmentTagsContext = '';
      try {
        const tagsDb = new DatabaseService('department_tags');
        const allDepartmentTags = await tagsDb.getAll();

        if (allDepartmentTags.length > 0) {
          departmentTagsContext = '\n\nDEPARTMENT_TAGS (CRITICAL - Use originalNames for filters, NOT departmentName):\n' +
            allDepartmentTags.map(dept =>
              `- departmentName: "${dept.departmentName}" (DISPLAY ONLY)\n  originalNames: [${dept.originalNames?.map((n: string) => `"${n}"`).join(', ') || ''}] (USE THESE IN FILTERS)\n  tags: [${dept.tags.map((t: string) => `"${t}"`).join(', ')}]\n  category: "${dept.category}"`
            ).join('\n\n');
          console.log(`🏢 Loaded ${allDepartmentTags.length} department tags for LLM context`);
        }
      } catch (error) {
        console.warn('Failed to fetch department_tags:', error);
      }

      // Get conversation history for context
      let conversationContext = '';
      if (sessionId) {
        try {
          const history = await BernardChatService.getSessionChats(sessionId, 6);
          if (history && history.length > 0) {
            // Format last 3 exchanges (6 messages) for context
            // Use compact context for assistant messages to avoid overwhelming the LLM
            conversationContext = '\n\nCONVERSATION HISTORY (for context):\n' +
              history.map(msg => {
                if (msg.role === 'user') {
                  return `USER: ${msg.message}`;
                } else {
                  // Use compact context if available, otherwise truncate
                  const compactContext = msg.metadata?.compactContext;
                  if (compactContext) {
                    return `ASSISTANT: ${compactContext}`;
                  }
                  // Fallback: truncate long messages
                  const truncated = msg.message.length > 200
                    ? msg.message.substring(0, 200) + '...'
                    : msg.message;
                  return `ASSISTANT: ${truncated}`;
                }
              }).join('\n');
            console.log(`📜 Using ${history.length} messages from conversation history for context`);
          }
        } catch (error) {
          console.warn('Failed to get conversation history:', error);
        }
      }

      const prompt = `You are a database query assistant for an audit findings system.

${this.TABLE_SCHEMA}
${departmentTagsContext}
${conversationContext}

USER QUERY: "${query}"

CRITICAL RULES FOR ACCURATE QUERIES:
1. DEPARTMENT MATCHING (MOST IMPORTANT): 
   - User says "IT" → Find department where tags contain "IT" → Use ALL originalNames values from that department
   - Example: User says "IT" → Match department with tags ["IT", "ICT"] → Use originalNames: ["IT", "ICT", "Teknologi Informasi"] in filter
   - ALWAYS use originalNames array values, NEVER use departmentName
   - Use IN operator with ALL originalNames: {"field": "department", "operator": "in", "value": ["IT", "ICT", "Teknologi Informasi"]}
   - The audit_results table stores RAW department names from Excel, NOT normalized names

2. FIELD NAMES (MUST BE EXACT):
   - audit_results: projectName, subholding, year, department, riskArea, description, code, weight, severity, value
   - projects: projectName, sh, tbk, industry, category, location, tags
   - department_tags: departmentName, tags, category

3. DATA TYPES (CRITICAL):
   - year: NUMBER (2024, 2023, NOT "2024")
   - weight, severity, value: NUMBER
   - All others: STRING

4. COMMON MISTAKES TO AVOID:
   - ❌ {"field": "department", "value": "Departemen IT"} → ✅ {"field": "department", "operator": "in", "value": ["IT", "ICT", "Teknologi Informasi"]}
   - ❌ Using departmentName → ✅ Using ALL originalNames from department_tags
   - ❌ {"field": "year", "value": "2024"} → ✅ {"field": "year", "value": 2024}
   - ❌ {"field": "sh", ...} in audit_results → ✅ {"field": "subholding", ...}
   - ❌ {"field": "bobot", ...} → ✅ {"field": "weight", ...}

IMPORTANT CONTEXT RULES:
- If the conversation history shows a previous query with filters (department, year, project, code), and the current query is a refinement or follow-up, YOU MUST MAINTAIN ALL PREVIOUS FILTERS unless explicitly told to remove them
- Example: Previous query had filters [department=HC, year=2024, code=F], current query "khusus mall ciputra cibubur" → KEEP [department=HC, year=2024, code=F] and ADD [projectName=Mall Ciputra Cibubur]
- Example: Previous query had filters [department=IT, year=2024], current query "hanya temuan" → KEEP [department=IT, year=2024] and ADD [code=F]
- If user says "reset" or "start over" or "all projects", then clear previous filters
- "temuan" or "findings" ALWAYS means code="F" (actual findings, not NF/O/R)
- "semua hasil audit" or "all audit results" means include all codes (F, NF, O, R)

Analyze the user's query and extract database filters. Return a JSON object:
{
  "userIntent": "what user wants in Indonesian",
  "targetTable": "audit_results|projects|department_tags",
  "filters": [
    {"field": "fieldName", "operator": "==|!=|>|>=|<|<=|in|not-in|array-contains|array-contains-any|contains|contains-any", "value": "value"}
  ],
  "sortBy": "field name (optional, e.g., value, year, projectName)",
  "sortOrder": "asc|desc (optional, default: desc for value, asc for others)",
  "limit": "number (optional, e.g., 10, 20, 50 - for 'top N' or 'first N' queries)",
  "isValidQuery": true/false,
  "invalidReason": "reason if not valid query"
}

AGGREGATION RULES (PIVOT TABLE):
- If user wants to "group by", "count by", "summarize by", "aggregate by", "pivot", "breakdown by" → Use aggregation
- Aggregation types:
  * "count" - Count records per group (default)
  * "sum" - Sum a numeric field per group
  * "avg" - Average a numeric field per group
  * "min" - Minimum value per group
  * "max" - Maximum value per group
- MULTI-DIMENSIONAL AGGREGATION (NEW):
  * Support multiple groupBy fields for nested aggregation
  * "by SH and by Year" → {"groupBy": ["sh", "year"], "aggregationType": "count"}
  * "by department and project" → {"groupBy": ["department", "projectName"], "aggregationType": "count"}
  * "by year and SH" → {"groupBy": ["year", "sh"], "aggregationType": "count"}
  * Order matters: first field is primary grouping, second is secondary
- PROJECT TYPE/SUBTYPE AGGREGATION (SUPPORTED):
          * System will automatically join with projects table to get type/subtype data
- Common aggregation queries:
  * "count findings by department" → {"groupBy": "department", "aggregationType": "count"}
  * "sum value by project" → {"groupBy": "projectName", "aggregationType": "sum", "aggregateField": "value"}
  * "average score by year" → {"groupBy": "year", "aggregationType": "avg", "aggregateField": "value"}
  * "highest findings count by department 2024" → {"groupBy": "department", "aggregationType": "count", "filters": [{"field": "year", "operator": "==", "value": "2024"}], "sortOrder": "desc"}
  * "PPJB findings by SH and year" → {"groupBy": ["sh", "year"], "aggregationType": "count", "filters": [{"field": "description", "operator": "contains", "value": "PPJB"}, {"field": "code", "operator": "==", "value": "F"}]}
  * "findings by project and department" → {"groupBy": ["projectName", "department"], "aggregationType": "count"}
    - Keywords indicating aggregation: "group by", "count by", "summarize", "breakdown", "pivot", "per department", "by project", "berdasarkan", "per", "jumlah temuan per", "agregasi"
- Keywords indicating multi-dimensional: "by X and Y", "by X and by Y", "per X dan Y", "berdasarkan X dan Y"
- When aggregating, return groupBy (string or array), aggregationType, and optional aggregateField (for sum/avg/min/max)

SORTING RULES:
- If user says "highest score", "descending", "terbesar", "tertinggi", "dari value tertinggi" → sortBy="value", sortOrder="desc"
- If user says "lowest score", "ascending", "terkecil", "terendah", "dari value terendah" → sortBy="value", sortOrder="asc"
- For aggregated results: "highest count" → sortOrder="desc", "lowest count" → sortOrder="asc"
- If no sorting specified, omit sortBy and sortOrder fields
- Default sorting is handled by the system (year desc for audit_results, projectName asc for projects)

OR LOGIC RULES (CRITICAL):
- Use "in" operator for OR logic on the SAME field with multiple values
- Examples: 
  * "IT or Finance" → {"field": "department", "operator": "in", "value": ["IT", "Finance"]}
  * "SH1 or SH2 or SH3A" → {"field": "subholding", "operator": "in", "value": ["SH1", "SH2", "SH3A"]}
  * "2023 or 2024" → {"field": "year", "operator": "in", "value": [2023, 2024]}
  * "Project A or Project B" → {"field": "projectName", "operator": "in", "value": ["Project A", "Project B"]}
- Use "array-contains-any" for OR logic on array fields (tags)
- Examples:
  * "APAR or Hydrant" → {"field": "tags", "operator": "array-contains-any", "value": ["APAR", "Hydrant"]}
  * "Kolam renang or Lift or CCTV" → {"field": "tags", "operator": "array-contains-any", "value": ["Kolam renang", "Lift", "CCTV"]}
- Maximum 30 values per 'in' or 'array-contains-any' operator (Firestore limit)
- Keywords that indicate OR logic: "atau", "or", "dan" (when listing items), comma-separated lists

OPERATOR RULES:
- "==" for exact match (department = "IT", year = "2024", code = "F")
- "!=" for "not equal", "except", "exclude" (e.g., code != "NF")
- "in" for OR logic with multiple values (department in ["IT", "Finance"], year in [2023, 2024])
- "not-in" for excluding multiple values (e.g., department not in ["IT", "Finance"], exclude these departments)
- ">=" for "above", "more than", "at least", "minimum" (e.g., value >= 10)
- "<=" for "below", "less than", "at most", "maximum" (e.g., value <= 5)
- ">" for "greater than"
- "<" for "less than"
- "array-contains" for single tag match (ONLY for array fields like tags)
- "array-contains-any" for multiple tag OR matches (ONLY for array fields like tags)
- "contains" for single text search in description field (AND logic if multiple)
- "contains-any" for OR text search in description field (matches ANY of the keywords)

KEYWORD SEARCH RULES (CRITICAL):
- Single keyword: use "contains" operator → {"field": "description", "operator": "contains", "value": "APAR"}
- Multiple keywords with OR: use "contains-any" operator → {"field": "description", "operator": "contains-any", "value": ["APAR", "Hydrant"]}
- Multiple keywords with AND: use multiple "contains" filters → [{"field": "description", "operator": "contains", "value": "APAR"}, {"field": "description", "operator": "contains", "value": "2024"}]

LIMIT RULES:
- "top 10", "first 10", "10 terbesar", "10 tertinggi" → limit: 10
- "top 5 findings", "5 teratas" → limit: 5
- "show 20 results", "tampilkan 20" → limit: 20
- If no limit specified, omit the limit field

FIELD TYPE RULES:
- year: ALWAYS string (e.g., "2024", "2023", "2022") - NEVER use number
- weight, severity, value, finding, nonFinding, total: number
- tags, originalNames, keywords: use "array-contains" operator
- All other fields: string

TARGET TABLE RULES:
- "audit_results": for findings, temuan, audit results queries
- "projects": for project list, project info, tags
- "department_tags": for department list, department info, department categories

CODE FIELD RULES (CRITICAL):
- "temuan" or "findings" ALWAYS means code="F" only (actual findings, not NF/O/R)
- "semua temuan" also means code="F" only (all findings, but still only F code)
- "hanya temuan" or "findings only" means code="F" only
- code = "F" means Finding (actual audit findings)
- code = "NF" means Non-Finding (not actual findings)
- code = "O" means Observation
- code = "R" means Recommendation
- If user wants ALL results including NF, they must explicitly say "all audit results", "semua hasil audit", "including NF", "termasuk NF", or "all codes"
- Default behavior: ANY mention of "temuan" or "findings" = filter to code="F" only

CONTEXT-AWARE RULES:
- If conversation history shows a previous query with specific filters (project, year, department), and current query is a refinement like "hanya temuan" or "findings only", KEEP all previous filters and ADD code="F" filter
- Example: Previous query "semua temuan Tallasa Makassar" → Current query "hanya temuan" → Keep projectName filter, ADD code="F"
- If user says just "temuan" or "findings" without other context, it means code="F" for all projects

EXAMPLES:
Query: "show all IT findings 2024" or "semua temuan IT 2024"
{"userIntent": "Tampilkan semua temuan IT tahun 2024", "targetTable": "audit_results", "filters": [{"field": "department", "operator": "==", "value": "IT"}, {"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan IT atau Finance 2024" or "findings from IT or Finance 2024"
{"userIntent": "Temuan dari IT atau Finance tahun 2024", "targetTable": "audit_results", "filters": [{"field": "department", "operator": "in", "value": ["IT", "Finance"]}, {"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan dari Tallasa atau Raffles" or "findings from Tallasa or Raffles"
{"userIntent": "Temuan dari CitraLand Tallasa atau Hotel Raffles", "targetTable": "audit_results", "filters": [{"field": "projectName", "operator": "in", "value": ["CitraLand Tallasa City Makassar", "Hotel Raffles Jakarta"]}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan SH1 atau SH2" or "findings from SH1 or SH2"
{"userIntent": "Temuan dari SH1 atau SH2", "targetTable": "audit_results", "filters": [{"field": "subholding", "operator": "in", "value": ["SH1", "SH2"]}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan APAR atau Hydrant" or "findings about APAR or Hydrant"
{"userIntent": "Temuan terkait APAR atau Hydrant", "targetTable": "audit_results", "filters": [{"field": "description", "operator": "contains-any", "value": ["APAR", "Hydrant"]}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan Tallasa Makassar" or "semua temuan Tallasa Makassar"
{"userIntent": "Semua temuan CitraLand Tallasa City Makassar", "targetTable": "audit_results", "filters": [{"field": "projectName", "operator": "==", "value": "CitraLand Tallasa City Makassar"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan dari 3 proyek: Tallasa, Raffles, dan Ciputra Mall" or "findings from Tallasa, Raffles, and Ciputra Mall"
{"userIntent": "Temuan dari 3 proyek", "targetTable": "audit_results", "filters": [{"field": "projectName", "operator": "in", "value": ["CitraLand Tallasa City Makassar", "Hotel Raffles Jakarta", "Mall Ciputra Cibubur"]}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "dep = IT, year 2024, code = F"
{"userIntent": "Temuan IT tahun 2024 dengan kode F", "targetTable": "audit_results", "filters": [{"field": "department", "operator": "==", "value": "IT"}, {"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "findings with value >= 10"
{"userIntent": "Temuan dengan value di atas atau sama dengan 10", "targetTable": "audit_results", "filters": [{"field": "value", "operator": ">=", "value": 10}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan APAR"
{"userIntent": "Semua temuan terkait APAR", "targetTable": "audit_results", "filters": [{"field": "description", "operator": "contains", "value": "APAR"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan kolam renang 2024"
{"userIntent": "Temuan kolam renang tahun 2024", "targetTable": "audit_results", "filters": [{"field": "description", "operator": "contains", "value": "kolam renang"}, {"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan kolam renang atau lift" or "findings about swimming pool or elevator"
{"userIntent": "Temuan terkait kolam renang atau lift", "targetTable": "audit_results", "filters": [{"field": "description", "operator": "contains-any", "value": ["kolam renang", "lift"]}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "show all PPJB findings" or "temuan yang mengandung PPJB"
{"userIntent": "Semua temuan yang mengandung kata PPJB di deskripsi", "targetTable": "audit_results", "filters": [{"field": "description", "operator": "contains", "value": "PPJB"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "findings with IMB in description" or "temuan dengan IMB"
{"userIntent": "Temuan dengan kata IMB di deskripsi", "targetTable": "audit_results", "filters": [{"field": "description", "operator": "contains", "value": "IMB"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "all IT audit results 2024" or "semua hasil audit IT 2024" or "all codes IT 2024"
{"userIntent": "Semua hasil audit IT tahun 2024 (termasuk F, NF, O, R)", "targetTable": "audit_results", "filters": [{"field": "department", "operator": "==", "value": "IT"}, {"field": "year", "operator": "==", "value": "2024"}], "isValidQuery": true}

Query: "semua hasil audit Tallasa Makassar" or "all audit results Tallasa"
{"userIntent": "Semua hasil audit CitraLand Tallasa City Makassar (termasuk F, NF, O, R)", "targetTable": "audit_results", "filters": [{"field": "projectName", "operator": "==", "value": "CitraLand Tallasa City Makassar"}], "isValidQuery": true}

Query: "list all projects" or "daftar proyek"
{"userIntent": "Daftar semua proyek", "targetTable": "projects", "filters": [], "isValidQuery": true}

Query: "projects with most findings" or "proyek dengan temuan terbanyak"
{"userIntent": "Proyek dengan temuan terbanyak", "targetTable": "projects", "filters": [{"field": "finding", "operator": ">", "value": 0}], "isValidQuery": true}

Query: "project HRJ" or "proyek HRJ"
{"userIntent": "Detail proyek dengan inisial HRJ", "targetTable": "projects", "filters": [{"field": "initials", "operator": "==", "value": "HRJ"}], "isValidQuery": true}

Query: "projects with zero findings" or "proyek tanpa temuan"
{"userIntent": "Proyek tanpa temuan (hanya non-finding)", "targetTable": "projects", "filters": [{"field": "finding", "operator": "==", "value": 0}], "isValidQuery": true}

Query: "list departments" or "daftar departemen"
{"userIntent": "Daftar semua departemen", "targetTable": "departments", "filters": [], "isValidQuery": true}

Query: "IT departments" or "departemen IT"
{"userIntent": "Departemen kategori IT", "targetTable": "departments", "filters": [{"field": "category", "operator": "==", "value": "IT"}], "isValidQuery": true}

CONTEXT-AWARE EXAMPLES (with conversation history):
Previous: "semua temuan HC 2024" (filters: department="HC", year="2024", code="F")
Current: "khusus mall ciputra cibubur" or "show only mall ciputra cibubur"
{"userIntent": "Temuan HC tahun 2024 khusus Mall Ciputra Cibubur", "targetTable": "audit_results", "filters": [{"field": "department", "operator": "==", "value": "HC"}, {"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}, {"field": "projectName", "operator": "==", "value": "Mall Ciputra Cibubur"}], "isValidQuery": true}

Previous: "semua temuan HR 2024" (filters: department="HR", year="2024", code="F")
Current: "khusus SH1" or "only SH1" or "SH1 saja"
{"userIntent": "Temuan HR tahun 2024 khusus SH1", "targetTable": "audit_results", "filters": [{"field": "department", "operator": "==", "value": "HR"}, {"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}, {"field": "subholding", "operator": "==", "value": "SH1"}], "isValidQuery": true}

Previous: "semua temuan HR 2024" (filters: department="HR", year="2024", code="F")
Current: "SH2 coba" or "coba SH2" or "filter SH2"
{"userIntent": "Temuan HR tahun 2024 khusus SH2", "targetTable": "audit_results", "filters": [{"field": "department", "operator": "==", "value": "HR"}, {"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}, {"field": "subholding", "operator": "==", "value": "SH2"}], "isValidQuery": true}

Previous: "semua temuan Tallasa Makassar" (filters: projectName="CitraLand Tallasa City Makassar")
Current: "hanya temuan" or "findings only"
{"userIntent": "Hanya temuan (code F) untuk CitraLand Tallasa City Makassar", "targetTable": "audit_results", "filters": [{"field": "projectName", "operator": "==", "value": "CitraLand Tallasa City Makassar"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Previous: "IT findings 2024" (filters: department="IT", year="2024", code="F")
Current: "show all results" or "semua hasil"
{"userIntent": "Semua hasil audit IT tahun 2024 (termasuk NF)", "targetTable": "audit_results", "filters": [{"field": "department", "operator": "==", "value": "IT"}, {"field": "year", "operator": "==", "value": "2024"}], "isValidQuery": true}

Previous: "proyek Raffles" (filters: projectName="Hotel Raffles Jakarta")
Current: "temuan 2024"
{"userIntent": "Temuan Hotel Raffles Jakarta tahun 2024", "targetTable": "audit_results", "filters": [{"field": "projectName", "operator": "==", "value": "Hotel Raffles Jakarta"}, {"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

AGGREGATION EXAMPLES:
Query: "count findings by department 2024" or "jumlah temuan per department 2024"
{"userIntent": "Jumlah temuan per department tahun 2024", "targetTable": "audit_results", "filters": [{"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}], "groupBy": "department", "aggregationType": "count", "sortOrder": "desc", "isValidQuery": true}

Query: "show me highest findings count by department 2024" or "department dengan temuan terbanyak 2024"
{"userIntent": "Department dengan jumlah temuan terbanyak tahun 2024", "targetTable": "audit_results", "filters": [{"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}], "groupBy": "department", "aggregationType": "count", "sortOrder": "desc", "isValidQuery": true}

Query: "group findings by project" or "kelompokkan temuan berdasarkan proyek"
{"userIntent": "Kelompokkan temuan berdasarkan proyek", "targetTable": "audit_results", "filters": [{"field": "code", "operator": "==", "value": "F"}], "groupBy": "projectName", "aggregationType": "count", "sortOrder": "desc", "isValidQuery": true}

Query: "sum value by department" or "total value per department"
{"userIntent": "Total value per department", "targetTable": "audit_results", "filters": [], "groupBy": "department", "aggregationType": "sum", "aggregateField": "value", "sortOrder": "desc", "isValidQuery": true}

Query: "average score by year" or "rata-rata value per tahun"
{"userIntent": "Rata-rata value per tahun", "targetTable": "audit_results", "filters": [], "groupBy": "year", "aggregationType": "avg", "aggregateField": "value", "sortOrder": "desc", "isValidQuery": true}

Query: "breakdown findings by SH" or "breakdown temuan per SH"
{"userIntent": "Breakdown temuan per SH", "targetTable": "audit_results", "filters": [{"field": "code", "operator": "==", "value": "F"}], "groupBy": "subholding", "aggregationType": "count", "sortOrder": "desc", "isValidQuery": true}

Query: "agregasi temuan APAR berdasarkan SH dan tahun" or "APAR findings by SH and year"
{"userIntent": "Agregasi temuan APAR berdasarkan SH dan tahun", "targetTable": "audit_results", "filters": [{"field": "description", "operator": "contains", "value": "APAR"}, {"field": "code", "operator": "==", "value": "F"}], "groupBy": ["subholding", "year"], "aggregationType": "count", "sortOrder": "desc", "isValidQuery": true}

Query: "from all projects, all PPJB findings sorted for the most show me" or "dari semua proyek, temuan PPJB terbanyak per proyek"
{"userIntent": "Temuan PPJB terbanyak per proyek", "targetTable": "audit_results", "filters": [{"field": "description", "operator": "contains", "value": "PPJB"}, {"field": "code", "operator": "==", "value": "F"}], "groupBy": "projectName", "aggregationType": "count", "sortOrder": "desc", "isValidQuery": true}

Query: "show me projects with most IMB findings" or "proyek dengan temuan IMB terbanyak"
{"userIntent": "Proyek dengan temuan IMB terbanyak", "targetTable": "audit_results", "filters": [{"field": "description", "operator": "contains", "value": "IMB"}, {"field": "code", "operator": "==", "value": "F"}], "groupBy": "projectName", "aggregationType": "count", "sortOrder": "desc", "isValidQuery": true}

LIMIT EXAMPLES:
Query: "top 10 findings with highest value" or "10 temuan dengan nilai tertinggi"
{"userIntent": "10 temuan dengan nilai tertinggi", "targetTable": "audit_results", "filters": [{"field": "code", "operator": "==", "value": "F"}], "sortBy": "value", "sortOrder": "desc", "limit": 10, "isValidQuery": true}

Query: "show first 5 IT findings 2024" or "tampilkan 5 temuan IT terbaru 2024"
{"userIntent": "5 temuan IT tahun 2024", "targetTable": "audit_results", "filters": [{"field": "department", "operator": "in", "value": ["Departemen IT"]}, {"field": "year", "operator": "==", "value": 2024}, {"field": "code", "operator": "==", "value": "F"}], "limit": 5, "isValidQuery": true}

NOT-IN EXAMPLES:
Query: "semua temuan kecuali IT dan Finance" or "all findings except IT and Finance"
{"userIntent": "Semua temuan kecuali IT dan Finance", "targetTable": "audit_results", "filters": [{"field": "department", "operator": "not-in", "value": ["Departemen IT", "Departemen Finance"]}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan 2024 bukan dari SH1" or "2024 findings not from SH1"
{"userIntent": "Temuan 2024 bukan dari SH1", "targetTable": "audit_results", "filters": [{"field": "year", "operator": "==", "value": 2024}, {"field": "subholding", "operator": "not-in", "value": ["SH1"]}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

CONTAINS-ANY (OR KEYWORD) EXAMPLES:
Query: "temuan terkait APAR, Hydrant, atau Heat Detector" or "findings about fire safety equipment"
{"userIntent": "Temuan terkait peralatan keselamatan kebakaran", "targetTable": "audit_results", "filters": [{"field": "description", "operator": "contains-any", "value": ["APAR", "Hydrant", "Heat Detector"]}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan PPJB atau SPPJB atau AJB" or "findings about property purchase agreements"
{"userIntent": "Temuan terkait perjanjian properti", "targetTable": "audit_results", "filters": [{"field": "description", "operator": "contains-any", "value": ["PPJB", "SPPJB", "AJB"]}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

DEPARTMENT_TAGS EXAMPLES:
Query: "daftar departemen" or "list all departments"
{"userIntent": "Daftar semua departemen", "targetTable": "department_tags", "filters": [], "isValidQuery": true}

Query: "departemen kategori IT" or "IT category departments"
{"userIntent": "Departemen kategori IT", "targetTable": "department_tags", "filters": [{"field": "category", "operator": "==", "value": "IT"}], "isValidQuery": true}

Query: "hello how are you"
{"userIntent": "Bukan query database", "targetTable": "audit_results", "filters": [], "isValidQuery": false, "invalidReason": "Ini bukan query database. Silakan tanyakan tentang audit findings, projects, atau departments."}

Return ONLY the JSON object.`;

      const response = await this.generateContentWithFallback(prompt);
      const responseText = response.text?.trim() || '{}';
      
      // Extract JSON from response
      let jsonText = responseText;
      if (responseText.includes('```')) {
        const match = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (match) jsonText = match[1];
      }

      const parsed = JSON.parse(jsonText);
      
      // Handle invalid queries
      if (!parsed.isValidQuery) {
        return {
          success: false,
          message: `❌ ${parsed.invalidReason || 'Query tidak valid. Silakan tanyakan tentang audit findings.'}`,
          resultsCount: 0,
          needsConfirmation: false,
          filters: [],
        };
      }

      const userIntent = parsed.userIntent || 'Mencari audit findings';
      const targetTable = parsed.targetTable || 'audit_results';
      let filters: QueryFilter[] = parsed.filters || [];
      const sortBy = parsed.sortBy;
      const sortOrder = parsed.sortOrder || 'desc';
      const limit = parsed.limit ? parseInt(parsed.limit, 10) : undefined;

      // Check for aggregation
      const groupBy = parsed.groupBy;
      const aggregationType = parsed.aggregationType || 'count';
      const aggregateField = parsed.aggregateField;

      // VALIDATION: Check project name(s) before executing
      const projectNameFilter = filters.find(f => f.field === 'projectName');
      if (projectNameFilter) {
        // Handle single project name (== operator)
        if (typeof projectNameFilter.value === 'string') {
          const validation = await this.validateProjectName(projectNameFilter.value);
          
          // If we got a corrected name, use it
          if (validation.correctedName) {
            projectNameFilter.value = validation.correctedName;
          }
          // If we got suggestions, need confirmation
          else if (validation.suggestions) {
            if (validation.suggestions.length === 0) {
              return {
                success: false,
                message: `❌ Proyek "${projectNameFilter.value}" tidak ditemukan dan tidak ada proyek serupa.\n\nSilakan periksa nama proyek dan coba lagi.`,
                resultsCount: 0,
                needsConfirmation: false,
                filters,
              };
            }
            
            return {
              success: false,
              message: `⚠️ Proyek "${projectNameFilter.value}" tidak ditemukan.\n\nApakah maksud Anda salah satu dari proyek ini?`,
              resultsCount: 0,
              needsConfirmation: true,
              filters,
              suggestions: validation.suggestions,
              originalQuery: query,
            };
          }
        }
        // Handle multiple project names (in operator)
        else if (Array.isArray(projectNameFilter.value) && projectNameFilter.operator === 'in') {
          const validation = await this.validateProjectNames(projectNameFilter.value);
          
          if (validation.invalidProjects.length > 0) {
            // Some projects not found - show suggestions for each
            const invalidCount = validation.invalidProjects.length;
            const validCount = validation.validProjects.length;
            
            // Build message with all invalid projects and their suggestions
            let message = `⚠️ ${invalidCount} proyek tidak ditemukan`;
            if (validCount > 0) {
              message += ` (${validCount} proyek valid akan digunakan)`;
            }
            message += ':\n\n';
            
            // Combine all suggestions from invalid projects
            const allSuggestions: ProjectSuggestion[] = [];
            validation.invalidProjects.forEach(invalid => {
              message += `📌 "${invalid.query}" tidak ditemukan\n`;
              if (invalid.suggestions.length > 0) {
                message += `   Apakah maksud Anda:\n`;
                invalid.suggestions.slice(0, 3).forEach(s => {
                  message += `   • ${s.name} (${Math.round(s.score * 100)}% match)\n`;
                  allSuggestions.push(s);
                });
              } else {
                message += `   Tidak ada proyek serupa\n`;
              }
              message += '\n';
            });
            
            // If we have valid projects, we can still execute with those
            if (validCount > 0) {
              message += `\n✅ Melanjutkan dengan ${validCount} proyek yang valid`;
              // Update filter to only use valid projects
              projectNameFilter.value = validation.validProjects;
            } else {
              // No valid projects at all
              return {
                success: false,
                message: message.trim(),
                resultsCount: 0,
                needsConfirmation: true,
                filters,
                suggestions: allSuggestions.slice(0, 10), // Limit to top 10 suggestions
                originalQuery: query,
              };
            }
          }
        }
      }

      // Execute query with original user query for context
      let results = await this.executeQuery(filters, targetTable, query, sortBy, sortOrder, limit);
      
      // SMART RETRY: If 0 results, ask AI to reflect and try again
      if (results.length === 0 && filters.length > 0) {
        console.log('⚠️ Got 0 results, asking AI to reflect and retry...');
        
        const retryPrompt = `The previous query returned 0 results. Let's analyze why:

ORIGINAL USER QUERY: "${query}"

FILTERS USED:
${JSON.stringify(filters, null, 2)}

TARGET TABLE: ${targetTable}

${departmentTagsContext}

POSSIBLE ISSUES:
1. Department name mismatch - Check if the department filter uses exact "departmentName" from DEPARTMENT_TAGS
2. Year format - Year should be NUMBER (e.g., 2024, not "2024")
3. Field name typo - Verify field names match TABLE_SCHEMA exactly
4. Value mismatch - Check if filter values exist in the database
5. Too restrictive - Maybe combining too many filters

TASK: Analyze the filters above and create a CORRECTED query that should return results.
Return the same JSON format with corrected filters.

Return ONLY the JSON object.`;

        try {
          const retryResponse = await this.generateContentWithFallback(retryPrompt);
          const retryText = retryResponse.text?.trim() || '{}';
          let retryJson = retryText;
          
          // Extract JSON from markdown code blocks
          if (retryText.includes('```')) {
            const jsonMatch = retryText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
            if (jsonMatch) {
              retryJson = jsonMatch[1];
            } else {
              // Try to find JSON array in code block
              const arrayMatch = retryText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
              if (arrayMatch) {
                // Wrap array in object
                retryJson = `{"filters": ${arrayMatch[1]}}`;
              }
            }
          }

          const retryParsed = JSON.parse(retryJson);
          const retryFilters: QueryFilter[] = retryParsed.filters || [];
          
          if (retryFilters.length > 0) {
            console.log('🔄 Retrying with corrected filters:', JSON.stringify(retryFilters, null, 2));
            results = await this.executeQuery(retryFilters, targetTable, query, sortBy, sortOrder, limit);
            
            if (results.length > 0) {
              console.log(`✅ Retry successful! Found ${results.length} results`);
              filters = retryFilters; // Use corrected filters for response
            } else {
              console.log('❌ Retry still returned 0 results');
            }
          }
        } catch (retryError) {
          console.error('Retry failed:', retryError);
          // Continue with original 0 results
        }
      }
      
      // Handle aggregation if requested
      if (groupBy) {
        const aggregatedResults = await this.aggregateResults(results, groupBy, aggregationType, aggregateField, sortOrder, filters);
        // Generate Excel with ALL detailed findings (not just aggregation summary)
        const { excelBuffer, excelFilename } = await this.generateExcel(results, targetTable, userIntent);
        
        const groupByDisplay = Array.isArray(groupBy) ? groupBy.join(' + ') : groupBy;
        const isMultiDimensional = Array.isArray(groupBy);
        
        const groupText = isMultiDimensional ? 'Multi-dimensional aggregation' : 'Agregasi';
        const message = `${userIntent}...\n\n${groupText} berdasarkan ${groupByDisplay}\nDitemukan ${aggregatedResults.length} grup dari ${results.length} temuan\n\n${this.describeFilters(filters)}`;

        return {
          success: true,
          message,
          aggregatedResults,
          results, // Include original results for reference
          resultsCount: aggregatedResults.length,
          table: targetTable,
          excelBuffer, // Excel contains ALL detailed findings
          excelFilename,
          needsConfirmation: false,
          filters,
          isAggregated: true,
          aggregationType: aggregationType as any,
          groupByField: groupBy,
        };
      }
      
      // Generate Excel file for non-aggregated results
      const { excelBuffer, excelFilename } = await this.generateExcel(results, targetTable, userIntent);

      // AUTO-GENERATE YEAR CHART for audit_results queries with multiple results
      let yearAggregation: AggregationResult[] | undefined;
      if (targetTable === 'audit_results' && results.length > 0) {
        console.log(`📊 Auto-generating year aggregation chart for ${results.length} findings`);
        yearAggregation = await this.aggregateResults(results, 'year', 'count', undefined, 'asc', filters);
        console.log(`📊 Generated ${yearAggregation.length} year groups for chart`);
      }

      // More personalized, conversational response
      const resultText = results.length === 0 
        ? 'Tidak ada hasil yang ditemukan' 
        : results.length === 1 
          ? 'Ditemukan 1 hasil'
          : `Ditemukan ${results.length} hasil`;
      
      const filterDesc = this.describeFilters(filters);
      const message = `${userIntent}...\n\n${resultText}${filterDesc ? ' dengan filter:\n' + filterDesc : '.'}`;

      return {
        success: true,
        message,
        results,
        resultsCount: results.length,
        table: targetTable,
        excelBuffer,
        excelFilename,
        needsConfirmation: false,
        filters,
        // Include year aggregation for automatic chart display
        yearAggregation,
      };
    } catch (error) {
      console.error('Query processing error:', error);
      return {
        success: false,
        message: `❌ Gagal memproses query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        resultsCount: 0,
        needsConfirmation: false,
      };
    }
  }

  /**
   * Execute query against Firestore
   *
   * IMPORTANT: Firestore has limitations on composite indexes.
   * Range/inequality operators (>, >=, <, <=, !=) on multiple fields require composite indexes.
   * Strategy: Execute with equality filters in Firestore, apply range filters in-memory.
   *
   * @param filters - Query filters to apply
   * @param table - Target table name
   * @param userQuery - Original user query for AI-powered department matching context
   * @param sortBy - Field to sort by (optional)
   * @param sortOrder - Sort order: asc or desc (optional)
   * @param limit - Maximum number of results to return (optional)
   */
  private async executeQuery(
    filters: QueryFilter[],
    table: string,
    userQuery?: string,
    sortBy?: string,
    sortOrder?: string,
    limit?: number
  ): Promise<any[]> {
    try {
      const db = new DatabaseService(table);
      
      console.log('🔍 Bernard executeQuery - Input filters:', JSON.stringify(filters, null, 2));
      
      // Separate filters by type for appropriate handling
      const rangeOperators = ['>', '>=', '<', '<=', '!='];
      const equalityFilters: QueryFilter[] = [];
      const rangeFilters: QueryFilter[] = [];
      const containsFilters: QueryFilter[] = [];      // Single keyword search (AND logic)
      const containsAnyFilters: QueryFilter[] = [];  // Multiple keywords search (OR logic)
      const notInFilters: QueryFilter[] = [];        // Exclusion filters

      filters.forEach(f => {
        if (f.operator === 'contains') {
          containsFilters.push(f);
        } else if (f.operator === 'contains-any') {
          containsAnyFilters.push(f);
        } else if (f.operator === 'not-in') {
          notInFilters.push(f);
        } else if (rangeOperators.includes(f.operator)) {
          rangeFilters.push(f);
        } else {
          equalityFilters.push(f);
        }
      });

      console.log('🔍 Equality filters (Firestore):', JSON.stringify(equalityFilters, null, 2));
      console.log('🔍 Range filters (in-memory):', JSON.stringify(rangeFilters, null, 2));
      console.log('🔍 Contains filters (in-memory):', JSON.stringify(containsFilters, null, 2));
      console.log('🔍 Contains-any filters (in-memory):', JSON.stringify(containsAnyFilters, null, 2));
      console.log('🔍 Not-in filters (in-memory):', JSON.stringify(notInFilters, null, 2));
      
      // Handle filter transformations for audit_results
      let expandedFilters = equalityFilters;

      if (table === 'audit_results') {
        // NOTE: Department expansion is now handled by the LLM
        // The LLM receives DEPARTMENT_TAGS list and returns exact departmentName values
        // No client-side expansion needed

        // Ensure year is number (Firestore stores year as number)
        expandedFilters = expandedFilters.map(f => {
          if (f.field === 'year') {
            // Handle single value
            if (typeof f.value === 'string') {
              const yearNum = parseInt(f.value, 10);
              console.log(`📅 Converting year from "${f.value}" (string) to ${yearNum} (number)`);
              return { ...f, value: yearNum };
            }
            if (typeof f.value === 'number') {
              console.log(`📅 Year already number: ${f.value}`);
              return f;
            }
            // Handle array of values (for 'in' operator)
            if (Array.isArray(f.value)) {
              const yearNums = f.value.map(v => {
                if (typeof v === 'string') {
                  return parseInt(v, 10);
                }
                return v;
              });
              console.log(`📅 Converting year array from [${f.value.join(', ')}] to [${yearNums.join(', ')}]`);
              return { ...f, value: yearNums };
            }
          }
          return f;
        });
      }
      
      console.log('🔍 Bernard executeQuery - Expanded equality filters:', JSON.stringify(expandedFilters, null, 2));
      
      // Convert filters to DatabaseService format
      // Validate 'in' operator values (Firestore limit: 30 values max)
      const dbFilters = expandedFilters.map(f => {
        if (f.operator === 'in' && Array.isArray(f.value)) {
          if (f.value.length > 30) {
            console.warn(`⚠️ 'in' operator limited to 30 values, truncating from ${f.value.length}`);
            return {
              field: f.field,
              operator: f.operator as any,
              value: f.value.slice(0, 30)
            };
          }
        }
        if (f.operator === 'array-contains-any' && Array.isArray(f.value)) {
          if (f.value.length > 30) {
            console.warn(`⚠️ 'array-contains-any' operator limited to 30 values, truncating from ${f.value.length}`);
            return {
              field: f.field,
              operator: f.operator as any,
              value: f.value.slice(0, 30)
            };
          }
        }
        return {
          field: f.field,
          operator: f.operator as any,
          value: f.value
        };
      });

      // Determine sort order
      const orderBy = table === 'projects' ? 'projectName' : 'year';
      const orderDir = table === 'audit_results' ? 'desc' : 'asc';

      // Define fields to select based on table
      let selectFields: string[] | undefined;
      if (table === 'audit_results') {
        // Only fetch fields needed for Bernard display
        selectFields = ['year', 'projectName', 'subholding', 'department', 'riskArea', 'description', 'projectCategory'];
      }

      // Fetch with equality filters only (avoids composite index issues)
      // Use higher limit to accommodate large result sets (e.g., all code F findings = 4000+)
      const hasInMemoryFilters = rangeFilters.length > 0 || containsFilters.length > 0 || containsAnyFilters.length > 0 || notInFilters.length > 0;
      let results;
      
      try {
        results = await db.getAll({
          filters: dbFilters,
          sorts: [{ field: orderBy, direction: orderDir }],
          limit: hasInMemoryFilters ? 10000 : 5000, // Increased limits for large datasets
          select: selectFields
        });
      } catch (error: any) {
        // If index is still building, retry without orderBy and sort in-memory
        if (error.message?.includes('index is currently building') || error.message?.includes('requires an index')) {
          console.warn('⚠️ Index still building, fetching without orderBy and sorting in-memory');
          results = await db.getAll({
            filters: dbFilters,
            limit: hasInMemoryFilters ? 10000 : 5000
          });
          // Sort in-memory
          results.sort((a, b) => {
            const aVal = a[orderBy];
            const bVal = b[orderBy];
            if (orderDir === 'desc') {
              return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
            } else {
              return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            }
          });
        } else {
          throw error;
        }
      }
      
      
      
      // Apply range filters in-memory
      if (rangeFilters.length > 0) {
        console.log(`🔍 Applying ${rangeFilters.length} range filter(s) in-memory on ${results.length} results`);
        
        results = results.filter(item => {
          return rangeFilters.every(f => {
            const itemValue = item[f.field];
            const filterValue = f.value;
            
            // Handle null/undefined values
            if (itemValue === null || itemValue === undefined) return false;
            
            // Convert to numbers for comparison if both are numeric
            const numItemValue = typeof itemValue === 'number' ? itemValue : parseFloat(itemValue);
            const numFilterValue = typeof filterValue === 'number' ? filterValue : parseFloat(String(filterValue));
            
            const useNumeric = !isNaN(numItemValue) && !isNaN(numFilterValue);
            const compareItem = useNumeric ? numItemValue : itemValue;
            const compareFilter = useNumeric ? numFilterValue : filterValue;
            
            switch (f.operator) {
              case '>': return compareItem > compareFilter;
              case '>=': return compareItem >= compareFilter;
              case '<': return compareItem < compareFilter;
              case '<=': return compareItem <= compareFilter;
              case '!=': return compareItem !== compareFilter;
              default: return true;
            }
          });
        });
        
        console.log(`🔍 After in-memory filtering: ${results.length} results`);
        
        // Limit results after filtering (increased to 5000 for large datasets)
        if (results.length > 5000) {
          results = results.slice(0, 5000);
        }
      }

      // Apply contains filters in-memory (case-insensitive text search, AND logic)
      if (containsFilters.length > 0) {
        console.log(`🔍 Applying ${containsFilters.length} contains filter(s) in-memory on ${results.length} results (AND logic)`);

        results = results.filter(item => {
          return containsFilters.every(f => {
            const itemValue = item[f.field];
            const searchValue = String(f.value);

            // Handle null/undefined values
            if (itemValue === null || itemValue === undefined) return false;

            // Case-insensitive contains check
            const itemText = String(itemValue).toLowerCase();
            const searchText = searchValue.toLowerCase();

            return itemText.includes(searchText);
          });
        });

        console.log(`🔍 After contains filtering: ${results.length} results`);
      }

      // Apply contains-any filters in-memory (case-insensitive text search, OR logic)
      if (containsAnyFilters.length > 0) {
        console.log(`🔍 Applying ${containsAnyFilters.length} contains-any filter(s) in-memory on ${results.length} results (OR logic)`);

        results = results.filter(item => {
          return containsAnyFilters.every(f => {
            const itemValue = item[f.field];
            const searchValues = Array.isArray(f.value) ? f.value : [f.value];

            // Handle null/undefined values
            if (itemValue === null || itemValue === undefined) return false;

            // Case-insensitive contains check - match ANY of the search values
            const itemText = String(itemValue).toLowerCase();
            return searchValues.some(searchValue => {
              const searchText = String(searchValue).toLowerCase();
              return itemText.includes(searchText);
            });
          });
        });

        console.log(`🔍 After contains-any filtering: ${results.length} results`);
      }

      // Apply not-in filters in-memory (exclusion logic)
      if (notInFilters.length > 0) {
        console.log(`🔍 Applying ${notInFilters.length} not-in filter(s) in-memory on ${results.length} results`);

        results = results.filter(item => {
          return notInFilters.every(f => {
            const itemValue = item[f.field];
            const excludeValues = Array.isArray(f.value) ? f.value : [f.value];

            // Handle null/undefined values - exclude them if they should be excluded
            if (itemValue === null || itemValue === undefined) return true;

            // Check if item value is NOT in the exclusion list
            const itemStr = String(itemValue).toLowerCase();
            return !excludeValues.some(excludeVal =>
              String(excludeVal).toLowerCase() === itemStr
            );
          });
        });

        console.log(`🔍 After not-in filtering: ${results.length} results`);
      }

      // Apply custom sorting if specified
      if (sortBy && results.length > 0) {
        console.log(`🔀 Sorting by ${sortBy} (${sortOrder || 'desc'})`);
        
        results.sort((a, b) => {
          const aVal = a[sortBy];
          const bVal = b[sortBy];
          
          // Handle null/undefined values
          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;
          
          // Numeric comparison
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
          }
          
          // String comparison
          const aStr = String(aVal);
          const bStr = String(bVal);
          const comparison = aStr.localeCompare(bStr);
          return sortOrder === 'asc' ? comparison : -comparison;
        });
        
        console.log(`✅ Sorted ${results.length} results by ${sortBy} (${sortOrder})`);
      }

      // Apply limit if specified
      if (limit && limit > 0 && results.length > limit) {
        console.log(`📊 Applying limit: returning top ${limit} of ${results.length} results`);
        results = results.slice(0, limit);
      }

      return results;
    } catch (error) {
      console.error('Query execution error:', error);
      return [];
    }
  }

  /**
   * Generate Excel file from results
   */
  private async generateExcel(
    results: any[],
    table: string,
    userIntent: string
  ): Promise<{ excelBuffer: ArrayBuffer; excelFilename: string }> {
    try {
      // Prepare data based on table type
      let excelData: any[] = [];
      let sheetName = '';

      if (table === 'audit_results') {
        sheetName = 'Audit Results';
        excelData = results.map(r => ({
          'Year': r.year || '',
          'Subholding': r.subholding || '',
          'Project Name': r.projectName || '',
          'Department': r.department || '',
          'Risk Area': r.riskArea || '',
          'Description': r.description || '',
          'Code': r.code || '',
          'Weight': r.weight || 0,
          'Severity': r.severity || 0,
          'Value': r.value || 0,
          'Is Repeat': r.isRepeat || 0,
        }));
      } else if (table === 'projects') {
        sheetName = 'Projects';
        excelData = results.map(r => ({
          'Project Name': r.projectName || '',
          'Subholding': r.subholding || '',
          'Year': r.year || '',
          'TBK': r.tbk || '',
          'Industry': r.industry || '',
          'Category': r.category || '',
          'Location': r.location || '',
          'Tags': Array.isArray(r.tags) ? r.tags.join(', ') : '',
        }));
      }

      // Create workbook
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Set column widths
      if (table === 'audit_results') {
        worksheet['!cols'] = [
          { wch: 10 }, { wch: 15 }, { wch: 40 }, { wch: 15 },
          { wch: 25 }, { wch: 25 }, { wch: 60 }, { wch: 10 },
          { wch: 10 }, { wch: 10 }, { wch: 10 }
        ];
      } else if (table === 'projects') {
        worksheet['!cols'] = [
          { wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 15 },
          { wch: 20 }, { wch: 30 }, { wch: 30 }
        ];
      }

      // Generate buffer
      const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const sanitizedIntent = userIntent
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .substring(0, 30);
      const excelFilename = `bernard-${sanitizedIntent}-${timestamp}.xlsx`;

      return { excelBuffer, excelFilename };
    } catch (error) {
      console.error('Excel generation error:', error);
      throw error;
    }
  }

  /**
   * Describe filters in Indonesian
   */
  private describeFilters(filters: QueryFilter[]): string {
    if (filters.length === 0) {
      return '📊 Semua findings (no filters)';
    }

    const icons: Record<string, string> = {
      department: '📂',
      year: '📅',
      projectName: '🏢',
      subholding: '🏛️',
      initials: '🔤',
      code: '🏷️',
      value: '📊',
      weight: '⚖️',
      severity: '🔥',
      riskArea: '🎯',
      sh: '🔖',
      tags: '🏷️',
      finding: '⚠️',
      nonFinding: '✅',
      total: '📈',
      category: '📁',
      name: '📛',
      projectType: '🏗️',
      subtype: '🏛️',
      description: '📝'
    };

    const fieldNames: Record<string, string> = {
      department: 'department',
      year: 'tahun',
      projectName: 'proyek',
      projectId: 'ID proyek',
      initials: 'inisial',
      code: 'kode',
      value: 'value',
      weight: 'weight',
      severity: 'severity',
      riskArea: 'area risiko',
      sh: 'SH',
      tags: 'tag',
      finding: 'temuan',
      nonFinding: 'non-temuan',
      total: 'total',
      category: 'kategori',
      name: 'nama',
      projectType: 'tipe proyek',
      subtype: 'subtipe',
      description: 'deskripsi'
    };

    return filters.map(f => {
      const icon = icons[f.field] || '•';
      const fieldName = fieldNames[f.field] || f.field;
      
      // Format value display for arrays
      let displayValue: string;
      if (Array.isArray(f.value)) {
        if (f.value.length <= 3) {
          displayValue = f.value.join(', ');
        } else {
          displayValue = `${f.value.slice(0, 3).join(', ')} dan ${f.value.length - 3} lainnya`;
        }
      } else {
        displayValue = String(f.value);
      }
      
      // More conversational operator display
      const operatorText = f.operator === 'in' ? '' : 
                          f.operator === 'array-contains-any' ? 'mengandung' :
                          f.operator === 'contains' ? 'mengandung' :
                          f.operator === '==' ? '' :
                          f.operator;
      
      return `${icon} ${fieldName}: ${displayValue}`;
    }).join('\n');
  }

  /**
   * Helper to match a value against a filter
   */
  private matchesFilter(value: any, filter: QueryFilter): boolean {
    if (value === null || value === undefined) return false;
    
    const filterValue = filter.value;
    
    switch (filter.operator) {
      case '==':
        // Handle case-insensitive string matching
        if (typeof value === 'string' && typeof filterValue === 'string') {
          return value.toLowerCase().includes(filterValue.toLowerCase());
        }
        return value === filterValue;
      case '!=':
        return value !== filterValue;
      case '>':
        return value > filterValue;
      case '>=':
        return value >= filterValue;
      case '<':
        return value < filterValue;
      case '<=':
        return value <= filterValue;
      case 'array-contains':
        return Array.isArray(value) && value.includes(filterValue);
      case 'array-contains-any': {
        if (!Array.isArray(value) || !Array.isArray(filterValue)) return false;
        // Check if any filter value exists in the value array
        for (const fv of filterValue) {
          if (value.indexOf(fv) !== -1) return true;
        }
        return false;
      }
      case 'in':
        return Array.isArray(filterValue) && (filterValue as any[]).includes(value);
      case 'contains':
        // Case-insensitive text search
        if (typeof value === 'string' && typeof filterValue === 'string') {
          return value.toLowerCase().includes(filterValue.toLowerCase());
        }
        return false;
      default:
        return true;
    }
  }

  /**
   * Get department names using AI-powered category matching
   * Uses existing department categories to match user intent
   */
  
  /**
   * Get all project names for fuzzy matching suggestions
   */
  private async getAllProjectNames(): Promise<string[]> {
    try {
      const db = new DatabaseService('projects');
      const projects = await db.getAll({ limit: 500 });
      console.log(`📋 Fetched ${projects.length} projects for fuzzy matching`);
      
      if (projects.length > 0) {
        console.log('📋 Sample project:', projects[0]);
      }
      
      const names = projects.map((p: any) => p.projectName).filter(Boolean);
      console.log(`📋 Extracted ${names.length} project names`);
      console.log('📋 First 5 names:', names.slice(0, 5));
      
      return names;
    } catch (error) {
      console.error('Error fetching project names:', error);
      return [];
    }
  }



  /**
   * Generate interactive demo response
   */
  private generateDemoResponse(): string {
    return `╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║              🎯 BERNARD AI ASSISTANT - INTERACTIVE DEMO             ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

Welcome to Bernard! Let me show you what I can do. 🚀

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 FEATURE 1: NATURAL LANGUAGE QUERIES

I understand questions in plain English or Indonesian!

Try these examples:
┌─────────────────────────────────────────────────────────────────┐
│ 🔹 "show all IT findings 2024"                                  │
│ 🔹 "temuan HC tahun 2024"                                       │
│ 🔹 "findings from hospitals"                                    │
│ 🔹 "temuan dengan value >= 10"                                  │
└─────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 FEATURE 2: SMART FILTER EXTRACTION

I automatically extract filters from your questions:

Example: "show IT findings 2024 with value >= 10"
┌─────────────────────────────────────────────────────────────────┐
│ ✅ Extracted Filters:                                           │
│    📂 department = IT                                           │
│    📅 year = 2024                                               │
│    📊 value >= 10                                               │
│    🏷️ code = F (findings only)                                 │
└─────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔀 FEATURE 3: OR LOGIC SUPPORT

Query multiple values at once!

Example: "temuan IT atau Finance 2024"
┌─────────────────────────────────────────────────────────────────┐
│ ✅ Filters:                                                     │
│    📂 department IN [IT, Finance]                               │
│    📅 year = 2024                                               │
│    🏷️ code = F                                                  │
└─────────────────────────────────────────────────────────────────┘

More examples:
• "findings from SH1 or SH2"
• "temuan APAR atau Hydrant"
• "projects from hospitals, hotels, or malls"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧠 FEATURE 4: CONTEXT-AWARE CONVERSATIONS

I remember your previous filters!

Conversation Example:
┌─────────────────────────────────────────────────────────────────┐
│ 👤 You: "semua temuan HC 2024"                                  │
│ 🤖 Bernard: [Shows HC findings from 2024]                        │
│                                                                 │
│ 👤 You: "khusus mall ciputra cibubur"                          │
│ 🤖 Bernard: [Keeps HC + 2024 filters, adds Mall filter]          │
│                                                                 │
│ 👤 You: "hanya yang value >= 15"                               │
│ 🤖 Bernard: [Keeps all previous filters, adds value >= 15]       │
└─────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏢 FEATURE 5: PROJECT TYPE & SUBTYPE FILTERING

Query by business type or specific categories!

Project Types:
┌─────────────────────────────────────────────────────────────────┐
│ 🏥 Healthcare    → Hospital, Clinic                             │
│ 🏨 Commercial    → Hotel, Mall, Office                          │
│ 🏠 Residential   → Landed House, Apartment                      │
│ 🎓 Education     → School, University                           │
│ 🏗️ Others        → Broker, Insurance, Theatre, Golf            │
└─────────────────────────────────────────────────────────────────┘

Try:
• "findings from healthcare projects"
• "temuan hospital"
• "show all mall findings 2024"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 FEATURE 6: FUZZY PROJECT NAME MATCHING

Misspelled a project name? No problem!

Example: You type "Rafles Jakarta"
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ Did you mean one of these?                                   │
│                                                                 │
│ 1. Hotel Raffles Jakarta (95% match) ⭐                         │
│ 2. Hotel Raffles Surabaya (87% match)                          │
│ 3. Raffles Residence (82% match)                               │
└─────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔤 FEATURE 7: DEPARTMENT SMART MATCHING

I understand department abbreviations and variations!

Automatic Expansions:
┌─────────────────────────────────────────────────────────────────┐
│ "HC" → Human Capital, HRD, SDM, People Management               │
│ "IT" → Information Technology, ICT, Teknologi Informasi         │
│ "Finance" → Keuangan, Accounting, FAD, Treasury                 │
└─────────────────────────────────────────────────────────────────┘

20 Department Categories:
• IT • Finance • HR • Marketing & Sales
• Property Management • Engineering & Construction
• Legal & Compliance • Audit & Risk
• Healthcare • Operations • And more...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔀 FEATURE 8: CUSTOM SORTING

Sort results by any field!

Examples:
┌─────────────────────────────────────────────────────────────────┐
│ • "findings from hospitals, highest score first"                │
│ • "temuan IT 2024 dari value tertinggi"                        │
│ • "projects sorted by finding count descending"                 │
└─────────────────────────────────────────────────────────────────┘

Supported sort fields:
📊 value • ⚖️ weight • 🔥 severity • 📅 year • 🏢 projectName

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 FEATURE 9: AUTOMATIC EXCEL EXPORT

Every query generates a downloadable Excel file!

File Format:
┌─────────────────────────────────────────────────────────────────┐
│ 📊 Formatted columns with proper widths                         │
│ 📋 All result fields included                                   │
│ 📅 Timestamped filename                                         │
│ 💾 Ready for analysis in Excel/Google Sheets                    │
└─────────────────────────────────────────────────────────────────┘

Example: bernard-temuan-it-2024-2026-01-30.xlsx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 FEATURE 10: SESSION MANAGEMENT

All your conversations are saved!

Features:
┌─────────────────────────────────────────────────────────────────┐
│ ✅ Auto-generated session titles                                │
│ ✅ Chat history sidebar                                         │
│ ✅ Switch between sessions seamlessly                           │
│ ✅ Context maintained per session                               │
│ ✅ Persistent across app restarts                               │
└─────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 DATA COVERAGE

┌─────────────────────────────────────────────────────────────────┐
│ 📋 8,840+ audit findings                                        │
│ 🏢 110+ real estate projects                                    │
│ 📂 20 department categories                                     │
│ 🏗️ 5 project types                                              │
│ 🏛️ 15+ project subtypes                                         │
│ 🏷️ 200+ Indonesian real estate terms                            │
└─────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 QUICK START EXAMPLES

Ready to try? Here are some queries to get you started:

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 1️⃣ BASIC QUERY                                                 ┃
┃    "show all IT findings 2024"                                 ┃
┃                                                                ┃
┃ 2️⃣ WITH FILTERS                                                ┃
┃    "temuan HC 2024 dengan value >= 10"                        ┃
┃                                                                ┃
┃ 3️⃣ OR LOGIC                                                    ┃
┃    "findings from IT or Finance 2024"                          ┃
┃                                                                ┃
┃ 4️⃣ PROJECT TYPE                                                ┃
┃    "temuan dari hospital, highest score first"                 ┃
┃                                                                ┃
┃ 5️⃣ SPECIFIC PROJECT                                            ┃
┃    "findings from Mall Ciputra Cibubur"                        ┃
┃                                                                ┃
┃ 6️⃣ TAG SEARCH                                                  ┃
┃    "temuan APAR atau Hydrant"                                  ┃
┃                                                                ┃
┃ 7️⃣ PROJECT LIST                                                ┃
┃    "list all projects"                                         ┃
┃                                                                ┃
┃ 8️⃣ DEPARTMENT INFO                                             ┃
┃    "show all departments"                                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 PRO TIPS

┌─────────────────────────────────────────────────────────────────┐
│ ✨ Use natural language - I understand context!                 │
│ ✨ Mix English and Indonesian - both work!                      │
│ ✨ I remember previous filters in the conversation              │
│ ✨ Misspellings are OK - I'll suggest corrections               │
│ ✨ Every result includes Excel export                           │
│ ✨ Type "reset" to clear conversation context                   │
└─────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 READY TO START?

Just type your question naturally, and I'll handle the rest!

Examples to try right now:
• "show all IT findings 2024"
• "temuan HC tahun 2024"
• "findings from hospitals"
• "list all projects"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Powered by Google Gemini 2.0 Flash Exp 🤖
Bernard AI Assistant v1.0 | FIRST-AID Audit System

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  /**
   * Create compact context message for LLM (instead of full formatted response)
   * This prevents the LLM from being overwhelmed by large result tables
   */
  private createCompactContextMessage(queryResult: QueryResult): string {
    const filterDesc = queryResult.filters && queryResult.filters.length > 0
      ? queryResult.filters.map(f => `${f.field}=${JSON.stringify(f.value)}`).join(', ')
      : 'no filters';
    
    return `Query executed: ${queryResult.resultsCount} results found. Filters: ${filterDesc}`;
  }

  /**
   * Generate title from first message
   */
  private generateTitle(message: string): string {
    const firstLine = message.split('\n')[0];
    return firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
  }

  // Session management methods
  async getSessionHistory(sessionId: string) {
    return await BernardChatService.getSessionChats(sessionId);
  }

  async getUserSessions(userId: string, limit?: number) {
    return await BernardSessionService.getUserSessions(userId, limit);
  }

  async createNewSession(userId: string): Promise<string> {
    return await BernardSessionService.createSession(userId);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await BernardChatService.deleteSessionChats(sessionId);
    await BernardSessionService.delete(sessionId);
  }

  /**
   * Aggregate results by one or more fields (pivot table functionality)
   * Supports both single and multi-dimensional aggregation
   * @param results - Raw query results
   * @param groupBy - Field(s) to group by (string for single, array for multi-dimensional)
   * @param aggregationType - Type of aggregation (count, sum, avg, min, max)
   * @param aggregateField - Field to aggregate (for sum/avg/min/max)
   * @param sortOrder - Sort order for results (asc/desc)
   * @param baseFilters - Base filters to include in group filters
   */
  private async aggregateResults(
    results: any[],
    groupBy: string | string[],
    aggregationType: string = 'count',
    aggregateField?: string,
    sortOrder: string = 'desc',
    baseFilters: QueryFilter[] = []
  ): Promise<AggregationResult[]> {
    const isMultiDimensional = Array.isArray(groupBy);
    const groupByFields = isMultiDimensional ? groupBy : [groupBy];
    
    console.log(`📊 Aggregating ${results.length} results by ${isMultiDimensional ? groupByFields.join(' + ') : groupBy} (${aggregationType})`);

    // Check if we need to enrich with project data (for projectType/subtype aggregation)
    const needsProjectData = groupByFields.some(field => field === 'projectType' || field === 'subtype');
    let projectMap = new Map<string, any>();
    
    if (needsProjectData) {
      console.log(`🏢 Aggregation requires project data (projectType/subtype) - fetching projects`);
      const projectsDb = new DatabaseService('projects');
      const allProjects = await projectsDb.getAll({ limit: 500 });
      
      allProjects.forEach((p: any) => {
        projectMap.set(p.projectId, p);
      });
      
      console.log(`📋 Loaded ${projectMap.size} projects for enrichment`);
      
      // Enrich results with project data
      results = results.map(result => {
        const project = projectMap.get(result.projectId);
        if (project) {
          return {
            ...result,
            projectType: project.projectType,
            subtype: project.subtype,
          };
        }
        return result;
      });
      
      console.log(`✅ Enriched ${results.length} results with project type/subtype data`);
    }

    // Group results by the specified field(s)
    const groups = new Map<string, any[]>();
    
    for (const result of results) {
      // Create composite key for multi-dimensional grouping
      const keyParts: string[] = [];
      const groupValues: Record<string, string | number> = {};
      let hasNullValue = false;
      
      for (const field of groupByFields) {
        const value = result[field];
        if (value === null || value === undefined) {
          hasNullValue = true;
          break;
        }
        keyParts.push(String(value));
        groupValues[field] = value;
      }
      
      if (hasNullValue) continue;
      
      const compositeKey = keyParts.join('|||'); // Use delimiter that won't appear in data
      if (!groups.has(compositeKey)) {
        groups.set(compositeKey, []);
      }
      groups.get(compositeKey)!.push(result);
    }

    console.log(`📊 Found ${groups.size} unique ${isMultiDimensional ? 'multi-dimensional ' : ''}groups`);

    // Calculate aggregations for each group
    const aggregatedResults: AggregationResult[] = [];
    
    for (const [_compositeKey, groupResults] of groups.entries()) {
      // For keyword-based aggregation, each finding counts only once
      const uniqueFindings = new Set<string>();
      groupResults.forEach(r => {
        if (r.uniqueId) {
          uniqueFindings.add(r.uniqueId);
        }
      });
      
      // Extract group values from first result in group
      const firstResult = groupResults[0];
      const groupValue = isMultiDimensional 
        ? groupByFields.reduce((obj, field) => {
            obj[field] = firstResult[field];
            return obj;
          }, {} as Record<string, string | number>)
        : firstResult[groupByFields[0]];
      
      // Create filters for this specific group (base filters + group filters)
      const groupFilters: QueryFilter[] = [...baseFilters];
      
      if (isMultiDimensional) {
        // Add filter for each dimension
        groupByFields.forEach(field => {
          groupFilters.push({ 
            field, 
            operator: '==', 
            value: firstResult[field] 
          });
        });
      } else {
        groupFilters.push({ 
          field: groupByFields[0], 
          operator: '==', 
          value: firstResult[groupByFields[0]] 
        });
      }
      
      const aggregation: AggregationResult = {
        groupBy,
        groupValue,
        count: uniqueFindings.size > 0 ? uniqueFindings.size : groupResults.length,
        filters: groupFilters,
      };

      // Calculate additional aggregations if field specified
      if (aggregateField && groupResults.length > 0) {
        const values = groupResults
          .map(r => r[aggregateField])
          .filter(v => typeof v === 'number' && !isNaN(v));

        if (values.length > 0) {
          switch (aggregationType) {
            case 'sum':
              aggregation.sum = values.reduce((a, b) => a + b, 0);
              break;
            case 'avg':
              aggregation.avg = values.reduce((a, b) => a + b, 0) / values.length;
              break;
            case 'min':
              aggregation.min = Math.min(...values);
              break;
            case 'max':
              aggregation.max = Math.max(...values);
              break;
          }
        }
      }

      aggregatedResults.push(aggregation);
    }

    // Sort results
    aggregatedResults.sort((a, b) => {
      let compareValue = 0;
      
      // Determine what to sort by
      if (aggregationType === 'count' || !aggregateField) {
        compareValue = a.count - b.count;
      } else if (aggregationType === 'sum' && a.sum !== undefined && b.sum !== undefined) {
        compareValue = a.sum - b.sum;
      } else if (aggregationType === 'avg' && a.avg !== undefined && b.avg !== undefined) {
        compareValue = a.avg - b.avg;
      } else if (aggregationType === 'min' && a.min !== undefined && b.min !== undefined) {
        compareValue = a.min - b.min;
      } else if (aggregationType === 'max' && a.max !== undefined && b.max !== undefined) {
        compareValue = a.max - b.max;
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    console.log(`✅ Aggregation complete: ${aggregatedResults.length} groups`);
    return aggregatedResults;
  }

  /**
   * Generate Excel file from aggregated results
   */
  private async generateAggregatedExcel(
    aggregatedResults: AggregationResult[],
    groupBy: string,
    aggregationType: string,
    userIntent: string
  ): Promise<{ excelBuffer: ArrayBuffer; excelFilename: string }> {
    try {
      // Prepare data for Excel
      const excelData = aggregatedResults.map(r => {
        const row: any = {
          [groupBy]: r.groupValue,
          'Count': r.count,
        };

        if (r.sum !== undefined) row['Sum'] = r.sum;
        if (r.avg !== undefined) row['Average'] = r.avg.toFixed(2);
        if (r.min !== undefined) row['Min'] = r.min;
        if (r.max !== undefined) row['Max'] = r.max;

        return row;
      });

      // Create workbook
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Aggregated Results');

      // Set column widths
      worksheet['!cols'] = [
        { wch: 30 }, // Group by field
        { wch: 12 }, // Count
        { wch: 12 }, // Sum
        { wch: 12 }, // Avg
        { wch: 12 }, // Min
        { wch: 12 }, // Max
      ];

      // Generate buffer
      const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const sanitizedIntent = userIntent
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .substring(0, 30);
      const excelFilename = `bernard-aggregated-${sanitizedIntent}-${timestamp}.xlsx`;

      return { excelBuffer, excelFilename };
    } catch (error) {
      console.error('Aggregated Excel generation error:', error);
      throw error;
    }
  }
  /**
   * Fetch underlying findings for an aggregation group
   */
  async fetchAggregationGroupDetails(
    filters: QueryFilter[],
    table: string = 'audit_results'
  ): Promise<{ results: any[]; excelBuffer: ArrayBuffer; excelFilename: string }> {
    try {
      console.log('📊 Fetching aggregation group details with filters:', filters);
      
      // Execute query to get the underlying findings
      const results = await this.executeQuery(filters, table);
      
      // Generate Excel for this specific group
      const groupValue = filters.find(f => f.field !== 'code' && f.field !== 'year' && f.field !== 'department')?.value || 'group';
      const userIntent = `Details for ${groupValue}`;
      const { excelBuffer, excelFilename } = await this.generateExcel(results, table, userIntent);
      
      return { results, excelBuffer, excelFilename };
    } catch (error) {
      console.error('Error fetching aggregation group details:', error);
      throw error;
    }
  }

  /**
   * Generate content with automatic fallback to alternative models
   * Handles 503 (Service Unavailable) and 429 (Rate Limit) errors
   */
  private async generateContentWithFallback(
    prompt: string,
    maxRetries: number = 3
  ): Promise<{ text?: string }> {
    let lastError: Error | null = null;
    
    // Try each model in the fallback chain
    for (let modelIndex = 0; modelIndex < this.MODELS.length; modelIndex++) {
      this.currentModelIndex = modelIndex;
      const currentModel = this.MODEL_NAME;
      
      // Retry current model up to maxRetries times
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🤖 Attempting API call with ${currentModel} (attempt ${attempt}/${maxRetries})`);
          
          const response = await this.ai.models.generateContent({
            model: currentModel,
            contents: prompt,
          });
          
          console.log(`✅ Success with ${currentModel}`);
          return response;
          
        } catch (error: any) {
          lastError = error;
          const errorCode = error?.error?.code || error?.status;
          const errorMessage = error?.error?.message || error?.message || 'Unknown error';
          
          console.warn(`⚠️ ${currentModel} failed (attempt ${attempt}/${maxRetries}):`, errorCode, errorMessage);
          
          // Handle specific error codes
          if (errorCode === 503 || errorCode === 'UNAVAILABLE') {
            // Service unavailable - wait and retry
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
            console.log(`⏳ Service unavailable, waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
            
          } else if (errorCode === 429 || errorCode === 'RESOURCE_EXHAUSTED') {
            // Rate limit exceeded - try next model immediately
            console.log(`🔄 Rate limit exceeded for ${currentModel}, trying next model...`);
            break; // Break retry loop, move to next model
            
          } else if (errorCode === 400 || errorCode === 'INVALID_ARGUMENT') {
            // Bad request - don't retry, throw immediately
            console.error(`❌ Invalid request for ${currentModel}:`, errorMessage);
            throw error;
            
          } else {
            // Unknown error - wait briefly and retry
            const waitTime = 1000 * attempt;
            console.log(`⏳ Unknown error, waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
      }
    }
    
    // All models and retries exhausted
    console.error('❌ All models failed after retries');
    throw new Error(
      `All Gemini models failed. Last error: ${lastError?.message || 'Unknown error'}. ` +
      `Please try again later or check your API quota at https://ai.google.dev/`
    );
  }
}

export const bernardService = new BernardService();
