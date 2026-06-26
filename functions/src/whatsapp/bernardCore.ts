import * as admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';
import { QueryFilter, QueryResult, AggregationResult } from './types';

const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-pro',
];

const TIER2_RESTRICTED_FIELDS = ['bobot', 'kadar', 'nilai'];

const TABLE_SCHEMA = `
DATABASE TABLES:

TABLE: audit_results (main audit findings table)
FIELDS:
- auditResultId (string): Unique ID
- filename (string): Source filename
- proyek (string): Project name
- category (string): Project category
- subholding (string): Subholding code (e.g., "SH3A", "SH2", "SH1")
- year (number): Audit year (2022-2025)
- department (string): Department name
- departmentOri (string): Original department name from source
- riskArea (string): Risk area description
- deskripsi (string): Finding description text
- kode (string): Finding code - F (Finding), NF (Non-Finding), O (Observation), R (Recommendation)
- bobot (number): Weight value (0-10)
- kadar (number): Severity level (0-5)
- nilai (number): Calculated score value (bobot × kadar)
- kategori (string): Category classification (nullable)
- temuanUlanganCount (number): Repeat findings count (0 = no repeats, 1+ = has repeats)

TABLE: projects (project master data with yearly statistics)
FIELDS:
- projectName (string): Full project name
- sh (string): Subholding code (e.g., "SH2", "SH3A")
- tbk (string): TBK status ("tbk" or "non")
- industry (string): Industry code (e.g., "Oth", "Com", "Res", "Hea", "Edu")
- category (string): Category name (e.g., "Others", "Commercial", "Residential", "Healthcare", "Education")
- location (string): Location
- tags (array): Tags array
- auditedYears (string): Years when project was audited
- grade2025, grade2024, grade2023, grade2022 (string): "A","B","C","D","E" or empty
- total2025, total2024, total2023, total2022 (number): Total audit results per year
- f2025, f2024, f2023, f2022 (number): Findings count per year
- nf2025, nf2024, nf2023, nf2022 (number): Non-Findings count per year
- grandTotal (number): Total audit results across all years
- totalFindings (number): Total findings across all years
- totalNF (number): Total non-findings across all years

TABLE: department_tags (department reference data)
FIELDS:
- departmentName (string): Official department name
- tags (array): Searchable keywords/aliases
- category (string): Department category
- findingsCount (number): Total findings count

SUBHOLDING (SH) CODES: SH1, SH2, SH3A, SH3B, SH4 (always uppercase)

IMPORTANT QUERY RULES:
- For keyword searches, use "deskripsi" field with "contains" operator
- For finding type: kode field - F (Finding), NF (Non-Finding), O (Observation), R (Recommendation)
- "temuan" or "findings" ALWAYS means kode="F"
- For department filtering: Match against department_tags, use originalNames in "in" operator
- year is NUMBER type (e.g., 2024, not "2024")
`;

export class BernardCore {
  private ai: GoogleGenAI;
  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  private async generateContent(prompt: string): Promise<string> {
    for (let i = 0; i < MODELS.length; i++) {
      try {
        const model = this.ai.models;
        const response = await model.generateContent({
          model: MODELS[i],
          contents: prompt,
        });
        return response.text ?? '';
      } catch (err: any) {
        console.warn(`Model ${MODELS[i]} failed: ${err.message}`);
        if (i === MODELS.length - 1) throw err;
      }
    }
    throw new Error('All models failed');
  }

  async processQuery(
    query: string,
    conversationHistory: Array<{ role: string; content: string }>,
    tier: 'tier-1' | 'tier-2'
  ): Promise<QueryResult> {
    const db = admin.firestore();

    // Build department tags context
    let departmentTagsContext = '';
    try {
      const snap = await db.collection('department_tags').get();
      if (!snap.empty) {
        departmentTagsContext = '\n\nDEPARTMENT_TAGS:\n' +
          snap.docs.map(d => {
            const data = d.data();
            return `- departmentName: "${data.departmentName}"\n  originalNames: [${(data.originalNames || []).map((n: string) => `"${n}"`).join(', ')}]\n  tags: [${(data.tags || []).map((t: string) => `"${t}"`).join(', ')}]`;
          }).join('\n\n');
      }
    } catch (e) {
      console.warn('Failed to load department_tags:', e);
    }

    // Build conversation context
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      const recent = conversationHistory.slice(-6);
      conversationContext = '\n\nCONVERSATION HISTORY:\n' +
        recent.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    }

