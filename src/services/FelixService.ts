import { GoogleGenAI } from "@google/genai";
import FelixSessionService from './FelixSessionService';
import FelixChatService from './FelixChatService';
import DatabaseService from './DatabaseService';
import departmentService from './DepartmentService';
import { findAllMatches } from '../utils/stringSimilarity';
import * as XLSX from 'xlsx';

export interface QueryFilter {
  field: string;
  operator: '==' | '!=' | '>' | '>=' | '<' | '<=' | 'array-contains' | 'in';
  value: string | number | string[];
}

export interface ProjectSuggestion {
  name: string;
  score: number;
}

export interface QueryResult {
  success: boolean;
  message: string;
  results?: any[];
  resultsCount: number;
  table?: string;
  excelBuffer?: ArrayBuffer;
  excelFilename?: string;
  needsConfirmation: boolean;
  filters?: QueryFilter[];
  suggestions?: ProjectSuggestion[];
  originalQuery?: string;
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

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

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
      };

      // Save assistant response
      await FelixChatService.addAssistantResponse(
        sessionId,
        userId,
        queryResult.message,
        {
          responseTime: Date.now() - startTime,
          modelVersion: 'gemini-3-pro-preview',
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

      // Process query through Gemini with session context
      const queryResult = await this.processQuery(message, activeSessionId);

      // Save assistant response with compact summary for context
      const compactMessage = this.createCompactContextMessage(queryResult);
      
      await FelixChatService.addAssistantResponse(
        activeSessionId,
        userId,
        queryResult.message,
        {
          responseTime: Date.now() - startTime,
          modelVersion: 'gemini-3-pro-preview',
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

      // Process query with session context
      const queryResult = await this.processQuery(message, activeSessionId);

      // Stream the response word by word for typing effect
      const words = queryResult.message.split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = (i === 0 ? '' : ' ') + words[i];
        yield chunk;
      }

      // Save assistant response with compact summary for context
      const compactMessage = this.createCompactContextMessage(queryResult);
      
      await FelixChatService.addAssistantResponse(
        activeSessionId,
        userId,
        queryResult.message,
        {
          responseTime: Date.now() - startTime,
          modelVersion: 'gemini-3-pro-preview',
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

SORTING RULES:
- If user says "highest score", "descending", "terbesar", "tertinggi", "dari nilai tertinggi" → sortBy="nilai", sortOrder="desc"
- If user says "lowest score", "ascending", "terkecil", "terendah", "dari nilai terendah" → sortBy="nilai", sortOrder="asc"
- If no sorting specified, omit sortBy and sortOrder fields
- Default sorting is handled by the system (year desc for audit-results, projectName asc for projects)

OPERATOR RULES:
- "==" for exact match (department = "IT", year = "2024", code = "F")
- ">=" for "above", "more than", "at least", "minimum"
- "<=" for "below", "less than", "at most", "maximum"
- ">" for "greater than"
- "<" for "less than"
- "!=" for "not equal", "except", "exclude"
- "array-contains" for tags field ONLY (e.g., APAR, Kolam renang, Hydrant)

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

Query: "temuan Tallasa Makassar" or "semua temuan Tallasa Makassar"
{"userIntent": "Semua temuan CitraLand Tallasa City Makassar", "targetTable": "audit-results", "filters": [{"field": "projectName", "operator": "==", "value": "CitraLand Tallasa City Makassar"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "dep = IT, year 2024, code = F"
{"userIntent": "Temuan IT tahun 2024 dengan kode F", "targetTable": "audit-results", "filters": [{"field": "department", "operator": "==", "value": "IT"}, {"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "findings with nilai >= 10"
{"userIntent": "Temuan dengan nilai di atas atau sama dengan 10", "targetTable": "audit-results", "filters": [{"field": "nilai", "operator": ">=", "value": 10}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan APAR"
{"userIntent": "Semua temuan terkait APAR", "targetTable": "audit-results", "filters": [{"field": "tags", "operator": "array-contains", "value": "APAR"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan kolam renang 2024"
{"userIntent": "Temuan kolam renang tahun 2024", "targetTable": "audit-results", "filters": [{"field": "tags", "operator": "array-contains", "value": "Kolam renang"}, {"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

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

Query: "temuan residential" or "findings from residential projects"
{"userIntent": "Temuan dari proyek residential", "targetTable": "audit-results", "filters": [{"field": "projectType", "operator": "==", "value": "Residential"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

Query: "temuan apartment" or "findings from apartments"
{"userIntent": "Temuan dari proyek apartment", "targetTable": "audit-results", "filters": [{"field": "subtype", "operator": "==", "value": "Apartment"}, {"field": "code", "operator": "==", "value": "F"}], "isValidQuery": true}

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

Query: "hello how are you"
{"userIntent": "Bukan query database", "targetTable": "audit-results", "filters": [], "isValidQuery": false, "invalidReason": "Ini bukan query database. Silakan tanyakan tentang audit findings, projects, atau departments."}

Return ONLY the JSON object.`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

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
      
      // Generate Excel file
      const { excelBuffer, excelFilename } = await this.generateExcel(results, targetTable, userIntent);

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
      
      // Separate equality filters from range filters
      const rangeOperators = ['>', '>=', '<', '<=', '!='];
      const equalityFilters: QueryFilter[] = [];
      const rangeFilters: QueryFilter[] = [];
      
      filters.forEach(f => {
        if (rangeOperators.includes(f.operator)) {
          rangeFilters.push(f);
        } else {
          equalityFilters.push(f);
        }
      });
      
      console.log('🔍 Equality filters (Firestore):', JSON.stringify(equalityFilters, null, 2));
      console.log('🔍 Range filters (in-memory):', JSON.stringify(rangeFilters, null, 2));
      
      // Handle filter transformations for audit-results
      let expandedFilters = equalityFilters;
      let projectTypeFilter: QueryFilter | undefined;
      let subtypeFilter: QueryFilter | undefined;
      
      if (table === 'audit-results') {
        // Convert year from string to number (Firestore stores year as number)
        expandedFilters = expandedFilters.map(f => {
          if (f.field === 'year' && typeof f.value === 'string') {
            const yearNum = parseInt(f.value, 10);
            console.log(`📅 Converting year from "${f.value}" (string) to ${yearNum} (number)`);
            return { ...f, value: yearNum };
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
          // Pass the full user query for better AI context, fallback to department value
          const queryContext = userQuery || String(deptFilter.value);
          const deptNames = await this.getDepartmentNames(queryContext);
          console.log(`📂 Department "${deptFilter.value}" expanded to ${deptNames.length} names:`, deptNames);
          
          const otherFilters = expandedFilters.filter(f => f.field !== 'department');
          
          if (deptNames.length === 1) {
            expandedFilters = [...otherFilters, { field: 'department', operator: '==', value: deptNames[0] }];
          } else if (deptNames.length > 1) {
            // Firestore 'in' operator supports up to 10 values
            expandedFilters = [...otherFilters, { field: 'department', operator: 'in' as any, value: deptNames.slice(0, 10) }];
          } else {
            expandedFilters = otherFilters.concat({ field: 'department', operator: '==', value: deptFilter.value });
          }
        }
      }
      
      console.log('🔍 Felix executeQuery - Expanded equality filters:', JSON.stringify(expandedFilters, null, 2));
      
      // Convert filters to DatabaseService format
      const dbFilters = expandedFilters.map(f => ({
        field: f.field,
        operator: f.operator as any,
        value: f.value
      }));

      // Determine sort order
      const orderBy = table === 'projects' ? 'projectName' : 
                      table === 'departments' ? 'name' : 'year';
      const orderDir = table === 'audit-results' ? 'desc' : 'asc';

      // Fetch with equality filters only (avoids composite index issues)
      // Use higher limit to accommodate large result sets (e.g., all code F findings = 4000+)
      let results = await db.getAll({
        filters: dbFilters,
        sorts: [{ field: orderBy, direction: orderDir }],
        limit: rangeFilters.length > 0 ? 10000 : 5000 // Increased limits for large datasets
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
      name: '📛'
    };

    return filters.map(f => {
      const icon = icons[f.field] || '•';
      return `${icon} ${f.field} ${f.operator} ${f.value}`;
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
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(value);
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

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

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
}

export const felixService = new FelixService();
