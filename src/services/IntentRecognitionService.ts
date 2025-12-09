/**
 * IntentRecognitionService
 * 
 * Uses LLM to understand user intent from natural language queries.
 * Handles variations in wording that express the same intent.
 * 
 * ENHANCED WITH INDONESIAN REAL ESTATE DOMAIN KNOWLEDGE:
 * - Understands Indonesian real estate terminology (PPJB, AJB, SHM, etc.)
 * - Automatically expands acronyms to full terms and English translations
 * - Enables semantic search for domain-specific queries
 * 
 * Examples:
 * - "show me critical findings 2024"
 * - "show me severity critical 2024"
 * - "show me highest risk findings 2024"
 * All should be recognized as: intent to find Critical severity findings from 2024
 * 
 * - "show me findings about PPJB in 2024"
 * Recognized as: Find findings about PPJB (Binding Sale Agreement) with keywords expanded
 * for semantic search: ["PPJB", "Perjanjian Pengikatan Jual Beli", "binding sale agreement"]
 */

import { sendMessageToGemini, isGeminiConfigured } from './GeminiService';
import { ExtractedFilters } from '../types/queryRouter.types';
import { FindingSeverity, FindingStatus, ProjectType } from '../types/finding.types';

export interface RecognizedIntent {
  /** Normalized intent description */
  intent: string;
  
  /** Extracted filters from the intent */
  filters: ExtractedFilters;
  
  /** Whether the query requires analytical reasoning */
  requiresAnalysis: boolean;
  
  /** Confidence score 0-1 */
  confidence: number;
  
  /** Original query for reference */
  originalQuery: string;
}

export class IntentRecognitionService {
  /**
   * Recognize user intent using LLM
   * @param maskedQuery - Query with sensitive data masked
   * @returns Recognized intent with normalized filters
   */
  async recognizeIntent(maskedQuery: string): Promise<RecognizedIntent> {
    if (!isGeminiConfigured()) {
      // Fallback to pattern-based recognition if LLM not available
      return this.fallbackRecognition(maskedQuery);
    }

    try {
      const prompt = this.buildIntentPrompt(maskedQuery);
      const response = await sendMessageToGemini(prompt, 'low');
      
      return this.parseIntentResponse(response, maskedQuery);
    } catch (error) {
      console.error('Intent recognition error:', error);
      // Fallback to pattern-based recognition
      return this.fallbackRecognition(maskedQuery);
    }
  }

