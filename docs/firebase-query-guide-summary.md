# Firebase Query Guide - Quick Summary

## Document Overview

The **Firebase Query Guide** (`firebase-query-guide.md`) is a comprehensive resource for understanding and implementing Firebase Firestore queries in the FIRST-AID audit database system.

## What's Included

### 1. **Firebase Query Fundamentals** 📚
- How Firestore queries work
- Query operators (==, !=, <, >, in, array-contains, etc.)
- Query constraints and limitations
- Composite index requirements

### 2. **Database Schema** 🗄️
- Complete `audit-results` collection structure
- Field descriptions and data types
- Unique ID format: `[ProjectInitial]-[Dept3]-[F/NF]-[Count]`
- Example: `CWSACCF01` = Citra World Surabaya - Accounting - Finding - 01

### 3. **10 Common Query Examples** 🔍

| # | Query Type | Use Case | Key Fields |
|---|------------|----------|------------|
| 1 | Temporal | "Show me 2025 findings" | `year` |
| 2 | Department | "Show me IT findings" | `department` |
| 3 | Risk-Based | "Show me critical findings" | `nilai > 15` |
| 4 | Project | "Show me Grand Hotel findings" | `projectName` |
| 5 | Subholding | "Show me SH CWS findings" | `sh` |
| 6 | Finding Type | "Only actual findings" | `code != ''` |
| 7 | Multi-Department | "IT, HR, Finance findings" | `department in [...]` |
| 8 | Recent | "Last 2 years findings" | `year in [2024, 2025]` |
| 9 | Composite | "IT findings from 2025" | `department + year` |
| 10 | Top N | "Top 10 critical findings" | `nilai DESC LIMIT 10` |

### 4. **Query Templates for DocAI** 🤖

10 ready-to-use templates for LLM integration:
- Temporal queries
- Department queries
- Risk-based queries
- Project-specific queries
- Composite queries
- Finding vs non-finding queries
- Multi-department queries
- Top N queries
- Subholding queries
- Text search queries

### 5. **LLM Integration Pattern** 🧠

Complete 4-step flow:
1. **Intent Recognition** - Extract filters from natural language
2. **Query Building** - Convert to Firestore query
3. **Query Execution** - Fetch results from database
4. **Response Formatting** - Format with AI analysis

### 6. **Practical Implementation** 💻

Full working example of `DocAIQueryService` with:
- Intent extraction using Gemini
- Query building logic
- Result formatting
- Error handling
- Example conversations

### 7. **Performance & Optimization** ⚡

- Query performance benchmarks
- Optimization tips
- Caching strategies
- Index management
- Troubleshooting guide

## Quick Start

### For Developers

```typescript
// 1. Import the service
import { auditResultService } from './services/AuditResultService';

// 2. Build a query
const results = await auditResultService.getAll({
  filters: [
    { field: 'department', operator: '==', value: 'IT' },
    { field: 'year', operator: '==', value: 2025 }
  ],
  sorts: [
    { field: 'nilai', direction: 'desc' }
  ]
});

// 3. Use the results
console.log(`Found ${results.length} IT findings from 2025`);
```

### For DocAI Integration

```typescript
// Use the DocAIQueryService (see implementation in guide)
import { docAIQueryService } from './services/DocAIQueryService';

const response = await docAIQueryService.processQuery(
  "Show me critical IT findings from 2025",
  sessionId
);
```

## Key Concepts

### Risk Score (nilai)
- **Formula**: `nilai = bobot × kadar`
- **Range**: 0-25
- **Critical**: nilai ≥ 15
- **High**: nilai ≥ 10
- **Medium**: nilai ≥ 5
- **Low**: nilai < 5

### Finding vs Non-Finding
- **Finding**: `code != ''` (has a finding code)
- **Non-Finding**: `code == ''` (empty code)

### Composite Indexes
Required for queries with multiple filters:
```json
{
  "fields": [
    { "fieldPath": "department", "order": "ASCENDING" },
    { "fieldPath": "year", "order": "DESCENDING" }
  ]
}
```

## Common Patterns

### Pattern 1: Department + Year
```typescript
WHERE department == "IT" AND year == 2025
ORDER BY nilai DESC
```

### Pattern 2: High Risk Findings
```typescript
WHERE nilai >= 15 AND code != ""
ORDER BY nilai DESC
```

### Pattern 3: Recent Findings
```typescript
WHERE year IN [2024, 2025]
ORDER BY year DESC, nilai DESC
```

## Performance Tips

1. ✅ **Use composite indexes** for multi-field queries
2. ✅ **Limit result sets** with pagination (50 items/page)
3. ✅ **Cache common queries** (5-minute TTL)
4. ✅ **Client-side text search** (Firestore doesn't support full-text)
5. ✅ **Batch operations** for multiple document reads

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Missing Index Error | Deploy indexes: `firebase deploy --only firestore:indexes` |
| Slow Queries | Add composite index, use pagination, enable caching |
| No Results | Check case-sensitivity, verify data exists, check permissions |
| LLM Extraction Errors | Add more examples to prompt, implement fallback patterns |

## Example Use Cases

### Use Case 1: Audit Dashboard
```typescript
// Get statistics for dashboard
const criticalFindings = await auditResultService.getAll({
  filters: [
    { field: 'nilai', operator: '>=', value: 15 },
    { field: 'year', operator: '==', value: 2025 }
  ]
});

const stats = {
  total: criticalFindings.length,
  avgRisk: criticalFindings.reduce((sum, f) => sum + f.nilai, 0) / criticalFindings.length,
  departments: [...new Set(criticalFindings.map(f => f.department))]
};
```

### Use Case 2: Department Report
```typescript
// Generate department report
const itFindings = await auditResultService.getAuditResultsByDepartment('IT');

const report = {
  department: 'IT',
  totalFindings: itFindings.length,
  criticalCount: itFindings.filter(f => f.nilai >= 15).length,
  avgRisk: itFindings.reduce((sum, f) => sum + f.nilai, 0) / itFindings.length,
  topRisks: itFindings.sort((a, b) => b.nilai - a.nilai).slice(0, 5)
};
```

### Use Case 3: AI-Powered Analysis
```typescript
// Get AI analysis of findings
const response = await docAIQueryService.processQuery(
  "What are the common patterns in IT findings and what should we prioritize?",
  sessionId
);

// Response includes:
// - Summary of findings
// - Risk assessment
// - Pattern analysis
// - Prioritization recommendations
```

## Related Documentation

- **Main Guide**: [firebase-query-guide.md](./firebase-query-guide.md)
- **DocAI Integration**: [DOCAI-README-2-TABLE.md](./DOCAI-README-2-TABLE.md)
- **Smart Query Router**: [smart-query-router-v2-integration.md](./smart-query-router-v2-integration.md)
- **Database Service**: [../src/services/DatabaseService.ts](../src/services/DatabaseService.ts)

## Next Steps

1. 📖 Read the full guide: `docs/firebase-query-guide.md`
2. 🔧 Implement `DocAIQueryService` using the provided example
3. 🧪 Test queries with your data
4. 📊 Monitor query performance
5. 🚀 Deploy composite indexes

---

**Quick Links**:
- [Full Guide](./firebase-query-guide.md)
- [Database Schema](#database-schema)
- [Query Examples](#10-common-query-examples)
- [LLM Integration](#llm-integration-pattern)
- [Implementation Example](#practical-implementation)

---

**Last Updated**: December 8, 2025  
**Version**: 1.0.0
