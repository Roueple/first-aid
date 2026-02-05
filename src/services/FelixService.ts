import { GoogleGenAI } from "@google/genai";
import FelixSessionService from './FelixSessionService';
import FelixChatService from './FelixChatService';
import DatabaseService from './DatabaseService';
import departmentService from './DepartmentService';
import { findAllMatches } from '../utils/stringSimilarity';
import * as XLSX from 'xlsx';

export interface QueryFilter {
  field: string;
  operator: '==' | '!=' | '>' | '>=' | '<' | '<=' | 'array-contains' | 'in' | 'array-contains-any' | 'contains';
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
 * Felix AI Service - Query-focused assistant
 * Uses Gemini 3 Pro Preview for intent understanding
 * 
 * Flow:
 * 1. User input → Gemini for intent classification (table structure only, no data)
 * 2. Extract filters from natural language
 * 3. Generate SQL/Firestore queries
 * 4. Execution temporarily disabled
 */
export class FelixService {
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

TABLE: audit-results (main findings table)
FIELDS:
- auditResultId (string): Unique audit result ID
- year (string): Year as string (e.g., "2024", "2023")
- sh (string): SH identifier
- projectName (string): Project name
- projectId (string): Project ID (7-digit, links to projects table)
- department (string): Department name (e.g., "IT", "Audit Internal", "Finance")
- riskArea (string): Risk area description
- description (string): Finding description text
- code (string): Finding code - F (Finding), O (Observation), R (Recommendation), NF (Non-Finding)
- bobot (number): Weight value (1-10)
- kadar (number): Severity level (1-5)
- nilai (number): Score value (calculated)
- tags (array): Category tags for the finding - use "array-contains" operator

TABLE: projects (project master data)
FIELDS:
- projectId (string): Unique 7-digit project ID (e.g., "1234567")
- projectName (string): Full project name (e.g., "Hotel Raffles Jakarta")
- initials (string): 3-4 character project code (e.g., "HRJ", "CLPK", "CTSB")
- sh (string): Subholding code
- projectType (string): Project type category - Commercial, Residential, Healthcare, Education, Others
- subtype (string): Project subtype - Hospital, Hotel, Mall, Apartment, Landed House, School, University, Clinic, Office, Broker, Insurance, etc.
- finding (number): Count of findings (code=F)
- nonFinding (number): Count of non-findings (code=NF)
- total (number): Total audit results count

PROJECT TYPE & SUBTYPE MAPPING:
- Healthcare → Hospital, Clinic
- Commercial → Hotel, Mall, Office
- Residential → Landed House, Apartment
- Education → School, University
- Others → Broker, Insurance, Theatre, Golf Course, Palm Oil

IMPORTANT: When user mentions a subtype (e.g., "hospital", "hotel", "mall"), filter by subtype field.
When user mentions a type (e.g., "healthcare", "commercial", "residential"), filter by projectType field.

TABLE: departments (department normalization)
FIELDS:
- name (string): Normalized department name
- category (string): Department category (IT, Finance, HR, Marketing & Sales, etc.)
- originalNames (array): All variations of department names in audit-results
- keywords (array): Searchable keywords

COMMON TAGS (for audit-results.tags field):
- Fire safety: APAR, Hydrant, Heat detector
- Facilities: Kolam renang, Lift, Escalator, CCTV, Security
- Finance: Cash Opname, Time Deposit, Escrow KPR, Aging schedule
- Legal: PPJB, SPPJB, AJB, PBB, PBG, IMB, SHGB, PPATK
- Marketing: NPV, Komisi, Digital Marketing, Rumah Contoh, Show Unit
- Construction: Kualitas Bangunan, Volume Pekerjaan, Pekerjaan Tambah
- Estate: IPL, Tunggakan air, Serah Terima
- HR: Kontrak kerja, BPJS, Asuransi, Clearance sheet

IMPORTANT KEYWORD SEARCH RULES:
- For keyword searches (APAR, PPJB, IMB, etc.), ALWAYS use "description" field with "contains" operator
- The "tags" field is NOT reliable for all keywords - many findings have keywords in description but not in tags
- Example: {"field": "description", "operator": "contains", "value": "APAR"}
- Only use "tags" field if user explicitly says "tagged with" or "tag contains"
- For aggregation queries with keywords, use description field: "agregasi temuan APAR" → filter by description contains "APAR"

SUBHOLDING (SH) CODES:
- SH1, SH2, SH3A, SH3B, SH4 (always uppercase)
- Use "sh" field to filter by subholding
- Example: {"field": "sh", "operator": "==", "value": "SH1"}

PROJECT INITIALS EXAMPLES:
- HRJ = Hotel Raffles Jakarta
- CLPK = Citraland Pekanbaru
- CTSB = CitraGarden City Surabaya
- Use initials to quickly identify projects
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
    selectedProjectName: string,
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
  "targetTable": "audit-results|projects|departments",
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
      const targetTable = parsed.targetTable || 'audit-results';
      let filters: QueryFilter[] = parsed.filters || [];

      // Replace project name filter with confirmed name
      filters = filters.map(f => 
        f.field === 'projectName' 
          ? { ...f, value: selectedProjectName }
          : f
      );

      // Execute query with original user query for context (no custom sorting for confirmed queries)
      const results = await this.executeQuery(filters, targetTable, originalQuery);
      const { excelBuffer, excelFilename } = await this.generateExcel(results, targetTable, userIntent);

      // AUTO-GENERATE YEAR CHART for audit-results queries with multiple results
      let yearAggregation: AggregationResult[] | undefined;
      if (targetTable === 'audit-results' && results.length > 0) {
        console.log(`📊 Auto-generating year aggregation chart for ${results.length} findings`);
        yearAggregation = await this.aggregateResults(results, 'year', 'count', undefined, 'asc', filters);
        console.log(`📊 Generated ${yearAggregation.length} year groups for chart`);
      }