  /**
   * Build prompt for intent recognition with domain knowledge
   */
  private buildIntentPrompt(query: string): string {
    return `You are an intent recognition system for an audit findings database for a Real Estate company in Indonesia.

DOMAIN CONTEXT - Indonesian Real Estate:
You are analyzing queries about real estate projects in Indonesia. Always consider Indonesian real estate terminology and context.

IMPORTANT REFERENCE DOCUMENT:
There is a comprehensive Indonesian Real Estate Terms Dictionary available at:
C:\\Users\\IA-GERALDI\\WORKPAPER\\Proyek\\Ongoing\\IA2025\\FIRST-AID\\dictionary.md

This dictionary contains 10 sections covering:
1. General Real Estate Terms (Land Rights: HGB, HGU, Hak Milik, SHGB, SHM, SHMSRS)
2. Landed House (Perumahan) - Property types, components, facilities
3. Apartment (Apartemen) - Unit types, building classification, facilities
4. Hotel - Classifications, room types, operations, MICE
5. Hospital (Rumah Sakit) - Types, departments, room classes, operations
6. Clinic (Klinik) - Types, services, licensing
7. School (Sekolah) - Levels, facilities, academic terms
8. University (Universitas) - Types, structure, facilities
9. Financial & Accounting Terms - Revenue, costs, ratios
10. Legal & Compliance Terms - Permits, licenses, regulations

COMMON INDONESIAN REAL ESTATE TERMS (Quick Reference):

Legal Documents:
- PPJB (Perjanjian Pengikatan Jual Beli): Binding Sale and Purchase Agreement
- AJB (Akta Jual Beli): Final Sale and Purchase Deed
- SHM (Sertifikat Hak Milik): Freehold Certificate
- SHGB (Sertifikat Hak Guna Bangunan): Building Use Rights Certificate
- SHMSRS: Strata Title Certificate (apartment ownership)

Permits & Taxes:
- IMB (Izin Mendirikan Bangunan): Building Permit
- PBG (Persetujuan Bangunan Gedung): Building Approval (new system)
- SLF (Sertifikat Laik Fungsi): Functional Worthiness Certificate
- PBB (Pajak Bumi dan Bangunan): Land and Building Tax
- BPHTB (Bea Perolehan Hak): Land Acquisition Duty

Financial:
- KPR (Kredit Pemilikan Rumah): Home Ownership Credit/Mortgage
- DP (Down Payment): Uang Muka - initial payment
- UTJ (Uang Tanda Jadi): Earnest money deposit
- IPL (Iuran Pengelolaan Lingkungan): Service/Maintenance Charge
- UKT (Uang Kuliah Tunggal): Single Tuition (university)

Property Types:
- Rumah Tapak: Landed House
- Kavling: Land plot/lot
- Cluster: Gated housing cluster
- Indent: Pre-order/booking system
- Condotel: Condo-hotel hybrid
- SOHO: Small Office Home Office

Hospital Terms:
- IGD (Instalasi Gawat Darurat): Emergency Department
- ICU/ICCU/NICU/PICU: Intensive Care Units
- Rawat Inap: Inpatient Ward
- Rawat Jalan: Outpatient
- BPJS Kesehatan: National Health Insurance
- BOR (Bed Occupancy Rate): Occupancy percentage

Hotel Terms:
- ADR (Average Daily Rate): Average room rate
- RevPAR (Revenue Per Available Room): Revenue efficiency
- GOP (Gross Operating Profit): Operating profit
- OOO (Out of Order): Unavailable rooms
- MICE: Meetings, Incentives, Conferences, Events

Education Terms:
- PAUD/TK/SD/SMP/SMA/SMK: Education levels
- SPP (Sumbangan Pembinaan Pendidikan): Tuition Fee
- Uang Pangkal: Registration Fee
- SKS (Satuan Kredit Semester): Credit Hours
- IPK (Indeks Prestasi Kumulatif): GPA

INSTRUCTION FOR UNKNOWN TERMS:
If you encounter an Indonesian real estate term you don't recognize:
1. Assume it's likely defined in the dictionary.md file
2. Include it in keywords for semantic search
3. Add common variations and potential English translations
4. Set requiresAnalysis=true to enable semantic search
5. The system will find relevant findings even if exact term doesn't match

IMPORTANT: When you see Indonesian real estate terms in the query:
1. First understand what the term means (use definitions above or assume it's in dictionary)
2. Extract it as a keyword for semantic search
3. Consider related terms and concepts
4. Set requiresAnalysis=true to enable semantic search

Example: "show me findings about PPJB in 2024"
- Understand: PPJB = Binding Sale and Purchase Agreement
- Extract: keywords: ["PPJB", "Perjanjian Pengikatan Jual Beli", "sale agreement", "binding agreement", "purchase agreement"]
- Set: requiresAnalysis: true (to enable semantic search)
- Set: year: 2024

Example: "issues with SLF certificates"
- Understand: SLF = Sertifikat Laik Fungsi (Functional Worthiness Certificate)
- Extract: keywords: ["SLF", "Sertifikat Laik Fungsi", "functional certificate", "occupancy permit", "building certificate"]
- Set: requiresAnalysis: true

Now analyze the user's query and extract:

1. The core intent (what they want to know/do)
2. Filters to apply (severity, status, year, project type, department, keywords)
3. Whether they need analysis/reasoning (vs just data retrieval)

User Query: "${query}"

Respond in JSON format:
{
  "intent": "brief description of what user wants",
  "filters": {
    "severity": ["Critical", "High", "Medium", "Low"] or null,
    "status": ["Open", "In Progress", "Closed", "Deferred"] or null,
    "year": 2024 or null,
    "projectType": "Hotel" or null,
    "department": "string" or null,
    "keywords": ["word1", "word2"] or null
  },
  "requiresAnalysis": true/false,
  "confidence": 0.0-1.0
}

CRITICAL RULES FOR INDONESIAN REAL ESTATE TERMS:
- When you see Indonesian real estate terms (PPJB, AJB, SHM, SHGB, IMB, etc.):
  1. Include the acronym in keywords
  2. Include the full Indonesian term in keywords
  3. Include English translation/concept in keywords
  4. Set requiresAnalysis=true to enable semantic search
- Examples:
  * "show me findings about PPJB in 2024" → keywords: ["PPJB", "Perjanjian Pengikatan Jual Beli", "binding sale agreement", "purchase agreement"], year: 2024, requiresAnalysis: true
  * "issues with SHM certificates" → keywords: ["SHM", "Sertifikat Hak Milik", "freehold certificate", "ownership certificate"], requiresAnalysis: true
  * "IMB permit problems" → keywords: ["IMB", "Izin Mendirikan Bangunan", "building permit"], requiresAnalysis: true

CRITICAL RULES FOR DEPARTMENT EXTRACTION:
- Common departments: IT, HR, Finance, Accounting, Marketing, Sales, Operations, Legal, Procurement, Admin, Engineering, R&D
- If user mentions a department name (e.g., "IT findings", "HR department", "Finance issues"), extract it to "department" field
- Department names are case-insensitive but should be returned in proper case (e.g., "IT", "HR", "Finance")
- DO NOT put department names in "keywords" - they belong in "department" field
- Examples:
  * "show me IT findings" → department: "IT", keywords: null
  * "HR department issues 2024" → department: "HR", year: 2024, keywords: null
  * "Finance critical findings" → department: "Finance", severity: ["Critical"], keywords: null

Valid severity values: Critical, High, Medium, Low
Valid status values: Open, In Progress, Closed, Deferred
Valid project types: Hotel, Landed House, Apartment, School, University, Insurance, Hospital, Clinic, Mall, Office Building, Mixed-Use Development

Recognize synonyms:
- "critical", "urgent", "severe", "highest risk" → Critical severity
- "high priority", "important" → High severity
- "open", "pending", "new" → Open status
- "closed", "resolved", "completed" → Closed status

Set requiresAnalysis=true if query asks for:
- Recommendations, suggestions, advice
- Analysis, patterns, trends
- Comparisons, predictions
- Explanations, insights, summaries
- "Why", "How should", "What should"
- Queries with keywords/search terms (to enable semantic search)

Set requiresAnalysis=false if query asks for:
- List, show, find, display findings (WITHOUT keywords)
- Count, how many (with specific filters only)
- Simple filtering/searching (year, status, severity only)

Respond ONLY with valid JSON, no other text.`;
  }

