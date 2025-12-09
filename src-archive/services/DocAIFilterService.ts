import { sendMessageToGemini } from './GeminiService';
import { AuditResultService, AuditResult } from './AuditResultService';
import { QueryFilter, QuerySort } from './DatabaseService';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * DocAI Filter Mode - Smart query builder with user confirmation
 * 
 * Flow:
 * 1. User inputs their query needs
 * 2. AI analyzes database structure and matches with user input
 * 3. AI confirms interpretation with user
 * 4. If confirmed, builds and executes Firebase query
 * 5. Shows results (max 10 in chat) + downloadable XLSX
 */

export interface FilterIntent {
  interpretation: string; // Human-readable interpretation
  filters: {
    year?: number; // Year as number to match Firestore (e.g., 2024)
    department?: string;
    projectName?: string;
    sh?: string;
    minNilai?: number;
    maxNilai?: number;
    onlyFindings?: boolean;
    keywords?: string[];
  };
  confidence: number; // 0-1
  needsConfirmation: boolean;
  clarificationNeeded?: string;
}

export interface FilterResult {
  results: AuditResult[];
  totalCount: number;
  query: {
    filters: QueryFilter[];
    sorts: QuerySort[];
  };
  executionTime: number;
}

export class DocAIFilterService {
  private auditResultService: AuditResultService;
  
  constructor() {
    this.auditResultService = new AuditResultService();
  }
  
  /**
   * Step 1: Analyze user input and extract filter intent
   */
  async analyzeUserInput(userInput: string): Promise<FilterIntent> {
    const prompt = `You are a query analyzer for an audit findings database.

## Database Schema (audit-results collection):
- **year** (number): Audit year as number (e.g., 2024, 2023, 2022)
- **department** (string): IT, HR, Finance, Sales, Procurement, Legal, Marketing, Accounting, Operations
- **projectName** (string): Project name (e.g., "Grand Hotel Jakarta", "Citra World Surabaya")
- **sh** (string): Subholding code (e.g., CWS, CJK, CPK)
- **nilai** (number): Risk score/nilai (0-25, calculated as bobot × kadar)
  - Also called: "score", "risk score", "nilai"
  - 0-5: Low risk
  - 6-10: Medium risk
  - 11-15: High risk
  - 16-25: Critical risk
- **bobot** (number): Weight/importance (0-5)
- **kadar** (number): Severity level (0-5)
- **code** (string): Finding code (empty string = Non-Finding, non-empty = Finding)
- **descriptions** (string): Finding/non-finding description
- **riskArea** (string): Risk area description

## User Input:
"${userInput}"

## Task:
Analyze the input and extract structured filters. Return ONLY valid JSON:

\`\`\`json
{
  "interpretation": "Show all IT department findings from 2024",
  "filters": {
    "year": 2024,
    "department": "IT",
    "onlyFindings": true
  },
  "confidence": 0.95,
  "needsConfirmation": false
}
\`\`\`

## Rules:
1. Extract year from: "2024", "in 2024", "last year", "this year" - ALWAYS return as NUMBER (e.g., 2024, not "2024")
2. Map department names (case-insensitive): "IT", "HR", "Finance", etc.
3. Map risk levels and score/nilai filters:
   - "critical" → minNilai: 16
   - "high risk" → minNilai: 11
   - "medium risk" → minNilai: 6, maxNilai: 10
   - "low risk" → maxNilai: 5
   - "score more than X" or "nilai > X" → minNilai: X+1
   - "score at least X" or "nilai >= X" → minNilai: X
   - "score less than X" or "nilai < X" → maxNilai: X-1
   - "score at most X" or "nilai <= X" → maxNilai: X
4. Set onlyFindings: true if user says "findings" (not "non-findings")
5. Extract keywords for text search in descriptions/riskArea
6. Set needsConfirmation: true if interpretation is ambiguous
7. Set clarificationNeeded if you need more info from user
8. confidence should be 0-1 (1 = very confident)

Return ONLY the JSON, no other text.`;

    const response = await sendMessageToGemini(prompt, 'low');
    
    console.log('🤖 DocAIFilterService - Raw AI response:', response);
    
    // Try multiple parsing strategies
    let jsonStr: string | null = null;
    
    // Strategy 1: Look for ```json code block
    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }
    