      const message = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 ${userIntent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ QUERY EXECUTED SUCCESSFULLY

Found ${results.length} result${results.length !== 1 ? 's' : ''}

${this.describeFilters(filters)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

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
      await FelixChatService.addAssistantResponse(
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
      await FelixSessionService.incrementMessageCount(sessionId);

      return { 
        response: queryResult.message, 
        sessionId,
        queryResult 
      };
    } catch (error) {
      console.error('Felix confirmed query error:', error);
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
      const activeSessionId = sessionId || await FelixSessionService.getOrCreateSession(userId);

      // Save user message
      await FelixChatService.addUserMessage(activeSessionId, userId, message);
      await FelixSessionService.incrementMessageCount(activeSessionId);

      // Check for demo command
      if (message.toLowerCase().trim() === 'demo') {
        const demoResponse = this.generateDemoResponse();
        await FelixChatService.addAssistantResponse(
          activeSessionId,
          userId,
          demoResponse,
          {
            responseTime: Date.now() - startTime,
            modelVersion: 'demo-mode',
            metadata: { isDemo: true }
          }
        );
        await FelixSessionService.incrementMessageCount(activeSessionId);

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
      
      await FelixChatService.addAssistantResponse(
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
      await FelixSessionService.incrementMessageCount(activeSessionId);

      // Auto-generate title from first message
      const session = await FelixSessionService.getById(activeSessionId);
      if (session && !session.title && session.messageCount === 2) {
        const title = this.generateTitle(message);
        await FelixSessionService.updateTitle(activeSessionId, title);
      }

      return { 
        response: queryResult.message, 
        sessionId: activeSessionId,
        queryResult 
      };
    } catch (error) {
      console.error('Felix chat error:', error);
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
      const activeSessionId = sessionId || await FelixSessionService.getOrCreateSession(userId);

      // Save user message
      await FelixChatService.addUserMessage(activeSessionId, userId, message);
      await FelixSessionService.incrementMessageCount(activeSessionId);

      // Check for demo command
      if (message.toLowerCase().trim() === 'demo') {
        const demoResponse = this.generateDemoResponse();
        
        // Stream the demo response word by word for typing effect
        const words = demoResponse.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk = (i === 0 ? '' : ' ') + words[i];
          yield chunk;
        }

        await FelixChatService.addAssistantResponse(
          activeSessionId,
          userId,
          demoResponse,
          {
            responseTime: Date.now() - startTime,
            modelVersion: 'demo-mode',
            metadata: { isDemo: true }
          }
        );
        await FelixSessionService.incrementMessageCount(activeSessionId);

        // Auto-generate title
        const session = await FelixSessionService.getById(activeSessionId);
        if (session && !session.title && session.messageCount === 2) {
          await FelixSessionService.updateTitle(activeSessionId, 'Felix Demo - Feature Showcase');
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
      
      await FelixChatService.addAssistantResponse(
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
      await FelixSessionService.incrementMessageCount(activeSessionId);

      // Auto-generate title
      const session = await FelixSessionService.getById(activeSessionId);
      if (session && !session.title && session.messageCount === 2) {
        const title = this.generateTitle(message);
        await FelixSessionService.updateTitle(activeSessionId, title);
      }

      return { sessionId: activeSessionId, queryResult };
    } catch (error) {
      console.error('Felix stream error:', error);
      throw new Error(`Failed to process query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate project name and suggest alternatives if needed
   * Returns null if exact match found, or suggestions array if alternatives available
   */
  private async validateProjectName(projectName: string): Promise<ProjectSuggestion[] | null> {
    const allProjectNames = await this.getAllProjectNames();
    
    // Check for exact match (case-insensitive)
    const exactMatch = allProjectNames.find(
      name => name.toLowerCase() === projectName.toLowerCase()
    );
    
    if (exactMatch) {
      return null; // Exact match found, no confirmation needed
    }
    
    // Find similar matches
    const matches = findAllMatches(projectName, allProjectNames, 0.6, 5);
    
    if (matches.length === 0) {
      return []; // No matches found
    }
    
    // Return suggestions
    return matches.map(m => ({
      name: m.value,
      score: m.score
    }));
  }

  /**
   * Core query processing - uses Gemini to understand intent, extract filters, and execute query
   */
  private async processQuery(query: string, sessionId?: string): Promise<QueryResult> {
    try {
      // Get conversation history for context
      let conversationContext = '';
      if (sessionId) {
        try {
          const history = await FelixChatService.getSessionChats(sessionId, 6);
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
${conversationContext}

USER QUERY: "${query}"

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
  "targetTable": "audit-results|projects|departments",
  "filters": [
    {"field": "fieldName", "operator": "==|!=|>|>=|<|<=|array-contains", "value": "value"}
  ],
  "sortBy": "field name (optional, e.g., nilai, year, projectName)",
  "sortOrder": "asc|desc (optional, default: desc for nilai, asc for others)",
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
  * Can aggregate by projectType or subtype even though they're in projects table
  * "by projectType and year" → {"groupBy": ["projectType", "year"], "aggregationType": "count"}
  * "by subtype" → {"groupBy": "subtype", "aggregationType": "count"}
  * "Promosi findings by projectType and year" → {"groupBy": ["projectType", "year"], "aggregationType": "count", "filters": [{"field": "description", "operator": "contains", "value": "Promosi"}, {"field": "code", "operator": "==", "value": "F"}]}
  * System will automatically join with projects table to get type/subtype data
- Common aggregation queries:
  * "count findings by department" → {"groupBy": "department", "aggregationType": "count"}
  * "sum nilai by project" → {"groupBy": "projectName", "aggregationType": "sum", "aggregateField": "nilai"}
  * "average score by year" → {"groupBy": "year", "aggregationType": "avg", "aggregateField": "nilai"}
  * "highest findings count by department 2024" → {"groupBy": "department", "aggregationType": "count", "filters": [{"field": "year", "operator": "==", "value": "2024"}], "sortOrder": "desc"}
  * "PPJB findings by SH and year" → {"groupBy": ["sh", "year"], "aggregationType": "count", "filters": [{"field": "description", "operator": "contains", "value": "PPJB"}, {"field": "code", "operator": "==", "value": "F"}]}
  * "findings by project and department" → {"groupBy": ["projectName", "department"], "aggregationType": "count"}
  * "findings by projectType" → {"groupBy": "projectType", "aggregationType": "count"}
  * "hospital findings by year" → {"groupBy": "year", "aggregationType": "count", "filters": [{"field": "subtype", "operator": "==", "value": "Hospital"}]}
- Keywords indicating aggregation: "group by", "count by", "summarize", "breakdown", "pivot", "per department", "by project", "berdasarkan", "per", "jumlah temuan per", "agregasi"
- Keywords indicating multi-dimensional: "by X and Y", "by X and by Y", "per X dan Y", "berdasarkan X dan Y"
- When aggregating, return groupBy (string or array), aggregationType, and optional aggregateField (for sum/avg/min/max)

SORTING RULES:
- If user says "highest score", "descending", "terbesar", "tertinggi", "dari nilai tertinggi" → sortBy="nilai", sortOrder="desc"
- If user says "lowest score", "ascending", "terkecil", "terendah", "dari nilai terendah" → sortBy="nilai", sortOrder="asc"
- For aggregated results: "highest count" → sortOrder="desc", "lowest count" → sortOrder="asc"
- If no sorting specified, omit sortBy and sortOrder fields
- Default sorting is handled by the system (year desc for audit-results, projectName asc for projects)

OR LOGIC RULES (CRITICAL):
- Use "in" operator for OR logic on the SAME field with multiple values
- Examples: 
  * "IT or Finance" → {"field": "department", "operator": "in", "value": ["IT", "Finance"]}
  * "SH1 or SH2 or SH3A" → {"field": "sh", "operator": "in", "value": ["SH1", "SH2", "SH3A"]}
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
- "in" for OR logic with multiple values (department in ["IT", "Finance"], projectName in ["Project A", "Project B"])
- ">=" for "above", "more than", "at least", "minimum"
- "<=" for "below", "less than", "at most", "maximum"
- ">" for "greater than"
- "<" for "less than"
- "!=" for "not equal", "except", "exclude"
- "array-contains" for single tag match (ONLY if user explicitly says "tagged with" or "tag contains")
- "array-contains-any" for multiple tag matches (ONLY if user explicitly says "tagged with" or "tag contains")
- "contains" for text search in description field (DEFAULT for keyword searches: APAR, PPJB, IMB, SHM, Kolam renang, Hydrant, etc.)

CRITICAL: For keyword searches, ALWAYS use description field with "contains" operator unless user explicitly mentions "tags"

FIELD TYPE RULES:
- year: ALWAYS string (e.g., "2024", "2023", "2022") - NEVER use number
- bobot, kadar, nilai, finding, nonFinding, total: number
- tags, originalNames, keywords: use "array-contains" operator
- All other fields: string

TARGET TABLE RULES:
- "audit-results": for findings, temuan, audit results queries
- "projects": for project list, project info, initials, finding counts per project
- "departments": for department list, categories, department info

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
{"userIntent": "Tampilkan semua temuan IT tahun 2024", "targetTable": "audit-results", "filters": [{"field": "department", "operator": "==", "value": "IT"}, {"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan IT atau Finance 2024" or "findings from IT or Finance 2024"
{"userIntent": "Temuan dari IT atau Finance tahun 2024", "targetTable": "audit-results", "filters": [{"field": "department", "operator": "in", "value": ["IT", "Finance"]}, {"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan dari Tallasa atau Raffles" or "findings from Tallasa or Raffles"
{"userIntent": "Temuan dari CitraLand Tallasa atau Hotel Raffles", "targetTable": "audit-results", "filters": [{"field": "projectName", "operator": "in", "value": ["CitraLand Tallasa City Makassar", "Hotel Raffles Jakarta"]}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan SH1 atau SH2" or "findings from SH1 or SH2"
{"userIntent": "Temuan dari SH1 atau SH2", "targetTable": "audit-results", "filters": [{"field": "sh", "operator": "in", "value": ["SH1", "SH2"]}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan APAR atau Hydrant" or "findings about APAR or Hydrant"
{"userIntent": "Temuan terkait APAR atau Hydrant", "targetTable": "audit-results", "filters": [{"field": "description", "operator": "contains", "value": "APAR"}, {"field": "description", "operator": "contains", "value": "Hydrant"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan Tallasa Makassar" or "semua temuan Tallasa Makassar"
{"userIntent": "Semua temuan CitraLand Tallasa City Makassar", "targetTable": "audit-results", "filters": [{"field": "projectName", "operator": "==", "value": "CitraLand Tallasa City Makassar"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan dari 3 proyek: Tallasa, Raffles, dan Ciputra Mall" or "findings from Tallasa, Raffles, and Ciputra Mall"
{"userIntent": "Temuan dari 3 proyek", "targetTable": "audit-results", "filters": [{"field": "projectName", "operator": "in", "value": ["CitraLand Tallasa City Makassar", "Hotel Raffles Jakarta", "Mall Ciputra Cibubur"]}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "dep = IT, year 2024, code = F"
{"userIntent": "Temuan IT tahun 2024 dengan kode F", "targetTable": "audit-results", "filters": [{"field": "department", "operator": "==", "value": "IT"}, {"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "findings with nilai >= 10"
{"userIntent": "Temuan dengan nilai di atas atau sama dengan 10", "targetTable": "audit-results", "filters": [{"field": "nilai", "operator": ">=", "value": 10}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan APAR"
{"userIntent": "Semua temuan terkait APAR", "targetTable": "audit-results", "filters": [{"field": "description", "operator": "contains", "value": "APAR"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan kolam renang 2024"
{"userIntent": "Temuan kolam renang tahun 2024", "targetTable": "audit-results", "filters": [{"field": "description", "operator": "contains", "value": "kolam renang"}, {"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan kolam renang atau lift" or "findings about swimming pool or elevator"
{"userIntent": "Temuan terkait kolam renang atau lift", "targetTable": "audit-results", "filters": [{"field": "description", "operator": "contains", "value": "kolam renang"}, {"field": "description", "operator": "contains", "value": "lift"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "show all PPJB findings" or "temuan yang mengandung PPJB"
{"userIntent": "Semua temuan yang mengandung kata PPJB di deskripsi", "targetTable": "audit-results", "filters": [{"field": "description", "operator": "contains", "value": "PPJB"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "findings with IMB in description" or "temuan dengan IMB"
{"userIntent": "Temuan dengan kata IMB di deskripsi", "targetTable": "audit-results", "filters": [{"field": "description", "operator": "contains", "value": "IMB"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "all IT audit results 2024" or "semua hasil audit IT 2024" or "all codes IT 2024"
{"userIntent": "Semua hasil audit IT tahun 2024 (termasuk F, NF, O, R)", "targetTable": "audit-results", "filters": [{"field": "department", "operator": "==", "value": "IT"}, {"field": "year", "operator": "==", "value": "2024"}], "isValidQuery": true}

Query: "semua hasil audit Tallasa Makassar" or "all audit results Tallasa"
{"userIntent": "Semua hasil audit CitraLand Tallasa City Makassar (termasuk F, NF, O, R)", "targetTable": "audit-results", "filters": [{"field": "projectName", "operator": "==", "value": "CitraLand Tallasa City Makassar"}], "isValidQuery": true}

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

PROJECT TYPE & SUBTYPE EXAMPLES:
Query: "show all findings from hospital" or "temuan dari hospital" or "temuan hospital"
{"userIntent": "Semua temuan dari proyek hospital", "targetTable": "audit-results", "filters": [{"field": "subtype", "operator": "==", "value": "Hospital"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "findings from healthcare projects" or "temuan healthcare" or "temuan proyek healthcare"
{"userIntent": "Semua temuan dari proyek healthcare", "targetTable": "audit-results", "filters": [{"field": "projectType", "operator": "==", "value": "Healthcare"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "show all findings from hospital, descending from highest score" or "temuan hospital dari nilai tertinggi"
{"userIntent": "Semua temuan dari proyek hospital, diurutkan dari nilai tertinggi", "targetTable": "audit-results", "filters": [{"field": "subtype", "operator": "==", "value": "Hospital"}, {"field": "code", "operator": "==", "value": "F"}], "sortBy": "nilai", "sortOrder": "desc", "isValidQuery": true}

Query: "temuan hotel 2024" or "findings from hotels 2024"
{"userIntent": "Temuan dari proyek hotel tahun 2024", "targetTable": "audit-results", "filters": [{"field": "subtype", "operator": "==", "value": "Hotel"}, {"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan mall" or "findings from malls"
{"userIntent": "Temuan dari proyek mall", "targetTable": "audit-results", "filters": [{"field": "subtype", "operator": "==", "value": "Mall"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan commercial projects" or "temuan proyek komersial"
{"userIntent": "Temuan dari proyek commercial", "targetTable": "audit-results", "filters": [{"field": "projectType", "operator": "==", "value": "Commercial"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan dari commercial atau residential" or "findings from commercial or residential projects"
{"userIntent": "Temuan dari proyek commercial atau residential", "targetTable": "audit-results", "filters": [{"field": "projectType", "operator": "in", "value": ["Commercial", "Residential"]}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan residential" or "findings from residential projects"
{"userIntent": "Temuan dari proyek residential", "targetTable": "audit-results", "filters": [{"field": "projectType", "operator": "==", "value": "Residential"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan apartment" or "findings from apartments"
{"userIntent": "Temuan dari proyek apartment", "targetTable": "audit-results", "filters": [{"field": "subtype", "operator": "==", "value": "Apartment"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan dari hospital, clinic, atau hotel" or "findings from hospitals, clinics, or hotels"
{"userIntent": "Temuan dari hospital, clinic, atau hotel", "targetTable": "audit-results", "filters": [{"field": "subtype", "operator": "in", "value": ["Hospital", "Clinic", "Hotel"]}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan school dan university" or "findings from schools and universities"
{"userIntent": "Temuan dari proyek school dan university", "targetTable": "audit-results", "filters": [{"field": "projectType", "operator": "==", "value": "Education"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

CONTEXT-AWARE EXAMPLES (with conversation history):
Previous: "semua temuan HC 2024" (filters: department="HC", year="2024", code="F")
Current: "khusus mall ciputra cibubur" or "show only mall ciputra cibubur"
{"userIntent": "Temuan HC tahun 2024 khusus Mall Ciputra Cibubur", "targetTable": "audit-results", "filters": [{"field": "department", "operator": "==", "value": "HC"}, {"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}, {"field": "projectName", "operator": "==", "value": "Mall Ciputra Cibubur"}], "isValidQuery": true}

Previous: "semua temuan HR 2024" (filters: department="HR", year="2024", code="F")
Current: "khusus SH1" or "only SH1" or "SH1 saja"
{"userIntent": "Temuan HR tahun 2024 khusus SH1", "targetTable": "audit-results", "filters": [{"field": "department", "operator": "==", "value": "HR"}, {"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}, {"field": "sh", "operator": "==", "value": "SH1"}], "isValidQuery": true}

Previous: "semua temuan HR 2024" (filters: department="HR", year="2024", code="F")
Current: "SH2 coba" or "coba SH2" or "filter SH2"
{"userIntent": "Temuan HR tahun 2024 khusus SH2", "targetTable": "audit-results", "filters": [{"field": "department", "operator": "==", "value": "HR"}, {"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}, {"field": "sh", "operator": "==", "value": "SH2"}], "isValidQuery": true}

Previous: "semua temuan Tallasa Makassar" (filters: projectName="CitraLand Tallasa City Makassar")
Current: "hanya temuan" or "findings only"
{"userIntent": "Hanya temuan (code F) untuk CitraLand Tallasa City Makassar", "targetTable": "audit-results", "filters": [{"field": "projectName", "operator": "==", "value": "CitraLand Tallasa City Makassar"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Previous: "IT findings 2024" (filters: department="IT", year="2024", code="F")
Current: "show all results" or "semua hasil"
{"userIntent": "Semua hasil audit IT tahun 2024 (termasuk NF)", "targetTable": "audit-results", "filters": [{"field": "department", "operator": "==", "value": "IT"}, {"field": "year", "operator": "==", "value": "2024"}], "isValidQuery": true}

Previous: "proyek Raffles" (filters: projectName="Hotel Raffles Jakarta")
Current: "temuan 2024"
{"userIntent": "Temuan Hotel Raffles Jakarta tahun 2024", "targetTable": "audit-results", "filters": [{"field": "projectName", "operator": "==", "value": "Hotel Raffles Jakarta"}, {"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

AGGREGATION EXAMPLES:
Query: "count findings by department 2024" or "jumlah temuan per department 2024"
{"userIntent": "Jumlah temuan per department tahun 2024", "targetTable": "audit-results", "filters": [{"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}], "groupBy": "department", "aggregationType": "count", "sortOrder": "desc", "isValidQuery": true}

Query: "show me highest findings count by department 2024" or "department dengan temuan terbanyak 2024"
{"userIntent": "Department dengan jumlah temuan terbanyak tahun 2024", "targetTable": "audit-results", "filters": [{"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}], "groupBy": "department", "aggregationType": "count", "sortOrder": "desc", "isValidQuery": true}

Query: "group findings by project" or "kelompokkan temuan berdasarkan proyek"
{"userIntent": "Kelompokkan temuan berdasarkan proyek", "targetTable": "audit-results", "filters": [{"field": "code", "operator": "==", "value": "F"}], "groupBy": "projectName", "aggregationType": "count", "sortOrder": "desc", "isValidQuery": true}

Query: "sum nilai by department" or "total nilai per department"
{"userIntent": "Total nilai per department", "targetTable": "audit-results", "filters": [], "groupBy": "department", "aggregationType": "sum", "aggregateField": "nilai", "sortOrder": "desc", "isValidQuery": true}

Query: "average score by year" or "rata-rata nilai per tahun"
{"userIntent": "Rata-rata nilai per tahun", "targetTable": "audit-results", "filters": [], "groupBy": "year", "aggregationType": "avg", "aggregateField": "nilai", "sortOrder": "desc", "isValidQuery": true}

Query: "breakdown findings by SH" or "breakdown temuan per SH"
{"userIntent": "Breakdown temuan per SH", "targetTable": "audit-results", "filters": [{"field": "code", "operator": "==", "value": "F"}], "groupBy": "sh", "aggregationType": "count", "sortOrder": "desc", "isValidQuery": true}

Query: "agregasi temuan APAR berdasarkan SH dan tahun" or "APAR findings by SH and year"
{"userIntent": "Agregasi temuan APAR berdasarkan SH dan tahun", "targetTable": "audit-results", "filters": [{"field": "description", "operator": "contains", "value": "APAR"}, {"field": "code", "operator": "==", "value": "F"}], "groupBy": ["sh", "year"], "aggregationType": "count", "sortOrder": "desc", "isValidQuery": true}

Query: "from all projects, all PPJB findings sorted for the most show me" or "dari semua proyek, temuan PPJB terbanyak per proyek"
{"userIntent": "Temuan PPJB terbanyak per proyek", "targetTable": "audit-results", "filters": [{"field": "description", "operator": "contains", "value": "PPJB"}, {"field": "code", "operator": "==", "value": "F"}], "groupBy": "projectName", "aggregationType": "count", "sortOrder": "desc", "isValidQuery": true}

Query: "show me projects with most IMB findings" or "proyek dengan temuan IMB terbanyak"
{"userIntent": "Proyek dengan temuan IMB terbanyak", "targetTable": "audit-results", "filters": [{"field": "description", "operator": "contains", "value": "IMB"}, {"field": "code", "operator": "==", "value": "F"}], "groupBy": "projectName", "aggregationType": "count", "sortOrder": "desc", "isValidQuery": true}

Query: "hello how are you"
{"userIntent": "Bukan query database", "targetTable": "audit-results", "filters": [], "isValidQuery": false, "invalidReason": "Ini bukan query database. Silakan tanyakan tentang audit findings, projects, atau departments."}

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
      const targetTable = parsed.targetTable || 'audit-results';
      let filters: QueryFilter[] = parsed.filters || [];
      const sortBy = parsed.sortBy;
      const sortOrder = parsed.sortOrder || 'desc';
      
      // Check for aggregation
      const groupBy = parsed.groupBy;
      const aggregationType = parsed.aggregationType || 'count';
      const aggregateField = parsed.aggregateField;

      // VALIDATION: Check project name before executing
      const projectNameFilter = filters.find(f => f.field === 'projectName');
      if (projectNameFilter && typeof projectNameFilter.value === 'string') {
        const suggestions = await this.validateProjectName(projectNameFilter.value);
        if (suggestions !== null) {
          // Project name needs confirmation
          if (suggestions.length === 0) {
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
            suggestions,
            originalQuery: query,
          };
        }
      }

      // Execute query with original user query for context
      let results = await this.executeQuery(filters, targetTable, query, sortBy, sortOrder);
      
      // Handle aggregation if requested
      if (groupBy) {
        const aggregatedResults = await this.aggregateResults(results, groupBy, aggregationType, aggregateField, sortOrder, filters);
        // Generate Excel with ALL detailed findings (not just aggregation summary)
        const { excelBuffer, excelFilename } = await this.generateExcel(results, targetTable, userIntent);
        
        const groupByDisplay = Array.isArray(groupBy) ? groupBy.join(' + ') : groupBy;
        const isMultiDimensional = Array.isArray(groupBy);
        
        const message = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 ${userIntent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ ${isMultiDimensional ? 'MULTI-DIMENSIONAL ' : ''}AGGREGATION COMPLETED

Grouped by: ${groupByDisplay}
Aggregation: ${aggregationType}${aggregateField ? ` (${aggregateField})` : ''}
Groups found: ${aggregatedResults.length}
Total findings: ${results.length}

${this.describeFilters(filters)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

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

      // AUTO-GENERATE YEAR CHART for audit-results queries with multiple results
      let yearAggregation: AggregationResult[] | undefined;
      if (targetTable === 'audit-results' && results.length > 0) {
        console.log(`📊 Auto-generating year aggregation chart for ${results.length} findings`);
        yearAggregation = await this.aggregateResults(results, 'year', 'count', undefined, 'asc', filters);
        console.log(`📊 Generated ${yearAggregation.length} year groups for chart`);
      }

      // Format response
      const message = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 ${userIntent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ QUERY EXECUTED SUCCESSFULLY

Found ${results.length} result${results.length !== 1 ? 's' : ''}

${this.describeFilters(filters)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

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
   */
  private async executeQuery(
    filters: QueryFilter[], 
    table: string, 
    userQuery?: string,
    sortBy?: string,
    sortOrder?: string
  ): Promise<any[]> {
    try {
      const db = new DatabaseService(table);
      
      console.log('🔍 Felix executeQuery - Input filters:', JSON.stringify(filters, null, 2));
      
      // Separate equality filters from range filters and contains filters
      const rangeOperators = ['>', '>=', '<', '<=', '!='];
      const equalityFilters: QueryFilter[] = [];
      const rangeFilters: QueryFilter[] = [];
      const containsFilters: QueryFilter[] = [];
      
      filters.forEach(f => {
        if (f.operator === 'contains') {
          containsFilters.push(f);
        } else if (rangeOperators.includes(f.operator)) {
          rangeFilters.push(f);
        } else {
          equalityFilters.push(f);
        }
      });
      
      console.log('🔍 Equality filters (Firestore):', JSON.stringify(equalityFilters, null, 2));
      console.log('🔍 Range filters (in-memory):', JSON.stringify(rangeFilters, null, 2));
      console.log('🔍 Contains filters (in-memory):', JSON.stringify(containsFilters, null, 2));
      
      // Handle filter transformations for audit-results
      let expandedFilters = equalityFilters;
      let projectTypeFilter: QueryFilter | undefined;
      let subtypeFilter: QueryFilter | undefined;
      
      if (table === 'audit-results') {
        // Convert year from string to number (Firestore stores year as number)
        expandedFilters = expandedFilters.map(f => {
          if (f.field === 'year') {
            // Handle single string value
            if (typeof f.value === 'string') {
              const yearNum = parseInt(f.value, 10);
              console.log(`📅 Converting year from "${f.value}" (string) to ${yearNum} (number)`);
              return { ...f, value: yearNum };
            }
            // Handle array of string values (for 'in' operator)
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

        // Extract projectType and subtype filters (need to join with projects table)
        projectTypeFilter = expandedFilters.find(f => f.field === 'projectType');
        subtypeFilter = expandedFilters.find(f => f.field === 'subtype');
        
        // Remove projectType and subtype from audit-results filters (they don't exist in that table)
        expandedFilters = expandedFilters.filter(f => f.field !== 'projectType' && f.field !== 'subtype');

        // Expand department using AI-powered matching
        const deptFilter = expandedFilters.find(f => f.field === 'department');
        if (deptFilter) {
          const otherFilters = expandedFilters.filter(f => f.field !== 'department');
          
          // If already using 'in' operator, expand each department value
          if (deptFilter.operator === 'in' && Array.isArray(deptFilter.value)) {
            console.log(`📂 Expanding multiple departments: ${deptFilter.value.join(', ')}`);
            const allDeptNames: string[] = [];
            
            for (const dept of deptFilter.value) {
              const queryContext = userQuery || String(dept);
              const deptNames = await this.getDepartmentNames(queryContext);
              allDeptNames.push(...deptNames);
            }
            
            // Remove duplicates and limit to 30 (Firestore 'in' limit)
            const uniqueDeptNames = [...new Set(allDeptNames)].slice(0, 30);
            console.log(`📂 Expanded to ${uniqueDeptNames.length} unique department names`);
            
            if (uniqueDeptNames.length === 1) {
              expandedFilters = [...otherFilters, { field: 'department', operator: '==', value: uniqueDeptNames[0] }];
            } else if (uniqueDeptNames.length > 1) {
              expandedFilters = [...otherFilters, { field: 'department', operator: 'in' as any, value: uniqueDeptNames }];
            } else {
              expandedFilters = otherFilters.concat(deptFilter);
            }
          } else {
            // Single department value - expand as before
            const queryContext = userQuery || String(deptFilter.value);
            const deptNames = await this.getDepartmentNames(queryContext);
            console.log(`📂 Department "${deptFilter.value}" expanded to ${deptNames.length} names:`, deptNames);
            
            if (deptNames.length === 1) {
              expandedFilters = [...otherFilters, { field: 'department', operator: '==', value: deptNames[0] }];
            } else if (deptNames.length > 1) {
              // Firestore 'in' operator supports up to 30 values
              expandedFilters = [...otherFilters, { field: 'department', operator: 'in' as any, value: deptNames.slice(0, 30) }];
            } else {
              expandedFilters = otherFilters.concat({ field: 'department', operator: '==', value: deptFilter.value });
            }
          }
        }
      }
      
      console.log('🔍 Felix executeQuery - Expanded equality filters:', JSON.stringify(expandedFilters, null, 2));
      
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
      const orderBy = table === 'projects' ? 'projectName' : 
                      table === 'departments' ? 'name' : 'year';
      const orderDir = table === 'audit-results' ? 'desc' : 'asc';

      // Fetch with equality filters only (avoids composite index issues)
      // Use higher limit to accommodate large result sets (e.g., all code F findings = 4000+)
      let results = await db.getAll({
        filters: dbFilters,
        sorts: [{ field: orderBy, direction: orderDir }],
        limit: rangeFilters.length > 0 || containsFilters.length > 0 ? 10000 : 5000 // Increased limits for large datasets
      });
      
      // Apply projectType/subtype filters if present (requires joining with projects table)
      if (table === 'audit-results' && (projectTypeFilter || subtypeFilter)) {
        console.log(`🏢 Filtering by project type/subtype - fetching projects data`);
        
        // Fetch all projects to get type/subtype mapping
        const projectsDb = new DatabaseService('projects');
        const allProjects = await projectsDb.getAll({ limit: 500 });
        
        // Create projectId -> project mapping
        const projectMap = new Map();
        allProjects.forEach((p: any) => {
          projectMap.set(p.projectId, p);
        });
        
        console.log(`📋 Loaded ${projectMap.size} projects for type/subtype filtering`);
        
        // Filter results based on projectType/subtype
        const beforeCount = results.length;
        results = results.filter(item => {
          const project = projectMap.get(item.projectId);
          if (!project) return false;
          
          // Check projectType filter
          if (projectTypeFilter) {
            const projectTypeMatch = this.matchesFilter(project.projectType, projectTypeFilter);
            if (!projectTypeMatch) return false;
          }
          
          // Check subtype filter
          if (subtypeFilter) {
            const subtypeMatch = this.matchesFilter(project.subtype, subtypeFilter);
            if (!subtypeMatch) return false;
          }
          
          return true;
        });
        
        console.log(`🏢 After type/subtype filtering: ${beforeCount} → ${results.length} results`);
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

      // Apply contains filters in-memory (case-insensitive text search)
      if (containsFilters.length > 0) {
        console.log(`🔍 Applying ${containsFilters.length} contains filter(s) in-memory on ${results.length} results`);
        
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

      if (table === 'audit-results') {
        sheetName = 'Audit Results';
        excelData = results.map(r => ({
          'Year': r.year || '',
          'SH': r.sh || '',
          'Project Name': r.projectName || '',
          'Project ID': r.projectId || '',
          'Department': r.department || '',
          'Risk Area': r.riskArea || '',
          'Description': r.description || '',
          'Code': r.code || '',
          'Bobot': r.bobot || 0,
          'Kadar': r.kadar || 0,
          'Nilai': r.nilai || 0,
          'Tags': Array.isArray(r.tags) ? r.tags.join(', ') : '',
        }));
      } else if (table === 'projects') {
        sheetName = 'Projects';
        excelData = results.map(r => ({
          'Project ID': r.projectId || '',
          'Project Name': r.projectName || '',
          'Initials': r.initials || '',
          'SH': r.sh || '',
          'Findings': r.finding || 0,
          'Non-Findings': r.nonFinding || 0,
          'Total': r.total || 0,
        }));
      } else if (table === 'departments') {
        sheetName = 'Departments';
        excelData = results.map(r => ({
          'Name': r.name || '',
          'Category': r.category || '',
          'Original Names': Array.isArray(r.originalNames) ? r.originalNames.join(', ') : '',
          'Keywords': Array.isArray(r.keywords) ? r.keywords.join(', ') : '',
        }));
      }

      // Create workbook
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Set column widths
      if (table === 'audit-results') {
        worksheet['!cols'] = [
          { wch: 10 }, { wch: 15 }, { wch: 40 }, { wch: 15 },
          { wch: 25 }, { wch: 25 }, { wch: 60 }, { wch: 10 },
          { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 30 }
        ];
      } else if (table === 'projects') {
        worksheet['!cols'] = [
          { wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 15 },
          { wch: 12 }, { wch: 15 }, { wch: 12 }
        ];
      } else {
        worksheet['!cols'] = [
          { wch: 30 }, { wch: 20 }, { wch: 50 }, { wch: 50 }
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
      const excelFilename = `felix-${sanitizedIntent}-${timestamp}.xlsx`;

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
      projectId: '🔢',
      initials: '🔤',
      code: '🏷️',
      nilai: '📊',
      bobot: '⚖️',
      kadar: '🔥',
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

    return filters.map(f => {
      const icon = icons[f.field] || '•';
      
      // Format value display for arrays
      let displayValue: string;
      if (Array.isArray(f.value)) {
        if (f.value.length <= 3) {
          displayValue = f.value.join(' OR ');
        } else {
          displayValue = `${f.value.slice(0, 3).join(', ')} + ${f.value.length - 3} more`;
        }
      } else {
        displayValue = String(f.value);
      }
      
      // Simplify operator display
      const operatorDisplay = f.operator === 'in' ? 'IN' : 
                             f.operator === 'array-contains-any' ? 'CONTAINS ANY' :
                             f.operator === 'contains' ? 'CONTAINS' :
                             f.operator;
      
      return `${icon} ${f.field} ${operatorDisplay} ${displayValue}`;
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
  private async getDepartmentNames(userQuery: string): Promise<string[]> {
    try {
      // Available categories from DepartmentService
      const CATEGORIES = [
        'IT',
        'Finance',
        'HR',
        'Marketing & Sales',
        'Property Management',
        'Engineering & Construction',
        'Legal & Compliance',
        'Audit & Risk',
        'Planning & Development',
        'Healthcare',
        'Insurance & Actuarial',
        'CSR & Community',
        'Security',
        'Corporate',
        'Supply Chain & Procurement',
        'Academic & Administration',
        'Operations',
        'Hospitality & F&B',
        'Outsourcing & Third Party',
        'Other'
      ];

      console.log(`🤖 Matching user query to department categories`);

      // Ask Gemini to match user intent to categories
      const prompt = `You are a department category matcher for an Indonesian audit system.

USER QUERY: "${userQuery}"

AVAILABLE CATEGORIES:
${CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n')}

CATEGORY DESCRIPTIONS:
- IT: Information Technology, ICT, Teknologi Informasi
- Finance: Keuangan, Accounting, FAD, Treasury, Investment
- HR: Human Capital, HRD, HCM, SDM, Sumber Daya Manusia, People Management
- Marketing & Sales: Marketing, Sales, HBD, Promotion, Commercial
- Property Management: Estate, Building Management, Tenant, Leasing
- Engineering & Construction: Teknik, Konstruksi, QS, Maintenance
- Legal & Compliance: Hukum, Legal, Regulatory
- Audit & Risk: Audit Internal, Risk Management, APU, PPT
- Planning & Development: Perencanaan, FSD, FDD
- Healthcare: Medis, Medical, Health, Kesehatan, Nursing
- Insurance & Actuarial: Actuarial, Underwriting, Asuransi
- CSR & Community: Corporate Social Responsibility, Community, Education
- Security: Keamanan, Security
- Corporate: Executive, Board, Direksi
- Supply Chain & Procurement: Procurement, Purchasing, Logistics, Warehouse
- Academic & Administration: Akademik, Student Affairs, Alumni
- Operations: Operasi, General Affairs, Housekeeping, Customer Service
- Hospitality & F&B: Food & Beverage, Restaurant, Hotel, Golf, Club
- Outsourcing & Third Party: Vendor, Pihak Ketiga
- Other: Miscellaneous departments

Analyze the user's query and determine which category(ies) match their intent.

MATCHING RULES:
- Match based on keywords, abbreviations, and Indonesian terms
- "HC" or "Human Capital" → HR
- "IT" → IT
- "Finance" or "Keuangan" → Finance
- Be flexible with variations
- Return empty array if no clear match

Return a JSON object:
{
  "matchedCategories": ["Category 1", "Category 2", ...],
  "reasoning": "brief explanation"
}

EXAMPLES:
Query: "HC" → {"matchedCategories": ["HR"], "reasoning": "HC is Human Capital"}
Query: "IT" → {"matchedCategories": ["IT"], "reasoning": "IT department"}
Query: "Finance" → {"matchedCategories": ["Finance"], "reasoning": "Finance department"}
Query: "Marketing" → {"matchedCategories": ["Marketing & Sales"], "reasoning": "Marketing department"}

Return ONLY the JSON object.`;

      const response = await this.generateContentWithFallback(prompt);
      const responseText = response.text?.trim() || '{}';
      let jsonText = responseText;
      if (responseText.includes('```')) {
        const match = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (match) jsonText = match[1];
      }

      const parsed = JSON.parse(jsonText);
      const matchedCategories = parsed.matchedCategories || [];

      console.log(`🎯 Gemini matched categories:`, matchedCategories);
      console.log(`💡 Reasoning: ${parsed.reasoning}`);

      if (matchedCategories.length === 0) {
        console.warn('⚠️ No categories matched, falling back to original query');
        return [userQuery];
      }

      // Fetch departments by matched categories
      const allMatchedNames: string[] = [];
      for (const category of matchedCategories) {
        const depts = await departmentService.getByCategory(category);
        depts.forEach(dept => {
          if (dept.originalNames) {
            allMatchedNames.push(...dept.originalNames);
          }
        });
      }

      // Remove duplicates
      const uniqueNames = [...new Set(allMatchedNames)];
      console.log(`📋 Final department names for filtering (${uniqueNames.length}):`, uniqueNames);

      return uniqueNames.length > 0 ? uniqueNames : [userQuery];
    } catch (error) {
      console.error('❌ Error in AI-powered category matching:', error);
      return [userQuery]; // Fallback to original query
    }
  }

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
║              🎯 FELIX AI ASSISTANT - INTERACTIVE DEMO             ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

Welcome to Felix! Let me show you what I can do. 🚀

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 FEATURE 1: NATURAL LANGUAGE QUERIES

I understand questions in plain English or Indonesian!

Try these examples:
┌─────────────────────────────────────────────────────────────────┐
│ 🔹 "show all IT findings 2024"                                  │
│ 🔹 "temuan HC tahun 2024"                                       │
│ 🔹 "findings from hospitals"                                    │
│ 🔹 "temuan dengan nilai >= 10"                                  │
└─────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 FEATURE 2: SMART FILTER EXTRACTION

I automatically extract filters from your questions:

Example: "show IT findings 2024 with nilai >= 10"
┌─────────────────────────────────────────────────────────────────┐
│ ✅ Extracted Filters:                                           │
│    📂 department = IT                                           │
│    📅 year = 2024                                               │
│    📊 nilai >= 10                                               │
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
│ 🤖 Felix: [Shows HC findings from 2024]                        │
│                                                                 │
│ 👤 You: "khusus mall ciputra cibubur"                          │
│ 🤖 Felix: [Keeps HC + 2024 filters, adds Mall filter]          │
│                                                                 │
│ 👤 You: "hanya yang nilai >= 15"                               │
│ 🤖 Felix: [Keeps all previous filters, adds nilai >= 15]       │
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
│ • "temuan IT 2024 dari nilai tertinggi"                        │
│ • "projects sorted by finding count descending"                 │
└─────────────────────────────────────────────────────────────────┘

Supported sort fields:
📊 nilai • ⚖️ bobot • 🔥 kadar • 📅 year • 🏢 projectName

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

Example: felix-temuan-it-2024-2026-01-30.xlsx

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
┃    "temuan HC 2024 dengan nilai >= 10"                        ┃
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
Felix AI Assistant v1.0 | FIRST-AID Audit System

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
    return await FelixChatService.getSessionChats(sessionId);
  }

  async getUserSessions(userId: string, limit?: number) {
    return await FelixSessionService.getUserSessions(userId, limit);
  }

  async createNewSession(userId: string): Promise<string> {
    return await FelixSessionService.createSession(userId);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await FelixChatService.deleteSessionChats(sessionId);
    await FelixSessionService.delete(sessionId);
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
        if (r.auditResultId) {
          uniqueFindings.add(r.auditResultId);
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
      const excelFilename = `felix-aggregated-${sanitizedIntent}-${timestamp}.xlsx`;

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
    table: string = 'audit-results'
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

export const felixService = new FelixService();