  /**
   * Parse LLM response into RecognizedIntent
   */
  private parseIntentResponse(response: string, originalQuery: string): RecognizedIntent {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                       response.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);

      // Normalize filters
      const filters: ExtractedFilters = {};
      
      if (parsed.filters.severity && Array.isArray(parsed.filters.severity)) {
        filters.severity = parsed.filters.severity as FindingSeverity[];
      }
      
      if (parsed.filters.status && Array.isArray(parsed.filters.status)) {
        filters.status = parsed.filters.status as FindingStatus[];
      }
      
      if (parsed.filters.year) {
        filters.year = parseInt(parsed.filters.year, 10);
      }
      
      if (parsed.filters.projectType) {
        filters.projectType = parsed.filters.projectType as ProjectType;
      }
      
      if (parsed.filters.department) {
        filters.department = parsed.filters.department;
      }
      
      if (parsed.filters.keywords && Array.isArray(parsed.filters.keywords)) {
        filters.keywords = parsed.filters.keywords;
      }

      return {
        intent: parsed.intent || 'Find findings',
        filters,
        requiresAnalysis: parsed.requiresAnalysis || false,
        confidence: Math.min(Math.max(parsed.confidence || 0.7, 0), 1),
        originalQuery,
      };
    } catch (error) {
      console.error('Failed to parse intent response:', error);
      return this.fallbackRecognition(originalQuery);
    }
  }

  /**
   * Fallback pattern-based recognition when LLM unavailable
   */
  private fallbackRecognition(query: string): RecognizedIntent {
    const lowerQuery = query.toLowerCase();
    const filters: ExtractedFilters = {};

    // Indonesian real estate terms dictionary (expanded from dictionary.md)
    const indonesianTerms: Record<string, string[]> = {
      // Legal Documents
      'ppjb': ['PPJB', 'Perjanjian Pengikatan Jual Beli', 'binding sale agreement', 'purchase agreement'],
      'ajb': ['AJB', 'Akta Jual Beli', 'sale deed', 'purchase deed', 'final deed'],
      'shm': ['SHM', 'Sertifikat Hak Milik', 'freehold certificate', 'ownership certificate'],
      'shgb': ['SHGB', 'Sertifikat Hak Guna Bangunan', 'building rights certificate', 'leasehold'],
      'shmsrs': ['SHMSRS', 'Strata Title Certificate', 'apartment ownership', 'condo title'],
      
      // Permits & Licenses
      'imb': ['IMB', 'Izin Mendirikan Bangunan', 'building permit', 'construction permit'],
      'pbg': ['PBG', 'Persetujuan Bangunan Gedung', 'building approval', 'construction approval'],
      'slf': ['SLF', 'Sertifikat Laik Fungsi', 'functional certificate', 'occupancy permit', 'building certificate'],
      
      // Taxes
      'pbb': ['PBB', 'Pajak Bumi dan Bangunan', 'land tax', 'building tax', 'property tax'],
      'bphtb': ['BPHTB', 'Bea Perolehan Hak', 'acquisition duty', 'transfer tax', 'land transfer tax'],
      'ppn': ['PPN', 'Pajak Pertambahan Nilai', 'value added tax', 'VAT', 'sales tax'],
      'pph': ['PPh', 'Pajak Penghasilan', 'income tax'],
      
      // Financial
      'kpr': ['KPR', 'Kredit Pemilikan Rumah', 'mortgage', 'home loan', 'housing credit'],
      'dp': ['DP', 'Down Payment', 'Uang Muka', 'initial payment', 'deposit'],
      'utj': ['UTJ', 'Uang Tanda Jadi', 'earnest money', 'booking deposit'],
      'ipl': ['IPL', 'Iuran Pengelolaan Lingkungan', 'service charge', 'maintenance fee', 'management fee'],
      'ukt': ['UKT', 'Uang Kuliah Tunggal', 'single tuition', 'consolidated fee'],
      'spp': ['SPP', 'Sumbangan Pembinaan Pendidikan', 'tuition fee', 'school fee'],
      
      // Property Types
      'kavling': ['kavling', 'plot', 'lot', 'land plot'],
      'cluster': ['cluster', 'gated community', 'housing cluster'],
      'indent': ['indent', 'pre-order', 'pre-sale', 'booking'],
      'condotel': ['condotel', 'condo-hotel', 'hotel apartment'],
      'soho': ['SOHO', 'Small Office Home Office', 'live-work unit'],
      
      // Hospital Terms
      'igd': ['IGD', 'Instalasi Gawat Darurat', 'emergency department', 'emergency room', 'ER'],
      'icu': ['ICU', 'Intensive Care Unit', 'critical care'],
      'nicu': ['NICU', 'Neonatal Intensive Care', 'newborn intensive care'],
      'bpjs': ['BPJS', 'BPJS Kesehatan', 'national health insurance', 'government insurance'],
      'bor': ['BOR', 'Bed Occupancy Rate', 'occupancy rate', 'bed utilization'],
      
      // Hotel Terms
      'adr': ['ADR', 'Average Daily Rate', 'average room rate'],
      'revpar': ['RevPAR', 'Revenue Per Available Room', 'revenue efficiency'],
      'gop': ['GOP', 'Gross Operating Profit', 'operating profit'],
      'mice': ['MICE', 'Meetings Incentives Conferences Events', 'business events'],
      
      // Education
      'paud': ['PAUD', 'Early Childhood Education', 'pre-school'],
      'tk': ['TK', 'Taman Kanak-Kanak', 'kindergarten'],
      'sd': ['SD', 'Sekolah Dasar', 'elementary school', 'primary school'],
      'smp': ['SMP', 'Sekolah Menengah Pertama', 'junior high school'],
      'sma': ['SMA', 'Sekolah Menengah Atas', 'senior high school'],
      'smk': ['SMK', 'Sekolah Menengah Kejuruan', 'vocational school'],
      'sks': ['SKS', 'Satuan Kredit Semester', 'credit hours', 'course credits'],
      'ipk': ['IPK', 'Indeks Prestasi Kumulatif', 'GPA', 'grade point average'],
      
      // Land Rights
      'hgb': ['HGB', 'Hak Guna Bangunan', 'right to build', 'building rights'],
      'hgu': ['HGU', 'Hak Guna Usaha', 'right to cultivate', 'cultivation rights'],
      
      // Area Measurements
      'kdb': ['KDB', 'Koefisien Dasar Bangunan', 'building coverage ratio', 'BCR'],
      'klb': ['KLB', 'Koefisien Lantai Bangunan', 'floor area ratio', 'FAR'],
      'kdh': ['KDH', 'Koefisien Dasar Hijau', 'green area ratio', 'green space'],
    };

    // Check for Indonesian terms and expand keywords
    const expandedKeywords: string[] = [];
    for (const [term, expansions] of Object.entries(indonesianTerms)) {
      if (lowerQuery.includes(term)) {
        expandedKeywords.push(...expansions);
      }
    }

    // Extract year
    const yearMatch = query.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      filters.year = parseInt(yearMatch[1], 10);
    }

    // Extract severity (recognize synonyms)
    const severityMap: Record<string, FindingSeverity> = {
      'critical': 'Critical',
      'urgent': 'Critical',
      'severe': 'Critical',
      'highest risk': 'Critical',
      'high': 'High',
      'important': 'High',
      'medium': 'Medium',
      'moderate': 'Medium',
      'low': 'Low',
      'minor': 'Low',
    };

    const severities: FindingSeverity[] = [];
    for (const [keyword, severity] of Object.entries(severityMap)) {
      if (lowerQuery.includes(keyword) && !severities.includes(severity)) {
        severities.push(severity);
      }
    }
    if (severities.length > 0) {
      filters.severity = severities;
    }

    // Extract status
    const statusMap: Record<string, FindingStatus> = {
      'open': 'Open',
      'pending': 'Open',
      'new': 'Open',
      'in progress': 'In Progress',
      'ongoing': 'In Progress',
      'closed': 'Closed',
      'resolved': 'Closed',
      'completed': 'Closed',
      'deferred': 'Deferred',
    };

    const statuses: FindingStatus[] = [];
    for (const [keyword, status] of Object.entries(statusMap)) {
      if (lowerQuery.includes(keyword) && !statuses.includes(status)) {
        statuses.push(status);
      }
    }
    if (statuses.length > 0) {
      filters.status = statuses;
    }

    // Determine if analysis required
    const analysisKeywords = [
      'recommend', 'suggest', 'analyze', 'analyse', 'compare', 'pattern',
      'trend', 'predict', 'why', 'how should', 'what should', 'insight',
      'summary', 'summarize', 'explain'
    ];
    
    // ✅ FIX: Extract keywords for semantic search
    // Remove common words and filter terms to find actual search keywords
    const commonWords = ['show', 'me', 'find', 'get', 'list', 'display', 'about', 'in', 'for', 'the', 'a', 'an', 'and', 'or', 'of', 'findings'];
    const filterWords = ['critical', 'high', 'medium', 'low', 'open', 'closed', 'pending', 'resolved'];
    const words = query.split(/\s+/).filter(w => {
      const lower = w.toLowerCase();
      return w.length > 2 && 
             !commonWords.includes(lower) && 
             !filterWords.includes(lower) &&
             !/^\d+$/.test(w); // Not just a number
    });
    
    // Combine extracted words with expanded Indonesian terms
    const allKeywords = [...expandedKeywords, ...words];
    
    if (allKeywords.length > 0) {
      filters.keywords = allKeywords;
    }
    
    // Require analysis if has keywords (to trigger semantic search) or analysis keywords
    const requiresAnalysis = analysisKeywords.some(kw => lowerQuery.includes(kw)) || 
                            Boolean(filters.keywords && filters.keywords.length > 0);

    return {
      intent: requiresAnalysis ? 'Analyze findings' : 'Find findings',
      filters,
      requiresAnalysis,
      confidence: 0.6,
      originalQuery: query,
    };
  }
}

// Export singleton instance
export const intentRecognitionService = new IntentRecognitionService();