    const prompt = `You are a database query assistant for an audit findings system.

${TABLE_SCHEMA}
${departmentTagsContext}
${conversationContext}

USER QUERY: "${query}"

CRITICAL RULES:
1. "temuan" or "findings" ALWAYS means kode="F" only
2. year is NUMBER type (2024, not "2024")
3. For department: use "in" operator with ALL originalNames from DEPARTMENT_TAGS
4. Maintain previous filters from conversation history for follow-up queries
5. If not a database query, set isValidQuery: false

Analyze the query and return a JSON object:
{
  "userIntent": "what user wants in Indonesian",
  "targetTable": "audit_results|projects|department_tags",
  "filters": [{"field": "fieldName", "operator": "==|!=|>|>=|<|<=|in|not-in|array-contains|array-contains-any|contains|contains-any", "value": "value"}],
  "sortBy": "field (optional)",
  "sortOrder": "asc|desc (optional)",
  "limit": "number (optional)",
  "groupBy": "field or [field1, field2] (optional for aggregation)",
  "aggregationType": "count|sum|avg|min|max (optional)",
  "aggregateField": "field to aggregate (optional)",
  "isValidQuery": true/false,
  "invalidReason": "reason if false"
}

Return ONLY the JSON object.`;

    const responseText = await this.generateContent(prompt);
    let jsonText = responseText.trim();
    if (jsonText.includes('```')) {
      const match = jsonText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (match) jsonText = match[1];
    }

    const parsed = JSON.parse(jsonText);

    if (!parsed.isValidQuery) {
      return {
        success: false,
        message: parsed.invalidReason || 'Maaf, saya hanya bisa menjawab pertanyaan tentang audit findings, projects, atau departments.',
        resultsCount: 0,
        needsConfirmation: false,
      };
    }

    const targetTable = parsed.targetTable || 'audit_results';
    let filters: QueryFilter[] = parsed.filters || [];
    const sortBy = parsed.sortBy;
    const sortOrder = parsed.sortOrder || 'desc';
    const limit = parsed.limit ? parseInt(String(parsed.limit), 10) : undefined;
    const groupBy = parsed.groupBy;
    const aggregationType = parsed.aggregationType || 'count';
    const aggregateField = parsed.aggregateField;
    const userIntent = parsed.userIntent || 'Mencari data';

    let results = await this.executeQuery(filters, targetTable, sortBy, sortOrder, limit);

    // Filter sensitive fields for tier-2
    if (targetTable === 'audit_results' && tier === 'tier-2') {
      results = results.map(r => {
        const filtered = { ...r };
        TIER2_RESTRICTED_FIELDS.forEach(f => delete filtered[f]);
        return filtered;
      });
    }

    // Smart retry on 0 results
    if (results.length === 0 && filters.length > 0) {
      const retryPrompt = `Previous query returned 0 results.

ORIGINAL QUERY: "${query}"
FILTERS USED: ${JSON.stringify(filters)}
TABLE: ${targetTable}
${departmentTagsContext}

Analyze why 0 results and return corrected JSON with fixed filters.
Return ONLY the JSON object.`;

      try {
        const retryText = await this.generateContent(retryPrompt);
        let retryJson = retryText.trim();
        if (retryJson.includes('```')) {
          const m = retryJson.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
          if (m) retryJson = m[1];
        }
        const retryParsed = JSON.parse(retryJson);
        if (retryParsed.filters?.length > 0) {
          const retryResults = await this.executeQuery(retryParsed.filters, targetTable, sortBy, sortOrder, limit);
          if (retryResults.length > 0) {
            results = retryResults;
            filters = retryParsed.filters;
          }
        }
      } catch (e) {
        console.warn('Retry failed:', e);
      }
    }

