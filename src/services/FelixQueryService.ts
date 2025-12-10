/**
 * Felix Query Service
 * 
 * Handles database queries for Felix in Filter Mode
 * This is a simplified, focused service that ONLY queries the audit database
 * No general AI responses - only database queries
 * 
 * CURRENT MODE: QUERY GENERATION ONLY (NO EXECUTION)
 * - Shows user intent
 * - Shows SQL query
 * - Shows Firestore query structure
 * - Does NOT execute queries (temporarily disabled for manual verification)
 */

import { GoogleGenAI } from '@google/genai';
import { AuditResultService, AuditResult } from './AuditResultService';
import { DepartmentService } from './DepartmentService';
import ExcelJS from 'exceljs';

interface QueryFilter {
  field: string;
  operator: '==' | '!=' | '>' | '>=' | '<' | '<=';
  value: string | number;
}

interface PendingQuery {
  filters: QueryFilter[];
  query: string;
  userIntent: string;
  sqlQuery: string;
}

interface QueryResult {
  success: boolean;
  message: string;
  results?: (AuditResult & { id: string })[];
  resultsCount: number;
  excelBuffer?: ArrayBuffer;
  excelFilename?: string;
  needsConfirmation: boolean;
  filters?: QueryFilter[];
}

export class FelixQueryService {
  private ai: GoogleGenAI;
  private auditService: AuditResultService;
  private departmentService: DepartmentService;
  private pendingQueries: Map<string, PendingQuery> = new Map();

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY is not configured');
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.auditService = new AuditResultService();
    this.departmentService = new DepartmentService();
  }

  /**
   * Process a query - extract filters and show queries (no execution)
   */
  async processQuery(query: string, userId: string): Promise<QueryResult> {
    // TEMPORARILY DISABLED: Confirmation flow
    // const lowerQuery = query.toLowerCase().trim();
    // if (this.isConfirmation(lowerQuery)) {
    //   return await this.executeConfirmedQuery(userId);
    // }
    // if (this.isRejection(lowerQuery)) {
    //   this.pendingQueries.delete(userId);
    //   return {
    //     success: true,
    //     message: 'Query dibatalkan. Silakan kirim query baru.',
    //     resultsCount: 0,
    //     needsConfirmation: false,
    //   };
    // }

    // Extract filters and show queries (no execution)
    return await this.extractAndShowQueries(query, userId);
  }

  /**
   * Extract filters from natural language query and show queries
   */
  private async extractAndShowQueries(query: string, userId: string): Promise<QueryResult> {
    try {
      const prompt = `You are a database query assistant. Analyze the user's query and extract filters for the audit-results table.

DATABASE SCHEMA (audit-results table):
- auditResultId (string): Unique audit result ID
- year (string): Year as string (e.g., "2024", "2023")
- sh (string): SH identifier
- projectName (string): Project name
- projectId (string): Project ID
- department (string): Department name (e.g., "IT", "Audit Internal")
- riskArea (string): Risk area description
- descriptions (string): Finding description
- code (string): Finding code (F/O/R/NF)
- bobot (number): Weight value
- kadar (number): Severity level
- nilai (number): Score value

USER QUERY: "${query}"

Analyze the query and return a JSON object with:
{
  "userIntent": "what user wants in Indonesian",
  "filters": [
    {"field": "fieldName", "operator": "==|!=|>|>=|<|<=", "value": "value"}
  ]
}

OPERATOR RULES:
- Use "==" for exact match (e.g., department = "IT", year = "2024", code = "F")
- Use ">=" for "above", "more than", "at least"
- Use "<=" for "below", "less than", "at most"
- Use ">" for "greater than"
- Use "<" for "less than"
- Use "!=" for "not equal"

FIELD TYPE RULES:
- year: ALWAYS string (e.g., "2024", not 2024)
- bobot, kadar, nilai: number
- All other fields: string

EXAMPLES:
Query: "show all IT findings 2024"
Response: {"userIntent": "Tampilkan semua temuan IT tahun 2024", "filters": [{"field": "department", "operator": "==", "value": "IT"}, {"field": "year", "operator": "==", "value": "2024"}]}

Query: "dep = IT, year 2024, code = F"
Response: {"userIntent": "Temuan IT tahun 2024 dengan kode F", "filters": [{"field": "department", "operator": "==", "value": "IT"}, {"field": "year", "operator": "==", "value": "2024"}, {"field": "code", "operator": "==", "value": "F"}]}

Query: "show all score above 10"
Response: {"userIntent": "Tampilkan semua temuan dengan nilai di atas 10", "filters": [{"field": "nilai", "operator": ">=", "value": 10}]}

Query: "findings with bobot >= 5 and kadar < 3"
Response: {"userIntent": "Temuan dengan bobot >= 5 dan kadar < 3", "filters": [{"field": "bobot", "operator": ">=", "value": 5}, {"field": "kadar", "operator": "<", "value": 3}]}

Return ONLY the JSON object, no explanation.`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const responseText = response.text?.trim() || '{}';
      
      // Extract JSON from response (handle markdown code blocks)
      let jsonText = responseText;
      if (responseText.includes('```')) {
        const match = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (match) {
          jsonText = match[1];
        }
      }

      const parsed = JSON.parse(jsonText);
      const userIntent = parsed.userIntent || 'Mencari audit findings';
      const filters: QueryFilter[] = parsed.filters || [];

      // Store pending query
      const sqlQuery = this.buildSQLQuery(filters);
      this.pendingQueries.set(userId, { filters, query, userIntent, sqlQuery });

      // Build Firestore query representation
      const firestoreQuery = await this.buildFirestoreQuery(filters);

      // Build clean formatted message
      const confirmMsg = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 USER INTENT
${userIntent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 EXPECTED SQL QUERY

\`\`\`sql
${sqlQuery}
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 FIRESTORE QUERY

\`\`\`javascript
${firestoreQuery}
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ FILTERS APPLIED

${this.describeFilters(filters)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ QUERY GENERATED - NOT EXECUTED
Review the queries above to verify correctness.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      return {
        success: true,
        message: confirmMsg,
        resultsCount: 0,
        needsConfirmation: false,
        filters,
      };
    } catch (error) {
      console.error('Filter extraction error:', error);
      return {
        success: false,
        message: `Gagal memahami query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        resultsCount: 0,
        needsConfirmation: false,
      };
    }
  }



  /**
   * Get department names for a category
   */
  private async getDepartmentNames(category: string): Promise<string[]> {
    try {
      const allDepts = await this.departmentService.getAll({});
      const matching = allDepts.filter(d => 
        d.category?.toLowerCase() === category.toLowerCase() ||
        d.originalNames?.some(name => name.toLowerCase() === category.toLowerCase())
      );
      
      if (matching.length === 0) {
        // Try direct match
        return [category];
      }
      
      // Return all original names from matching departments
      const names: string[] = [];
      matching.forEach(d => {
        if (d.originalNames) {
          names.push(...d.originalNames);
        }
      });
      
      return names.length > 0 ? names : [category];
    } catch (error) {
      console.error('Department lookup error:', error);
      return [category];
    }
  }

  /**
   * Build SQL query representation
   */
  private buildSQLQuery(filters: QueryFilter[]): string {
    if (filters.length === 0) {
      return `SELECT * FROM audit_results\nORDER BY year DESC;`;
    }

    const conditions = filters.map(f => {
      const value = typeof f.value === 'string' ? `'${f.value}'` : f.value;
      return `${f.field} ${f.operator} ${value}`;
    });
    
    return `SELECT * FROM audit_results\nWHERE ${conditions.join(' AND ')}\nORDER BY year DESC;`;
  }

  /**
   * Build Firestore query representation
   */
  private async buildFirestoreQuery(filters: QueryFilter[]): Promise<string> {
    const departmentFilter = filters.find(f => f.field === 'department');
    const otherFilters = filters.filter(f => f.field !== 'department');

    let queryCode = `db.collection('audit-results')`;

    // Handle department filter with normalization
    if (departmentFilter) {
      const deptNames = await this.getDepartmentNames(String(departmentFilter.value));
      queryCode += `\n// Department filter: "${departmentFilter.value}" maps to: [${deptNames.map(n => `"${n}"`).join(', ')}]`;
      queryCode += `\n// Will query each department name separately and merge results`;
      
      if (deptNames.length > 0) {
        queryCode += `\n\n// Example for first department: "${deptNames[0]}"`;
        queryCode += `\ndb.collection('audit-results')`;
        queryCode += `\n  .where('department', '==', '${deptNames[0]}')`;
      }
    }

    // Add other filters
    otherFilters.forEach(f => {
      const value = typeof f.value === 'string' ? `'${f.value}'` : f.value;
      queryCode += `\n  .where('${f.field}', '${f.operator}', ${value})`;
    });

    // Add sorting
    queryCode += `\n  .orderBy('year', 'desc')`;
    queryCode += `\n  .get()`;

    return queryCode;
  }

  /**
   * Describe table structure
   */
  private describeTableStructure(): string {
    return `- auditResultId (string): Unique ID
- year (string): Year (e.g., "2024")
- sh (string): SH identifier
- projectName (string): Project name
- projectId (string): Project ID
- department (string): Department name
- riskArea (string): Risk area
- descriptions (string): Finding description
- code (string): Finding code (F/O/R/NF)
- bobot (number): Weight
- kadar (number): Severity
- nilai (number): Score`;
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
      code: '🏷️',
      nilai: '📊',
      bobot: '⚖️',
      kadar: '🔥',
      riskArea: '🎯',
      sh: '🔖'
    };

    const parts = filters.map(f => {
      const icon = icons[f.field] || '•';
      return `${icon} ${f.field} ${f.operator} ${f.value}`;
    });
    
    return parts.join('\n');
  }

  /**
   * TEMPORARILY DISABLED: Execute confirmed query
   */
  // private async executeConfirmedQuery(userId: string): Promise<QueryResult> {
  //   const pending = this.pendingQueries.get(userId);
  //   
  //   if (!pending) {
  //     return {
  //       success: false,
  //       message: 'Tidak ada query yang menunggu konfirmasi. Silakan kirim query baru.',
  //       resultsCount: 0,
  //       needsConfirmation: false,
  //     };
  //   }
  //
  //   try {
  //     const { filters, userIntent, sqlQuery } = pending;
  //     
  //     // Separate department filters from other filters
  //     const departmentFilter = filters.find(f => f.field === 'department');
  //     const otherFilters = filters.filter(f => f.field !== 'department');
  //
  //     // Build Firestore query filters for non-department fields
  //     const queryFilters = otherFilters.map(f => ({
  //       field: f.field,
  //       operator: f.operator as any,
  //       value: f.value
  //     }));
  //
  //     let results: (AuditResult & { id: string })[] = [];
  //     
  //     // Handle department with normalization
  //     if (departmentFilter) {
  //       const deptNames = await this.getDepartmentNames(String(departmentFilter.value));
  //       
  //       // Query for each department name and merge results
  //       for (const deptName of deptNames) {
  //         const deptFilters = [
  //           ...queryFilters,
  //           { field: 'department', operator: '==', value: deptName }
  //         ];
  //         
  //         const deptResults = await this.auditService.getAll({
  //           filters: deptFilters,
  //           sorts: [{ field: 'year', direction: 'desc' }],
  //         });
  //         
  //         results.push(...deptResults);
  //       }
  //       
  //       // Remove duplicates by id
  //       results = Array.from(new Map(results.map(r => [r.id, r])).values());
  //     } else {
  //       // No department filter - direct query
  //       results = await this.auditService.getAll({
  //         filters: queryFilters,
  //         sorts: [{ field: 'year', direction: 'desc' }],
  //       });
  //     }
  //
  //     // Clear pending query
  //     this.pendingQueries.delete(userId);
  //
  //     // Format results
  //     const message = this.formatResults(results, sqlQuery, userIntent);
  //     
  //     // Generate Excel if results exist
  //     let excelBuffer: ArrayBuffer | undefined;
  //     let excelFilename: string | undefined;
  //     
  //     if (results.length > 0) {
  //       excelBuffer = await this.generateExcel(results);
  //       excelFilename = this.generateFilename(filters);
  //     }
  //
  //     return {
  //       success: true,
  //       message,
  //       results,
  //       resultsCount: results.length,
  //       excelBuffer,
  //       excelFilename,
  //       needsConfirmation: false,
  //     };
  //   } catch (error) {
  //     console.error('Query execution error:', error);
  //     this.pendingQueries.delete(userId);
  //     
  //     return {
  //       success: false,
  //       message: `Gagal mengeksekusi query: ${error instanceof Error ? error.message : 'Unknown error'}`,
  //       resultsCount: 0,
  //       needsConfirmation: false,
  //     };
  //   }
  // }

  /**
   * Format results as text (TEMPORARILY UNUSED)
   */
  private formatResults(results: (AuditResult & { id: string })[], sqlQuery: string, userIntent: string): string {
    if (results.length === 0) {
      return `📋 **USER INTENT:**
${userIntent}

🔍 **EXECUTED SQL QUERY:**
\`\`\`sql
${sqlQuery}
\`\`\`

❌ **RESULTS:**
Tidak ditemukan audit findings dengan kriteria yang diminta.`;
    }

    const preview = results.slice(0, 10);
    let message = `📋 **USER INTENT:**
${userIntent}

🔍 **EXECUTED SQL QUERY:**
\`\`\`sql
${sqlQuery}
\`\`\`

✅ **RESULTS:** ${results.length} audit findings ditemukan

📊 **PREVIEW (10 pertama):**\n\n`;

    preview.forEach((r, i) => {
      message += `${i + 1}. ${r.projectName} (${r.year})\n`;
      message += `   📂 Department: ${r.department}\n`;
      message += `   🏷️ Code: ${r.code || '-'}\n`;
      message += `   📊 Nilai: ${r.nilai}\n`;
      message += `   🎯 Risk Area: ${r.riskArea}\n`;
      message += '\n';
    });

    if (results.length > 10) {
      message += `\n... dan ${results.length - 10} findings lainnya.\n`;
      message += `\n💾 Klik tombol download untuk melihat semua hasil dalam Excel.`;
    }

    return message;
  }

  /**
   * Generate Excel file (TEMPORARILY UNUSED)
   */
  private async generateExcel(results: (AuditResult & { id: string })[]): Promise<ArrayBuffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Audit Findings');

    // Add headers
    worksheet.columns = [
      { header: 'Project Name', key: 'projectName', width: 30 },
      { header: 'Year', key: 'year', width: 10 },
      { header: 'Department', key: 'department', width: 30 },
      { header: 'Code', key: 'code', width: 10 },
      { header: 'Risk Area', key: 'riskArea', width: 30 },
      { header: 'Nilai', key: 'nilai', width: 10 },
      { header: 'Bobot', key: 'bobot', width: 10 },
      { header: 'Kadar', key: 'kadar', width: 10 },
      { header: 'Description', key: 'descriptions', width: 50 },
      { header: 'SH', key: 'sh', width: 15 },
    ];

    // Add data
    results.forEach(r => {
      worksheet.addRow({
        projectName: r.projectName,
        year: r.year,
        department: r.department,
        code: r.code || '',
        riskArea: r.riskArea || '',
        nilai: r.nilai,
        bobot: r.bobot,
        kadar: r.kadar,
        descriptions: r.descriptions || '',
        sh: r.sh || '',
      });
    });

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * Generate filename (TEMPORARILY UNUSED)
   */
  private generateFilename(filters: QueryFilter[]): string {
    const parts: string[] = ['audit-findings'];
    
    filters.forEach(f => {
      const cleanValue = String(f.value).toLowerCase().replace(/\s+/g, '-').substring(0, 20);
      parts.push(`${f.field}-${cleanValue}`);
    });
    
    const timestamp = new Date().toISOString().split('T')[0];
    parts.push(timestamp);
    
    return `${parts.join('-')}.xlsx`;
  }

  /**
   * Check if query is a confirmation
   */
  private isConfirmation(query: string): boolean {
    const yes = ['ya', 'yes', 'benar', 'betul', 'iya', 'ok', 'oke', 'y'];
    return yes.includes(query);
  }

  /**
   * Check if query is a rejection
   */
  private isRejection(query: string): boolean {
    const no = ['tidak', 'no', 'bukan', 'salah', 'gak', 'nggak', 'n'];
    return no.includes(query);
  }
}

export default new FelixQueryService();