    // Strategy 2: Look for any code block
    if (!jsonStr) {
      const anyCodeBlockMatch = response.match(/```\s*([\s\S]*?)\s*```/);
      if (anyCodeBlockMatch) {
        jsonStr = anyCodeBlockMatch[1];
      }
    }
    
    // Strategy 3: Look for JSON object anywhere in response
    if (!jsonStr) {
      const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonStr = jsonObjectMatch[0];
      }
    }
    
    if (!jsonStr) {
      console.error('❌ DocAIFilterService - Failed to find JSON in response:', response);
      throw new Error('Failed to parse filter intent from AI response. The AI did not return valid JSON.');
    }
    
    console.log('📝 DocAIFilterService - Extracted JSON string:', jsonStr);
    
    try {
      const parsed = JSON.parse(jsonStr);
      console.log('✅ DocAIFilterService - Parsed intent:', JSON.stringify(parsed, null, 2));
      return parsed;
    } catch (parseError) {
      console.error('❌ DocAIFilterService - JSON parse error:', parseError);
      console.error('❌ DocAIFilterService - Failed JSON string:', jsonStr);
      throw new Error(`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Step 2: Build Firebase query from confirmed filters
   * Strategy: Use ONLY year filter in Firestore, do department matching client-side
   */
  buildFirestoreQuery(intent: FilterIntent): { filters: QueryFilter[], sorts: QuerySort[] } {
    const filters: QueryFilter[] = [];
    const sorts: QuerySort[] = [];
    
    // ONLY use year filter to avoid index requirements
    // Department filtering will be done client-side after mapping
    // NOTE: Convert year to string because Firestore stores it as string ("2024" not 2024)
    if (intent.filters.year) {
      filters.push({
        field: 'year',
        operator: '==',
        value: String(intent.filters.year)
      });
    }
    
    // Simple sort by year desc (existing index)
    sorts.push({
      field: 'year',
      direction: 'desc'
    });
    
    return { filters, sorts };
  }
  
  /**
   * Step 3: Execute query and return results
   * Strategy: Fetch with minimal Firestore filters, do heavy filtering client-side
   */
  async executeQuery(intent: FilterIntent): Promise<FilterResult> {
    const startTime = Date.now();
    
    console.log('🔍 DocAIFilterService - Intent filters:', JSON.stringify(intent.filters, null, 2));
    
    // If department filter exists, expand it to include all original names
    let departmentNames: string[] = [];
    if (intent.filters.department) {
      const { default: departmentService } = await import('./DepartmentService');
      
      // Try to find by category first (e.g., "IT" → all IT departments)
      let matchingDepts = await departmentService.getByCategory(intent.filters.department);
      
      // If no category match, try searching by name
      if (matchingDepts.length === 0) {
        matchingDepts = await departmentService.searchByName(intent.filters.department);
      }
      
      if (matchingDepts.length > 0) {
        // Get all original names from matching departments
        matchingDepts.forEach(dept => {
          dept.originalNames.forEach(name => departmentNames.push(name));
        });
        console.log(`🔍 DocAIFilterService - Mapped "${intent.filters.department}" to ${departmentNames.length} department names:`, departmentNames);
      } else {
        // No match found, use the original input
        departmentNames = [intent.filters.department];
        console.log(`⚠️ DocAIFilterService - No department mapping found for "${intent.filters.department}", using as-is`);
      }
    }
    
    // Build minimal Firestore query (only year filter to avoid complex indexes)
    const query = this.buildFirestoreQuery(intent);
    
    console.log('🔍 DocAIFilterService - Built query:', JSON.stringify(query, null, 2));
    
    // Execute query
    let results = await this.auditResultService.getAll(query);
    
    console.log(`🔍 DocAIFilterService - Fetched ${results.length} results from Firestore`);
    
    // CLIENT-SIDE FILTERING (no index needed)
    
    // Filter by department (using expanded names)
    if (departmentNames.length > 0) {
      results = results.filter(r => departmentNames.includes(r.department));
      console.log(`🔍 DocAIFilterService - After department filter: ${results.length} results`);
    }
    
    // Filter by project name
    if (intent.filters.projectName) {
      results = results.filter(r => r.projectName === intent.filters.projectName);
    }
    
    // Filter by subholding
    if (intent.filters.sh) {
      results = results.filter(r => r.sh === intent.filters.sh);
    }
    
    // Filter by risk score range
    if (intent.filters.minNilai !== undefined) {
      results = results.filter(r => r.nilai >= intent.filters.minNilai!);
    }
    if (intent.filters.maxNilai !== undefined) {
      results = results.filter(r => r.nilai <= intent.filters.maxNilai!);
    }
    
    // Filter findings only
    if (intent.filters.onlyFindings) {
      results = results.filter(r => r.code !== '');
    }
    
    // Filter by keywords
    if (intent.filters.keywords && intent.filters.keywords.length > 0) {
      const keywords = intent.filters.keywords.map(k => k.toLowerCase());
      results = results.filter(r => {
        const searchText = `${r.descriptions} ${r.riskArea}`.toLowerCase();
        return keywords.some(keyword => searchText.includes(keyword));
      });
    }
    
    // CLIENT-SIDE SORTING
    results.sort((a, b) => {
      // Sort by nilai desc, then year desc
      if (b.nilai !== a.nilai) return b.nilai - a.nilai;
      // Compare years as strings (they're stored as strings in Firestore)
      return b.year.localeCompare(a.year);
    });
    
    const executionTime = Date.now() - startTime;
    
    console.log(`✅ DocAIFilterService - Filtered to ${results.length} results (${executionTime}ms)`);
    
    return {
      results,
      totalCount: results.length,
      query,
      executionTime
    };
  }
  
  /**
   * Format results for chat display (max 10 rows)
   */
  formatResultsForChat(filterResult: FilterResult): string {
    const { results, totalCount, executionTime } = filterResult;
    
    if (totalCount === 0) {
      return '❌ No results found matching your criteria.';
    }
    
    const displayResults = results.slice(0, 10);
    const hasMore = totalCount > 10;
    
    let output = `✅ Found ${totalCount} result${totalCount > 1 ? 's' : ''} (${executionTime}ms)\n\n`;
    
    if (hasMore) {
      output += `📊 Showing first 10 of ${totalCount} results.\n\n`;
    }
    
    output += displayResults.map((r, idx) => {
      const riskLevel = r.nilai >= 16 ? '🔴 CRITICAL' : 
                       r.nilai >= 11 ? '🟠 HIGH' :
                       r.nilai >= 6 ? '🟡 MEDIUM' : '🟢 LOW';
      
      return `${idx + 1}. ${r.auditResultId} ${riskLevel}
   Project: ${r.projectName}
   Department: ${r.department} | Year: ${r.year}
   Risk Score: ${r.nilai}/25 (Bobot: ${r.bobot}, Kadar: ${r.kadar})
   Type: ${r.code ? 'Finding' : 'Non-Finding'}
   Description: ${r.descriptions.substring(0, 150)}${r.descriptions.length > 150 ? '...' : ''}`;
    }).join('\n\n');
    
    return output;
  }
  
  /**
   * Export results to XLSX file
   */
  async exportToXLSX(results: AuditResult[], filename: string = 'audit-results-export.xlsx'): Promise<void> {
    // Prepare data for export
    const exportData = results.map(r => ({
      'Audit Result ID': r.auditResultId,
      'Year': r.year,
      'Subholding': r.sh,
      'Project Name': r.projectName,
      'Department': r.department,
      'Risk Area': r.riskArea,
      'Description': r.descriptions,
      'Code': r.code || '(Non-Finding)',
      'Bobot': r.bobot,
      'Kadar': r.kadar,
      'Nilai (Risk Score)': r.nilai,
      'Risk Level': r.nilai >= 16 ? 'CRITICAL' : 
                   r.nilai >= 11 ? 'HIGH' :
                   r.nilai >= 6 ? 'MEDIUM' : 'LOW'
    }));
    
    // Create workbook
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Results');
    
    // Auto-size columns
    const maxWidth = 50;
    const colWidths = Object.keys(exportData[0] || {}).map(key => {
      const maxLen = Math.max(
        key.length,
        ...exportData.map(row => String(row[key as keyof typeof row]).length)
      );
      return { wch: Math.min(maxLen + 2, maxWidth) };
    });
    ws['!cols'] = colWidths;
    
    // Generate file
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    
    // Trigger download
    saveAs(blob, filename);
  }
}

export default new DocAIFilterService();
