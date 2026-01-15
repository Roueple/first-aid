/**
 * DocAI Filter Extractor
 * 
 * Uses LLM to extract structured filters from natural language queries
 * Minimal LLM intervention - only for filter extraction
 */

import { sendMessageToGemini } from './GeminiService';
import { ExtractedFilters } from './DocAIQueryBuilder';

/**
 * System prompt for filter extraction
 */
const FILTER_EXTRACTION_PROMPT = `You are a filter extraction assistant for an Indonesian audit findings database.

Your ONLY job is to extract structured filters from user queries. Return ONLY valid JSON.

Database schema:
- year: string (e.g., "2024", "2023") - ALWAYS STRING
- department: string (e.g., "IT", "Finance", "HR")
- projectName: string
- sh: string (subholding code)
- riskArea: string
- code: string (finding code, empty string means non-finding)
- nilai: number (risk score 0-25)
- bobot: number (weight 0-5)
- kadar: number (severity 0-5)

Common patterns:
- "temuan IT 2024" → { "department": "IT", "year": "2024", "onlyFindings": true }
- "hasil audit 2023" → { "year": "2023" }
- "temuan nilai 15 ke atas" → { "minNilai": 15, "onlyFindings": true }
- "temuan nilai 10-14" → { "minNilai": 10, "maxNilai": 14, "onlyFindings": true }
- "semua temuan" → { "onlyFindings": true }

Score ranges (nilai):
- Score 0-25 (bobot 0-5 × kadar 0-5)

Rules:
1. ALWAYS use year as STRING: "2024", NOT 2024
2. If user says "temuan", add "onlyFindings": true
3. If no year specified, do NOT add year filter
4. Return ONLY JSON, no explanation
5. Use Indonesian department names as-is

Example inputs and outputs:

Input: "temuan IT 2024"
Output: {"department":"IT","year":"2024","onlyFindings":true}

Input: "hasil audit finance tahun 2023"
Output: {"department":"Finance","year":"2023"}

Input: "temuan nilai tinggi"
Output: {"minNilai":15,"onlyFindings":true}

Input: "semua temuan 2024 dan 2023"
Output: {"year":["2024","2023"],"onlyFindings":true}

Now extract filters from this query:`;

/**
 * Extract filters from natural language query using LLM
 */
export async function extractFilters(
  query: string,
  sessionId?: string
): Promise<ExtractedFilters> {
  try {
    const prompt = `${FILTER_EXTRACTION_PROMPT}\n\n"${query}"`;

    // Use low thinking mode for fast extraction
    const response = await sendMessageToGemini(prompt, 'low', sessionId);

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('LLM did not return valid JSON');
    }

    const extracted = JSON.parse(jsonMatch[0]) as ExtractedFilters;

    // Ensure year is always string
    if (extracted.year) {
      if (Array.isArray(extracted.year)) {
        extracted.year = extracted.year.map((y) => String(y));
      } else {
        extracted.year = String(extracted.year);
      }
    }

    console.log('✅ Extracted filters:', extracted);
    return extracted;
  } catch (error) {
    console.error('❌ Filter extraction failed:', error);
    throw new Error(
      `Gagal mengekstrak filter dari query: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if query needs database structure information
 * Returns true if query asks about available data, departments, years, etc.
 */
export function needsDatabaseInfo(query: string): boolean {
  const lowerQuery = query.toLowerCase();

  const infoKeywords = [
    'apa saja',
    'ada apa',
    'departemen apa',
    'tahun apa',
    'berapa',
    'daftar',
    'list',
    'show me',
    'available',
    'tersedia',
  ];

  return infoKeywords.some((keyword) => lowerQuery.includes(keyword));
}

/**
 * Get database structure information for LLM context
 */
export async function getDatabaseInfo(): Promise<string> {
  const { default: auditResultService } = await import('./AuditResultService');
  const { default: departmentService } = await import('./DepartmentService');

  const [allResults, allDepartments] = await Promise.all([
    auditResultService.getAll({ limit: 1000 }),
    departmentService.getAllNames(),
  ]);

  // Get unique years
  const years = [...new Set(allResults.map((r) => String(r.year)))].sort(
    (a, b) => b.localeCompare(a)
  );

  // Get unique SHs
  const shs = [...new Set(allResults.map((r) => r.sh))].sort();

  // Get unique project names (top 20)
  const projects = [...new Set(allResults.map((r) => r.projectName))]
    .sort()
    .slice(0, 20);

  // Count findings
  const findingsCount = allResults.filter((r) => r.code !== '').length;
  const totalCount = allResults.length;

  return `Database contains:
- Total records: ${totalCount} (${findingsCount} findings)
- Years: ${years.join(', ')}
- Subholdings: ${shs.join(', ')}
- Departments: ${allDepartments.join(', ')}
- Sample projects: ${projects.join(', ')}${projects.length === 20 ? ', ...' : ''}`;
}