    // Handle aggregation
    if (groupBy) {
      const aggregatedResults = this.aggregateResults(results, groupBy, aggregationType, aggregateField, sortOrder);
      const groupByDisplay = Array.isArray(groupBy) ? groupBy.join(' + ') : groupBy;
      return {
        success: true,
        message: `${userIntent} — ${aggregatedResults.length} grup ditemukan`,
        results,
        aggregatedResults,
        resultsCount: aggregatedResults.length,
        table: targetTable,
        needsConfirmation: false,
        isAggregated: true,
        aggregationType,
        groupByField: groupByDisplay,
      };
    }

    const countText = results.length === 0
      ? 'Tidak ada hasil ditemukan'
      : results.length === 1 ? '1 hasil ditemukan' : `${results.length} hasil ditemukan`;

    return {
      success: true,
      message: `${userIntent} — ${countText}`,
      results,
      resultsCount: results.length,
      table: targetTable,
      needsConfirmation: false,
    };
  }

  private async executeQuery(
    filters: QueryFilter[],
    table: string,
    sortBy?: string,
    sortOrder: string = 'desc',
    limit?: number
  ): Promise<any[]> {
    const db = admin.firestore();

    // Map table names
    const collectionMap: Record<string, string> = {
      audit_results: 'audit_results',
      projects: 'projects',
      department_tags: 'department_tags',
    };
    const collectionName = collectionMap[table] || table;

    // Split filters by type
    const equalityFilters: QueryFilter[] = [];
    const rangeFilters: QueryFilter[] = [];
    const containsFilters: QueryFilter[] = [];
    const containsAnyFilters: QueryFilter[] = [];
    const notInFilters: QueryFilter[] = [];
    const rangeOps = ['>', '>=', '<', '<=', '!='];

    filters.forEach(f => {
      if (f.operator === 'contains') containsFilters.push(f);
      else if (f.operator === 'contains-any') containsAnyFilters.push(f);
      else if (f.operator === 'not-in') notInFilters.push(f);
      else if (rangeOps.includes(f.operator)) rangeFilters.push(f);
      else equalityFilters.push(f);
    });

    // Normalize year to number
    let expandedFilters = equalityFilters.map(f => {
      if (f.field === 'year') {
        if (typeof f.value === 'string') return { ...f, value: parseInt(f.value, 10) };
        if (Array.isArray(f.value)) return { ...f, value: f.value.map(v => typeof v === 'string' ? parseInt(v, 10) : v) };
      }
      return f;
    });

    // Enforce Firestore 'in' / 'array-contains-any' limit of 30
    const dbFilters = expandedFilters.map(f => {
      if ((f.operator === 'in' || f.operator === 'array-contains-any') && Array.isArray(f.value) && f.value.length > 30) {
        return { ...f, value: (f.value as any[]).slice(0, 30) };
      }
      return f;
    });

    // Default ordering
    const orderBy = sortBy || (table === 'projects' ? 'projectName' : 'year');
    const orderDir = (sortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

    let results: any[] = [];
    const fetchLimit = (containsFilters.length > 0 || containsAnyFilters.length > 0 || rangeFilters.length > 0 || notInFilters.length > 0) ? 10000 : (limit || 5000);

    try {
      let q: admin.firestore.Query = db.collection(collectionName);

      // Apply equality filters to Firestore
      for (const f of dbFilters) {
        q = q.where(f.field, f.operator as admin.firestore.WhereFilterOp, f.value);
      }

      try {
        q = q.orderBy(orderBy, orderDir);
      } catch (_) {
        // orderBy may fail without index — skip it
      }

      q = q.limit(fetchLimit);
      const snap = await q.get();
      results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err: any) {
      // Composite index error — fall back to fewer filters
      if (err.message?.includes('index')) {
        let q: admin.firestore.Query = db.collection(collectionName);
        if (dbFilters.length > 0) {
          q = q.where(dbFilters[0].field, dbFilters[0].operator as admin.firestore.WhereFilterOp, dbFilters[0].value);
        }
        q = q.limit(10000);
        const snap = await q.get();
        results = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Apply remaining equality filters in-memory
        const remaining = dbFilters.slice(1);
        results = results.filter(item =>
          remaining.every(f => this.matchFilter(item, f))
        );
      } else {
        throw err;
      }
    }

    // In-memory filters
    if (rangeFilters.length > 0) {
      results = results.filter(item => rangeFilters.every(f => this.matchRangeFilter(item, f)));
    }
    if (containsFilters.length > 0) {
      results = results.filter(item =>
        containsFilters.every(f => {
          const val = item[f.field];
          if (val == null) return false;
          return String(val).toLowerCase().includes(String(f.value).toLowerCase());
        })
      );
    }
    if (containsAnyFilters.length > 0) {
      results = results.filter(item =>
        containsAnyFilters.every(f => {
          const val = item[f.field];
          if (val == null) return false;
          const values = Array.isArray(f.value) ? f.value : [f.value];
          return values.some(sv => String(val).toLowerCase().includes(String(sv).toLowerCase()));
        })
      );
    }
    if (notInFilters.length > 0) {
      results = results.filter(item =>
        notInFilters.every(f => {
          const val = item[f.field];
          if (val == null) return true;
          const excludes = Array.isArray(f.value) ? f.value : [f.value];
          return !excludes.some(ex => String(ex).toLowerCase() === String(val).toLowerCase());
        })
      );
    }

    // Apply limit after in-memory filtering
    if (limit && results.length > limit) {
      results = results.slice(0, limit);
    }

    return results;
  }

  private matchFilter(item: any, f: QueryFilter): boolean {
    const val = item[f.field];
    const fval = f.value;
    if (val == null) return false;
    switch (f.operator) {
      case '==': return typeof val === 'string' && typeof fval === 'string'
        ? val.toLowerCase() === fval.toLowerCase()
        : val === fval;
      case 'in': {
        const arr = Array.isArray(fval) ? fval : [fval];
        return typeof val === 'string'
          ? arr.some(v => typeof v === 'string' && v.toLowerCase() === val.toLowerCase())
          : arr.includes(val);
      }
      case 'array-contains': return Array.isArray(val) && val.includes(fval);
      case 'array-contains-any': {
        if (!Array.isArray(val) || !Array.isArray(fval)) return false;
        return (fval as any[]).some(v => val.includes(v));
      }
      default: return true;
    }
  }

  private matchRangeFilter(item: any, f: QueryFilter): boolean {
    const val = item[f.field];
    const fval = f.value;
    if (val == null) return false;
    const n1 = typeof val === 'number' ? val : parseFloat(val);
    const n2 = typeof fval === 'number' ? fval : parseFloat(String(fval));
    const useNum = !isNaN(n1) && !isNaN(n2);
    const a = useNum ? n1 : val;
    const b = useNum ? n2 : fval;
    switch (f.operator) {
      case '>': return a > b;
      case '>=': return a >= b;
      case '<': return a < b;
      case '<=': return a <= b;
      case '!=': return a !== b;
      default: return true;
    }
  }

  private aggregateResults(
    results: any[],
    groupBy: string | string[],
    aggType: string,
    aggField?: string,
    sortOrder = 'desc'
  ): AggregationResult[] {
    const groups = new Map<string, any[]>();
    const isMulti = Array.isArray(groupBy);

    results.forEach(r => {
      const key = isMulti
        ? (groupBy as string[]).map(g => String(r[g] ?? '')).join('|')
        : String(r[groupBy as string] ?? '');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    });

    const agg: AggregationResult[] = [];
    groups.forEach((items, key) => {
      const groupValue = isMulti
        ? Object.fromEntries((groupBy as string[]).map((g, i) => [g, key.split('|')[i]]))
        : key;
      const entry: AggregationResult = {
        groupBy,
        groupValue: groupValue as any,
        count: items.length,
      };
      if (aggField) {
        const nums = items.map(r => parseFloat(r[aggField] ?? 0)).filter(n => !isNaN(n));
        if (nums.length) {
          if (aggType === 'sum') entry.sum = nums.reduce((a, b) => a + b, 0);
          if (aggType === 'avg') entry.avg = nums.reduce((a, b) => a + b, 0) / nums.length;
          if (aggType === 'min') entry.min = Math.min(...nums);
          if (aggType === 'max') entry.max = Math.max(...nums);
        }
      }
      agg.push(entry);
    });

    const sortVal = (r: AggregationResult) => aggField
      ? (r.sum ?? r.avg ?? r.min ?? r.max ?? r.count)
      : r.count;

    agg.sort((a, b) => sortOrder === 'asc' ? sortVal(a) - sortVal(b) : sortVal(b) - sortVal(a));
    return agg;
  }
}
