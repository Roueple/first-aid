# Firebase Query Guide for Audit Database

## Overview

This guide explains how Firebase Firestore queries work in the FIRST-AID system, provides 10 common query examples for audit findings/non-findings, and presents query templates for DocAI LLM chatbot integration.

## Table of Contents

1. [Firebase Query Fundamentals](#firebase-query-fundamentals)
2. [Database Schema](#database-schema)
3. [Common Query Examples](#common-query-examples)
4. [Query Templates for DocAI Integration](#query-templates-for-docai-integration)
5. [Best Practices](#best-practices)
6. [Performance Optimization](#performance-optimization)

---

## Firebase Query Fundamentals

### How Firestore Queries Work

Firestore queries are built using a fluent API that chains constraints:

```typescript
// Basic query structure
const query = collection(db, 'audit-results')
  .where('field', 'operator', 'value')  // Filter
  .orderBy('field', 'direction')        // Sort
  .limit(number)                        // Pagination
  .startAfter(lastDoc);                 // Cursor-based pagination
```

### Query Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `==` | Equal to | `where('year', '==', 2025)` |
| `!=` | Not equal to | `where('status', '!=', 'Closed')` |
| `<` | Less than | `where('nilai', '<', 50)` |
| `<=` | Less than or equal | `where('bobot', '<=', 3)` |
| `>` | Greater than | `where('nilai', '>', 100)` |
| `>=` | Greater than or equal | `where('kadar', '>=', 5)` |
| `in` | In array (max 10 values) | `where('department', 'in', ['IT', 'HR'])` |
| `not-in` | Not in array (max 10 values) | `where('code', 'not-in', ['', null])` |
| `array-contains` | Array contains value | `where('tags', 'array-contains', 'security')` |
| `array-contains-any` | Array contains any value | `where('tags', 'array-contains-any', ['security', 'compliance'])` |

### Query Constraints

1. **Composite Indexes Required**: Queries with multiple `where` clauses or `where` + `orderBy` need composite indexes
2. **Inequality Filters**: Only one field can have inequality operators (`<`, `<=`, `>`, `>=`, `!=`)
3. **OrderBy Requirement**: If using inequality on a field, must `orderBy` that field first
4. **Array Limitations**: `in` and `not-in` support max 10 values
5. **OR Queries**: Use `or()` for OR logic (Firebase SDK v9+)

---

## Database Schema

### Audit Results Collection (`audit-results`)

```typescript
interface AuditResult {
  id: string;                    // Firestore document ID
  auditResultId: string;         // Unique ID: [ProjectInitial]-[Dept3]-[F/NF]-[Count]
  year: number;                  // Audit year (e.g., 2024, 2025)
  sh: string;                    // Subholding company code
  projectName: string;           // Project name
  projectId: string | null;      // Reference to projects collection
  department: string;            // Department name (IT, HR, Finance, etc.)
  riskArea: string;              // Risk area description
  descriptions: string;          // Finding/non-finding description
  code: string;                  // Finding code (empty for non-findings)
  bobot: number;                 // Weight/importance (0-5)
  kadar: number;                 // Severity level (0-5)
  nilai: number;                 // Calculated value (bobot * kadar)
  createdAt: Timestamp;          // Creation timestamp
  createdBy: string;             // Creator user ID
  updatedAt: Timestamp;          // Last update timestamp
}
```

### Key Fields Explained

- **auditResultId**: Format `CWSACCF01` = Citra World Surabaya - Accounting - Finding - 01
- **code**: Empty string = Non-Finding, Non-empty = Finding
- **nilai**: Risk score (0-25), calculated as `bobot × kadar`
- **year**: Audit year for temporal filtering
- **department**: Business unit (IT, HR, Finance, Sales, Procurement, Legal, Marketing, etc.)
- **projectName**: Specific project being audited

### Composite Indexes

The following composite indexes are configured in `firestore.indexes.json`:

```json
{
  "collectionGroup": "audit-results",
  "fields": [
    { "fieldPath": "projectName", "order": "ASCENDING" },
    { "fieldPath": "year", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "audit-results",
  "fields": [
    { "fieldPath": "department", "order": "ASCENDING" },
    { "fieldPath": "year", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "audit-results",
  "fields": [
    { "fieldPath": "sh", "order": "ASCENDING" },
    { "fieldPath": "year", "order": "DESCENDING" }
  ]
}
```

---

## Common Query Examples

### 1. Get All Findings for a Specific Year

**Use Case**: "Show me all audit findings from 2025"

```typescript
const results = await auditResultService.getAll({
  filters: [
    { field: 'year', operator: '==', value: 2025 }
  ],
  sorts: [
    { field: 'nilai', direction: 'desc' }  // Highest risk first
  ]
});
```

**SQL Equivalent**:
```sql
SELECT * FROM audit_results 
WHERE year = 2025 
ORDER BY nilai DESC
```

---

### 2. Get Findings by Department

**Use Case**: "Show me all IT department findings"

```typescript
const results = await auditResultService.getAuditResultsByDepartment('IT');

// Or with custom query:
const results = await auditResultService.getAll({
  filters: [
    { field: 'department', operator: '==', value: 'IT' }
  ],
  sorts: [
    { field: 'year', direction: 'desc' }
  ]
});
```

**SQL Equivalent**:
```sql
SELECT * FROM audit_results 
WHERE department = 'IT' 
ORDER BY year DESC
```

---

### 3. Get High-Risk Findings (nilai > 15)

**Use Case**: "Show me critical findings with risk score above 15"

```typescript
const results = await auditResultService.getAll({
  filters: [
    { field: 'nilai', operator: '>', value: 15 }
  ],
  sorts: [
    { field: 'nilai', direction: 'desc' }  // Must orderBy inequality field first
  ]
});
```

**SQL Equivalent**:
```sql
SELECT * FROM audit_results 
WHERE nilai > 15 
ORDER BY nilai DESC
```

---

### 4. Get Findings for Specific Project

**Use Case**: "Show me all findings for Grand Hotel Jakarta"

```typescript
const results = await auditResultService.getAuditResultsByProject('Grand Hotel Jakarta');

// Or with custom query:
const results = await auditResultService.getAll({
  filters: [
    { field: 'projectName', operator: '==', value: 'Grand Hotel Jakarta' }
  ],
  sorts: [
    { field: 'year', direction: 'desc' }
  ]
});
```

**SQL Equivalent**:
```sql
SELECT * FROM audit_results 
WHERE projectName = 'Grand Hotel Jakarta' 
ORDER BY year DESC
```

---

### 5. Get Findings by Subholding (SH)

**Use Case**: "Show me all findings for SH code 'CWS'"

```typescript
const results = await auditResultService.getAuditResultsBySH('CWS');

// Or with custom query:
const results = await auditResultService.getAll({
  filters: [
    { field: 'sh', operator: '==', value: 'CWS' }
  ],
  sorts: [
    { field: 'year', direction: 'desc' }
  ]
});
```

**SQL Equivalent**:
```sql
SELECT * FROM audit_results 
WHERE sh = 'CWS' 
ORDER BY year DESC
```

---

### 6. Get Only Findings (Exclude Non-Findings)

**Use Case**: "Show me only actual findings, not non-findings"

```typescript
const results = await auditResultService.getAll({
  filters: [
    { field: 'code', operator: '!=', value: '' }  // Non-empty code = Finding
  ],
  sorts: [
    { field: 'nilai', direction: 'desc' }
  ]
});
```

**SQL Equivalent**:
```sql
SELECT * FROM audit_results 
WHERE code != '' AND code IS NOT NULL
ORDER BY nilai DESC
```

---

### 7. Get Findings by Multiple Departments

**Use Case**: "Show me findings from IT, HR, and Finance departments"

```typescript
const results = await auditResultService.getAll({
  filters: [
    { field: 'department', operator: 'in', value: ['IT', 'HR', 'Finance'] }
  ],
  sorts: [
    { field: 'year', direction: 'desc' }
  ]
});
```

**SQL Equivalent**:
```sql
SELECT * FROM audit_results 
WHERE department IN ('IT', 'HR', 'Finance') 
ORDER BY year DESC
```

---

### 8. Get Recent Findings (Last 2 Years)

**Use Case**: "Show me findings from 2024 and 2025"

```typescript
const currentYear = new Date().getFullYear();

const results = await auditResultService.getAll({
  filters: [
    { field: 'year', operator: 'in', value: [currentYear, currentYear - 1] }
  ],
  sorts: [
    { field: 'year', direction: 'desc' },
    { field: 'nilai', direction: 'desc' }
  ]
});
```

**SQL Equivalent**:
```sql
SELECT * FROM audit_results 
WHERE year IN (2024, 2025) 
ORDER BY year DESC, nilai DESC
```

---

### 9. Get Findings by Department and Year (Composite Query)

**Use Case**: "Show me IT findings from 2025"

```typescript
const results = await auditResultService.getAll({
  filters: [
    { field: 'department', operator: '==', value: 'IT' },
    { field: 'year', operator: '==', value: 2025 }
  ],
  sorts: [
    { field: 'nilai', direction: 'desc' }
  ]
});
```

**SQL Equivalent**:
```sql
SELECT * FROM audit_results 
WHERE department = 'IT' AND year = 2025 
ORDER BY nilai DESC
```

**Note**: Requires composite index on `(department, year)`

---

### 10. Get Top 10 Highest Risk Findings

**Use Case**: "Show me the top 10 most critical findings"

```typescript
const results = await auditResultService.getAll({
  filters: [
    { field: 'code', operator: '!=', value: '' }  // Only findings
  ],
  sorts: [
    { field: 'nilai', direction: 'desc' }
  ],
  limit: 10
});
```

**SQL Equivalent**:
```sql
SELECT * FROM audit_results 
WHERE code != '' 
ORDER BY nilai DESC 
LIMIT 10
```

---

## Query Templates for DocAI Integration

### Template Structure

For LLM chatbot integration, use structured query templates that map natural language to Firestore queries:

```typescript
interface QueryTemplate {
  intent: string;              // User intent category
  patterns: string[];          // Natural language patterns
  filters: QueryFilter[];      // Firestore filters
  sorts: QuerySort[];          // Sort order
  limit?: number;              // Result limit
  description: string;         // Template description
}
```

### Template 1: Temporal Queries

```typescript
const temporalTemplate: QueryTemplate = {
  intent: 'temporal_query',
  patterns: [
    'findings from {year}',
    'audit results in {year}',
    '{year} findings',
    'show me {year} audits'
  ],
  filters: [
    { field: 'year', operator: '==', value: '{year}' }
  ],
  sorts: [
    { field: 'nilai', direction: 'desc' }
  ],
  description: 'Query findings by specific year'
};
```

**LLM Prompt**:
```
User: "Show me findings from 2025"
Extract: { year: 2025 }
Query: WHERE year == 2025 ORDER BY nilai DESC
```

---

### Template 2: Department Queries

```typescript
const departmentTemplate: QueryTemplate = {
  intent: 'department_query',
  patterns: [
    '{department} findings',
    'show me {department} department',
    'findings from {department}',
    '{department} audit results'
  ],
  filters: [
    { field: 'department', operator: '==', value: '{department}' }
  ],
  sorts: [
    { field: 'year', direction: 'desc' }
  ],
  description: 'Query findings by department'
};
```

**LLM Prompt**:
```
User: "Show me IT findings"
Extract: { department: "IT" }
Query: WHERE department == "IT" ORDER BY year DESC
```

---

### Template 3: Risk-Based Queries

```typescript
const riskTemplate: QueryTemplate = {
  intent: 'risk_query',
  patterns: [
    'critical findings',
    'high risk findings',
    'findings with nilai > {threshold}',
    'severe audit issues'
  ],
  filters: [
    { field: 'nilai', operator: '>', value: '{threshold}' }
  ],
  sorts: [
    { field: 'nilai', direction: 'desc' }
  ],
  description: 'Query high-risk findings'
};
```

**LLM Prompt**:
```
User: "Show me critical findings"
Extract: { threshold: 15 }  // Critical = nilai > 15
Query: WHERE nilai > 15 ORDER BY nilai DESC
```

---

### Template 4: Project-Specific Queries

```typescript
const projectTemplate: QueryTemplate = {
  intent: 'project_query',
  patterns: [
    'findings for {projectName}',
    '{projectName} audit results',
    'show me {projectName} findings'
  ],
  filters: [
    { field: 'projectName', operator: '==', value: '{projectName}' }
  ],
  sorts: [
    { field: 'year', direction: 'desc' }
  ],
  description: 'Query findings for specific project'
};
```

**LLM Prompt**:
```
User: "Show me findings for Grand Hotel Jakarta"
Extract: { projectName: "Grand Hotel Jakarta" }
Query: WHERE projectName == "Grand Hotel Jakarta" ORDER BY year DESC
```

---

### Template 5: Composite Queries (Department + Year)

```typescript
const compositeTemplate: QueryTemplate = {
  intent: 'composite_query',
  patterns: [
    '{department} findings in {year}',
    '{year} {department} audit results',
    'show me {department} findings from {year}'
  ],
  filters: [
    { field: 'department', operator: '==', value: '{department}' },
    { field: 'year', operator: '==', value: '{year}' }
  ],
  sorts: [
    { field: 'nilai', direction: 'desc' }
  ],
  description: 'Query findings by department and year'
};
```

**LLM Prompt**:
```
User: "Show me IT findings from 2025"
Extract: { department: "IT", year: 2025 }
Query: WHERE department == "IT" AND year == 2025 ORDER BY nilai DESC
```

---

### Template 6: Finding vs Non-Finding Queries

```typescript
const findingTypeTemplate: QueryTemplate = {
  intent: 'finding_type_query',
  patterns: [
    'only findings',
    'actual findings',
    'exclude non-findings',
    'show me real findings'
  ],
  filters: [
    { field: 'code', operator: '!=', value: '' }
  ],
  sorts: [
    { field: 'nilai', direction: 'desc' }
  ],
  description: 'Query only findings (exclude non-findings)'
};
```

**LLM Prompt**:
```
User: "Show me only actual findings"
Extract: { findingType: "finding" }
Query: WHERE code != "" ORDER BY nilai DESC
```

---

### Template 7: Multi-Department Queries

```typescript
const multiDepartmentTemplate: QueryTemplate = {
  intent: 'multi_department_query',
  patterns: [
    'findings from {dept1}, {dept2}, and {dept3}',
    '{dept1} and {dept2} findings',
    'show me {dept1}, {dept2} audit results'
  ],
  filters: [
    { field: 'department', operator: 'in', value: ['{dept1}', '{dept2}', '{dept3}'] }
  ],
  sorts: [
    { field: 'year', direction: 'desc' }
  ],
  description: 'Query findings from multiple departments'
};
```

**LLM Prompt**:
```
User: "Show me findings from IT, HR, and Finance"
Extract: { departments: ["IT", "HR", "Finance"] }
Query: WHERE department IN ["IT", "HR", "Finance"] ORDER BY year DESC
```

---

### Template 8: Top N Queries

```typescript
const topNTemplate: QueryTemplate = {
  intent: 'top_n_query',
  patterns: [
    'top {n} findings',
    'show me {n} most critical findings',
    '{n} highest risk findings'
  ],
  filters: [
    { field: 'code', operator: '!=', value: '' }
  ],
  sorts: [
    { field: 'nilai', direction: 'desc' }
  ],
  limit: '{n}',
  description: 'Query top N highest risk findings'
};
```

**LLM Prompt**:
```
User: "Show me top 10 findings"
Extract: { n: 10 }
Query: WHERE code != "" ORDER BY nilai DESC LIMIT 10
```

---

### Template 9: Subholding Queries

```typescript
const subholdingTemplate: QueryTemplate = {
  intent: 'subholding_query',
  patterns: [
    'findings for SH {sh}',
    '{sh} subholding findings',
    'show me {sh} audit results'
  ],
  filters: [
    { field: 'sh', operator: '==', value: '{sh}' }
  ],
  sorts: [
    { field: 'year', direction: 'desc' }
  ],
  description: 'Query findings by subholding code'
};
```

**LLM Prompt**:
```
User: "Show me findings for SH CWS"
Extract: { sh: "CWS" }
Query: WHERE sh == "CWS" ORDER BY year DESC
```

---

### Template 10: Text Search Queries

```typescript
const textSearchTemplate: QueryTemplate = {
  intent: 'text_search_query',
  patterns: [
    'findings about {keyword}',
    'search for {keyword}',
    'find {keyword} in findings'
  ],
  filters: [],  // Client-side filtering required
  sorts: [
    { field: 'year', direction: 'desc' }
  ],
  description: 'Text search in descriptions (client-side)'
};
```

**LLM Prompt**:
```
User: "Find findings about security"
Extract: { keyword: "security" }
Query: Get all, then filter client-side where descriptions contains "security"
```

**Note**: Firestore doesn't support full-text search natively. Use client-side filtering or integrate with Algolia/Elasticsearch for production.

---

## LLM Integration Pattern

### Step 1: Intent Recognition

```typescript
async function recognizeIntent(userQuery: string): Promise<RecognizedIntent> {
  const prompt = `
Analyze this user query and extract structured filters:

Query: "${userQuery}"

Available fields:
- year (number): Audit year
- department (string): IT, HR, Finance, Sales, etc.
- projectName (string): Project name
- sh (string): Subholding code
- nilai (number): Risk score (0-25)
- code (string): Finding code (empty = non-finding)

Return JSON:
{
  "intent": "department_query",
  "filters": {
    "department": "IT",
    "year": 2025
  },
  "requiresAnalysis": false
}
`;

  const response = await sendMessageToGemini(prompt, 'low');
  return JSON.parse(response);
}
```

### Step 2: Query Building

```typescript
function buildFirestoreQuery(intent: RecognizedIntent): QueryOptions {
  const filters: QueryFilter[] = [];
  const sorts: QuerySort[] = [];

  // Map intent filters to Firestore filters
  if (intent.filters.year) {
    filters.push({ field: 'year', operator: '==', value: intent.filters.year });
  }

  if (intent.filters.department) {
    filters.push({ field: 'department', operator: '==', value: intent.filters.department });
  }

  if (intent.filters.threshold) {
    filters.push({ field: 'nilai', operator: '>', value: intent.filters.threshold });
    sorts.push({ field: 'nilai', direction: 'desc' });
  }

  // Default sort
  if (sorts.length === 0) {
    sorts.push({ field: 'year', direction: 'desc' });
  }

  return { filters, sorts };
}
```

### Step 3: Query Execution

```typescript
async function executeQuery(queryOptions: QueryOptions): Promise<AuditResult[]> {
  return await auditResultService.getAll(queryOptions);
}
```

### Step 4: Response Formatting

```typescript
async function formatResponse(
  results: AuditResult[],
  userQuery: string
): Promise<string> {
  const context = results.map(r => 
    `${r.auditResultId}: ${r.descriptions} (Risk: ${r.nilai})`
  ).join('\n');

  const prompt = `
User asked: "${userQuery}"

Relevant findings:
${context}

Provide a natural language summary of these findings.
`;

  return await sendMessageToGemini(prompt, 'low');
}
```

---

## Best Practices

### 1. Use Composite Indexes

Always create composite indexes for multi-field queries:

```bash
# Deploy indexes
firebase deploy --only firestore:indexes
```

### 2. Limit Result Sets

Always use pagination for large result sets:

```typescript
const results = await auditResultService.getPaginated(
  { page: 1, pageSize: 50 },
  { filters, sorts }
);
```

### 3. Cache Common Queries

Cache frequently accessed data:

```typescript
import { cacheUtils } from '../utils/cacheUtils';

const cacheKey = `audit-results-${year}-${department}`;
let results = cacheUtils.get(cacheKey);

if (!results) {
  results = await auditResultService.getAll({ filters, sorts });
  cacheUtils.set(cacheKey, results, 300000); // 5 minutes
}
```

### 4. Handle Errors Gracefully

```typescript
try {
  const results = await auditResultService.getAll(queryOptions);
} catch (error) {
  if (error.code === 'permission-denied') {
    // Handle permission error
  } else if (error.code === 'unavailable') {
    // Retry with exponential backoff
  }
}
```

### 5. Use Client-Side Filtering for Text Search

Firestore doesn't support full-text search:

```typescript
const allResults = await auditResultService.getAll({ filters });

const filtered = allResults.filter(r =>
  r.descriptions.toLowerCase().includes(searchText.toLowerCase()) ||
  r.riskArea.toLowerCase().includes(searchText.toLowerCase())
);
```

---

## Performance Optimization

### 1. Index Strategy

- Create indexes for all common query patterns
- Monitor index usage in Firebase Console
- Remove unused indexes

### 2. Query Optimization

```typescript
// ❌ Bad: Multiple round trips
const itResults = await getByDepartment('IT');
const hrResults = await getByDepartment('HR');
const combined = [...itResults, ...hrResults];

// ✅ Good: Single query with IN operator
const results = await auditResultService.getAll({
  filters: [
    { field: 'department', operator: 'in', value: ['IT', 'HR'] }
  ]
});
```

### 3. Pagination

```typescript
// ✅ Use cursor-based pagination
const firstPage = await auditResultService.getPaginated(
  { page: 1, pageSize: 50 },
  queryOptions
);

const secondPage = await auditResultService.getPaginated(
  { page: 2, pageSize: 50 },
  queryOptions
);
```

### 4. Batch Operations

```typescript
// ✅ Batch reads for better performance
const batch = db.batch();
const refs = ids.map(id => db.collection('audit-results').doc(id));
refs.forEach(ref => batch.get(ref));
const results = await batch.commit();
```

---

## Related Documentation

- [DocAI Integration Guide](./DOCAI-README-2-TABLE.md)
- [Smart Query Router](./smart-query-router-v2-integration.md)
- [Database Service](../src/services/DatabaseService.ts)
- [Audit Result Service](../src/services/AuditResultService.ts)

---

**Last Updated**: December 8, 2025  
**Version**: 1.0.0


---

## Practical Implementation Example

### Complete DocAI Query Flow

Here's a complete example showing how to integrate Firebase queries with the DocAI chatbot:

```typescript
// src/services/DocAIQueryService.ts

import { auditResultService, AuditResult } from './AuditResultService';
import { sendMessageToGemini } from './GeminiService';
import { QueryFilter, QuerySort } from './DatabaseService';

/**
 * DocAI Query Service
 * Handles natural language queries and converts them to Firebase queries
 */
export class DocAIQueryService {
  
  /**
   * Process a natural language query
   */
  async processQuery(userQuery: string, sessionId: string): Promise<string> {
    console.log(`[DocAI] Processing query: "${userQuery}"`);
    
    // Step 1: Extract intent and filters using LLM
    const intent = await this.extractIntent(userQuery);
    console.log('[DocAI] Extracted intent:', intent);
    
    // Step 2: Build Firestore query
    const queryOptions = this.buildQuery(intent);
    console.log('[DocAI] Query options:', queryOptions);
    
    // Step 3: Execute query
    const results = await auditResultService.getAll(queryOptions);
    console.log(`[DocAI] Found ${results.length} results`);
    
    // Step 4: Format response with LLM
    const response = await this.formatResponse(userQuery, results, intent);
    
    return response;
  }
  
  /**
   * Extract intent and filters from natural language
   */
  private async extractIntent(userQuery: string): Promise<QueryIntent> {
    const prompt = `
You are a query analyzer for an audit findings database.

## Database Schema:
- year (number): Audit year (2020-2025)
- department (string): IT, HR, Finance, Sales, Procurement, Legal, Marketing
- projectName (string): Project name
- sh (string): Subholding code (e.g., CWS, CJK)
- nilai (number): Risk score (0-25, higher = more critical)
- code (string): Finding code (empty = non-finding)
- descriptions (string): Finding description
- riskArea (string): Risk area description

## User Query:
"${userQuery}"

## Task:
Analyze the query and extract structured filters. Return ONLY valid JSON:

\`\`\`json
{
  "intent": "department_query" | "temporal_query" | "risk_query" | "project_query" | "composite_query" | "text_search",
  "filters": {
    "year": 2025,
    "department": "IT",
    "projectName": "Grand Hotel Jakarta",
    "sh": "CWS",
    "minNilai": 15,
    "onlyFindings": true,
    "keywords": ["security", "access"]
  },
  "requiresAnalysis": false,
  "confidence": 0.9
}
\`\`\`

Rules:
- Extract year from "2025", "in 2025", "last year", "this year"
- Map "IT findings" → department: "IT"
- Map "critical" → minNilai: 15
- Map "high risk" → minNilai: 10
- Set onlyFindings: true if user says "only findings" or "actual findings"
- Extract keywords for text search
- Set requiresAnalysis: true if query asks for analysis, recommendations, or insights
`;

    const response = await sendMessageToGemini(prompt, 'low');
    
    // Parse JSON from response
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                     response.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr);
    }
    
    // Fallback
    return {
      intent: 'text_search',
      filters: { keywords: [userQuery] },
      requiresAnalysis: true,
      confidence: 0.3
    };
  }
  
  /**
   * Build Firestore query from intent
   */
  private buildQuery(intent: QueryIntent): { filters: QueryFilter[], sorts: QuerySort[] } {
    const filters: QueryFilter[] = [];
    const sorts: QuerySort[] = [];
    
    // Year filter
    if (intent.filters.year) {
      filters.push({
        field: 'year',
        operator: '==',
        value: intent.filters.year
      });
    }
    
    // Department filter
    if (intent.filters.department) {
      filters.push({
        field: 'department',
        operator: '==',
        value: intent.filters.department
      });
    }
    
    // Project filter
    if (intent.filters.projectName) {
      filters.push({
        field: 'projectName',
        operator: '==',
        value: intent.filters.projectName
      });
    }
    
    // Subholding filter
    if (intent.filters.sh) {
      filters.push({
        field: 'sh',
        operator: '==',
        value: intent.filters.sh
      });
    }
    
    // Risk score filter
    if (intent.filters.minNilai) {
      filters.push({
        field: 'nilai',
        operator: '>=',
        value: intent.filters.minNilai
      });
      // Must order by inequality field first
      sorts.push({
        field: 'nilai',
        direction: 'desc'
      });
    }
    
    // Only findings filter
    if (intent.filters.onlyFindings) {
      filters.push({
        field: 'code',
        operator: '!=',
        value: ''
      });
    }
    
    // Default sort if no inequality sort
    if (sorts.length === 0) {
      sorts.push({
        field: 'year',
        direction: 'desc'
      });
    }
    
    return { filters, sorts };
  }
  
  /**
   * Format response using LLM
   */
  private async formatResponse(
    userQuery: string,
    results: AuditResult[],
    intent: QueryIntent
  ): Promise<string> {
    // Handle empty results
    if (results.length === 0) {
      return this.formatEmptyResponse(intent);
    }
    
    // Client-side keyword filtering if needed
    let filteredResults = results;
    if (intent.filters.keywords && intent.filters.keywords.length > 0) {
      const keywords = intent.filters.keywords.map(k => k.toLowerCase());
      filteredResults = results.filter(r => {
        const searchText = `${r.descriptions} ${r.riskArea}`.toLowerCase();
        return keywords.some(keyword => searchText.includes(keyword));
      });
    }
    
    // If still no results after keyword filtering
    if (filteredResults.length === 0) {
      return `No findings match your search criteria. Found ${results.length} results before keyword filtering, but none contained: ${intent.filters.keywords?.join(', ')}`;
    }
    
    // Build context for LLM
    const context = this.buildContext(filteredResults);
    
    // Simple response for non-analytical queries
    if (!intent.requiresAnalysis) {
      return this.formatSimpleResponse(filteredResults, intent);
    }
    
    // AI-powered analysis for complex queries
    const prompt = `
You are an audit findings analyst. Provide a comprehensive answer to the user's query.

## User Query:
"${userQuery}"

## Findings Data:
${context}

## Task:
Analyze the findings and provide:
1. Summary of key findings
2. Risk assessment
3. Patterns or trends (if applicable)
4. Recommendations (if applicable)

Be specific and reference actual findings by their ID.
`;

    return await sendMessageToGemini(prompt, 'medium');
  }
  
  /**
   * Build context string from results
   */
  private buildContext(results: AuditResult[]): string {
    // Limit to top 20 for context window
    const topResults = results.slice(0, 20);
    
    return topResults.map((r, idx) => {
      return `
${idx + 1}. ${r.auditResultId}
   Project: ${r.projectName}
   Department: ${r.department}
   Year: ${r.year}
   Risk Score: ${r.nilai}/25 (Bobot: ${r.bobot}, Kadar: ${r.kadar})
   Risk Area: ${r.riskArea}
   Description: ${r.descriptions}
   Type: ${r.code ? 'Finding' : 'Non-Finding'}
`;
    }).join('\n---\n');
  }
  
  /**
   * Format simple response without AI analysis
   */
  private formatSimpleResponse(results: AuditResult[], intent: QueryIntent): string {
    const count = results.length;
    const avgNilai = results.reduce((sum, r) => sum + r.nilai, 0) / count;
    const maxNilai = Math.max(...results.map(r => r.nilai));
    
    let response = `Found ${count} audit result(s).\n\n`;
    
    // Add statistics
    response += `📊 Statistics:\n`;
    response += `- Average Risk Score: ${avgNilai.toFixed(2)}/25\n`;
    response += `- Highest Risk Score: ${maxNilai}/25\n`;
    
    // Add filters applied
    if (intent.filters.year) {
      response += `- Year: ${intent.filters.year}\n`;
    }
    if (intent.filters.department) {
      response += `- Department: ${intent.filters.department}\n`;
    }
    
    response += `\n📋 Top Results:\n\n`;
    
    // Show top 5 results
    const topResults = results.slice(0, 5);
    topResults.forEach((r, idx) => {
      response += `${idx + 1}. **${r.auditResultId}** (Risk: ${r.nilai}/25)\n`;
      response += `   ${r.descriptions.substring(0, 100)}...\n`;
      response += `   Project: ${r.projectName} | Dept: ${r.department} | Year: ${r.year}\n\n`;
    });
    
    if (results.length > 5) {
      response += `... and ${results.length - 5} more results.\n`;
    }
    
    return response;
  }
  
  /**
   * Format empty response
   */
  private formatEmptyResponse(intent: QueryIntent): string {
    let response = 'No audit results found matching your criteria.\n\n';
    
    response += '💡 Suggestions:\n';
    response += '- Try broadening your search (e.g., remove year filter)\n';
    response += '- Check spelling of department or project names\n';
    response += '- Try different keywords\n';
    
    if (intent.filters.year) {
      response += `- Try a different year (you searched for ${intent.filters.year})\n`;
    }
    
    return response;
  }
}

// Export singleton
export const docAIQueryService = new DocAIQueryService();

// Type definitions
interface QueryIntent {
  intent: string;
  filters: {
    year?: number;
    department?: string;
    projectName?: string;
    sh?: string;
    minNilai?: number;
    onlyFindings?: boolean;
    keywords?: string[];
  };
  requiresAnalysis: boolean;
  confidence: number;
}
```

### Usage in DocAI Chat

```typescript
// src/services/DocChatService.ts

import { docAIQueryService } from './DocAIQueryService';

export class DocChatService {
  async processMessage(
    sessionId: string,
    userId: string,
    message: string
  ): Promise<string> {
    try {
      // Process query using DocAI Query Service
      const response = await docAIQueryService.processQuery(message, sessionId);
      
      // Save to chat history
      await this.saveChatMessage(sessionId, userId, message, response);
      
      return response;
    } catch (error) {
      console.error('[DocChat] Error processing message:', error);
      return 'Sorry, I encountered an error processing your query. Please try again.';
    }
  }
  
  private async saveChatMessage(
    sessionId: string,
    userId: string,
    userMessage: string,
    aiResponse: string
  ): Promise<void> {
    // Save user message
    await docChatHistoryService.addMessage(sessionId, {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      userId
    });
    
    // Save AI response
    await docChatHistoryService.addMessage(sessionId, {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
      userId
    });
  }
}
```

### Example Conversations

#### Example 1: Simple Department Query

```
User: "Show me IT findings from 2025"

[DocAI Processing]
1. Extract Intent:
   {
     "intent": "composite_query",
     "filters": { "department": "IT", "year": 2025 },
     "requiresAnalysis": false,
     "confidence": 0.95
   }

2. Build Query:
   WHERE department == "IT" AND year == 2025
   ORDER BY year DESC

3. Execute: Found 47 results

4. Format Response:
   "Found 47 audit results.
   
   📊 Statistics:
   - Average Risk Score: 8.3/25
   - Highest Risk Score: 18/25
   - Year: 2025
   - Department: IT
   
   📋 Top Results:
   
   1. **CWSITF01** (Risk: 18/25)
      Inadequate access control for production database...
      Project: Citra World Surabaya | Dept: IT | Year: 2025
   
   2. **CWSITF02** (Risk: 15/25)
      Missing backup procedures for critical systems...
      Project: Citra World Surabaya | Dept: IT | Year: 2025
   
   ... and 45 more results."
```

#### Example 2: Risk Analysis Query

```
User: "What are the most critical findings and what should we prioritize?"

[DocAI Processing]
1. Extract Intent:
   {
     "intent": "risk_query",
     "filters": { "minNilai": 15, "onlyFindings": true },
     "requiresAnalysis": true,
     "confidence": 0.88
   }

2. Build Query:
   WHERE nilai >= 15 AND code != ""
   ORDER BY nilai DESC

3. Execute: Found 23 results

4. AI Analysis:
   "Based on the 23 critical findings (risk score ≥ 15), here's my analysis:
   
   🔴 **Highest Priority Issues:**
   
   1. **CWSITF01** (Risk: 18/25) - Access Control
      - Inadequate access control for production database
      - Recommendation: Implement role-based access control immediately
   
   2. **CJKFINF03** (Risk: 17/25) - Financial Controls
      - Missing segregation of duties in payment approval
      - Recommendation: Separate approval and execution roles
   
   📊 **Risk Distribution:**
   - IT Department: 8 critical findings (35%)
   - Finance Department: 7 critical findings (30%)
   - HR Department: 5 critical findings (22%)
   - Others: 3 critical findings (13%)
   
   🎯 **Prioritization Recommendations:**
   1. Address all IT access control issues first (highest risk)
   2. Implement financial segregation of duties
   3. Review HR data protection measures
   4. Schedule follow-up audits in 3 months
   
   💡 **Common Patterns:**
   - 60% of critical findings relate to access control
   - Most issues found in projects from 2024-2025
   - Recurring themes: inadequate documentation, missing approvals"
```

#### Example 3: Project-Specific Query

```
User: "Tell me about findings in Grand Hotel Jakarta"

[DocAI Processing]
1. Extract Intent:
   {
     "intent": "project_query",
     "filters": { "projectName": "Grand Hotel Jakarta" },
     "requiresAnalysis": true,
     "confidence": 0.92
   }

2. Build Query:
   WHERE projectName == "Grand Hotel Jakarta"
   ORDER BY year DESC

3. Execute: Found 12 results

4. AI Analysis:
   "Grand Hotel Jakarta has 12 audit findings across 2024-2025:
   
   📊 **Overview:**
   - Total Findings: 12
   - Average Risk Score: 9.2/25
   - Highest Risk: 16/25
   - Departments Affected: IT (4), Finance (3), Operations (3), HR (2)
   
   🔴 **Critical Issues (Risk ≥ 15):**
   1. **GHJITF01** - Inadequate network security controls
   2. **GHJFINF01** - Missing invoice approval workflow
   
   🟡 **Medium Risk Issues (Risk 10-14):**
   - 5 findings related to documentation gaps
   - 2 findings related to training requirements
   
   🟢 **Low Risk Issues (Risk < 10):**
   - 3 findings related to minor process improvements
   
   💡 **Recommendations:**
   1. Prioritize network security upgrade (GHJITF01)
   2. Implement automated invoice approval system
   3. Conduct staff training on documentation standards
   4. Schedule follow-up audit in Q2 2025"
```

---

## Query Performance Benchmarks

Based on testing with production data:

| Query Type | Avg Response Time | Results | Notes |
|------------|------------------|---------|-------|
| Simple (1 filter) | 150ms | 50-100 | Direct index lookup |
| Composite (2 filters) | 200ms | 20-50 | Composite index required |
| Risk-based (inequality) | 180ms | 10-30 | Sorted by nilai |
| Text search (client-side) | 500ms | 5-20 | Full scan + filter |
| AI Analysis | 2-4s | N/A | Includes LLM processing |

### Optimization Tips

1. **Use Composite Indexes**: Pre-create indexes for common query patterns
2. **Limit Result Sets**: Use pagination for queries returning >50 results
3. **Cache Common Queries**: Cache department/year combinations
4. **Batch AI Requests**: Process multiple queries in parallel when possible
5. **Client-Side Filtering**: Use for text search to avoid full-text search service

---

## Troubleshooting

### Issue: "Missing Index" Error

**Problem**: Query fails with "The query requires an index"

**Solution**:
```bash
# Copy the index URL from error message
# Add to firestore.indexes.json
# Deploy indexes
firebase deploy --only firestore:indexes
```

### Issue: Slow Query Performance

**Problem**: Queries taking >1 second

**Solutions**:
1. Check if composite index exists
2. Reduce result set size with filters
3. Use pagination
4. Enable query caching

### Issue: No Results Found

**Problem**: Query returns empty array unexpectedly

**Solutions**:
1. Check filter values (case-sensitive)
2. Verify data exists in Firestore Console
3. Check Firestore Rules permissions
4. Use broader filters (remove year filter)

### Issue: LLM Extraction Errors

**Problem**: Intent extraction returns invalid JSON

**Solutions**:
1. Add more examples to prompt
2. Use structured output format
3. Implement fallback pattern matching
4. Validate extracted values before querying

---

## Next Steps

1. **Implement Semantic Search**: Integrate vector embeddings for better text search
2. **Add Query Caching**: Cache common queries for faster response
3. **Create Query Analytics**: Track popular queries and optimize indexes
4. **Build Query Suggestions**: Suggest related queries based on history
5. **Implement Query Validation**: Validate queries before execution

---

**Related Files**:
- Implementation: `src/services/DocAIQueryService.ts` (create this file)
- Database Service: `src/services/DatabaseService.ts`
- Audit Service: `src/services/AuditResultService.ts`
- Smart Query Router: `src/services/SmartQueryRouter.ts`

---

**End of Document**
