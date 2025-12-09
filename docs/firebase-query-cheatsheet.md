# Firebase Query Cheat Sheet

Quick reference for Firebase Firestore queries in the FIRST-AID system.

---

## 🔥 Quick Syntax

### Basic Query
```typescript
const results = await auditResultService.getAll({
  filters: [{ field: 'year', operator: '==', value: 2025 }],
  sorts: [{ field: 'nilai', direction: 'desc' }]
});
```

### Operators
| Operator | Symbol | Example |
|----------|--------|---------|
| Equal | `==` | `'year', '==', 2025` |
| Not Equal | `!=` | `'code', '!=', ''` |
| Greater Than | `>` | `'nilai', '>', 15` |
| Greater or Equal | `>=` | `'nilai', '>=', 10` |
| Less Than | `<` | `'bobot', '<', 3` |
| Less or Equal | `<=` | `'kadar', '<=', 5` |
| In Array | `in` | `'dept', 'in', ['IT', 'HR']` |
| Not In | `not-in` | `'code', 'not-in', ['', null]` |

---

## 📊 Common Queries

### By Year
```typescript
// 2025 findings
{ field: 'year', operator: '==', value: 2025 }
```

### By Department
```typescript
// IT department
{ field: 'department', operator: '==', value: 'IT' }
```

### By Risk Score
```typescript
// Critical (nilai >= 15)
{ field: 'nilai', operator: '>=', value: 15 }
```

### By Project
```typescript
// Specific project
{ field: 'projectName', operator: '==', value: 'Grand Hotel Jakarta' }
```

### Only Findings
```typescript
// Exclude non-findings
{ field: 'code', operator: '!=', value: '' }
```

### Multiple Departments
```typescript
// IT, HR, Finance
{ field: 'department', operator: 'in', value: ['IT', 'HR', 'Finance'] }
```

---

## 🎯 Query Patterns

### Pattern 1: Department + Year
```typescript
filters: [
  { field: 'department', operator: '==', value: 'IT' },
  { field: 'year', operator: '==', value: 2025 }
],
sorts: [{ field: 'nilai', direction: 'desc' }]
```

### Pattern 2: High Risk Only
```typescript
filters: [
  { field: 'nilai', operator: '>=', value: 15 },
  { field: 'code', operator: '!=', value: '' }
],
sorts: [{ field: 'nilai', direction: 'desc' }]
```

### Pattern 3: Recent Findings
```typescript
filters: [
  { field: 'year', operator: 'in', value: [2024, 2025] }
],
sorts: [
  { field: 'year', direction: 'desc' },
  { field: 'nilai', direction: 'desc' }
]
```

### Pattern 4: Top N
```typescript
filters: [
  { field: 'code', operator: '!=', value: '' }
],
sorts: [{ field: 'nilai', direction: 'desc' }],
limit: 10
```

---

## 🗄️ Database Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `auditResultId` | string | Unique ID | `CWSACCF01` |
| `year` | number | Audit year | `2025` |
| `sh` | string | Subholding code | `CWS` |
| `projectName` | string | Project name | `Grand Hotel Jakarta` |
| `projectId` | string | Project reference | `proj_123` |
| `department` | string | Department | `IT` |
| `riskArea` | string | Risk area | `Access Control` |
| `descriptions` | string | Description | `Inadequate access...` |
| `code` | string | Finding code | `F01` or `''` |
| `bobot` | number | Weight (0-5) | `3` |
| `kadar` | number | Severity (0-5) | `5` |
| `nilai` | number | Risk score (0-25) | `15` |

---

## 🎨 Risk Levels

| Level | Nilai Range | Color | Priority |
|-------|-------------|-------|----------|
| Critical | ≥ 15 | 🔴 Red | Urgent |
| High | 10-14 | 🟠 Orange | High |
| Medium | 5-9 | 🟡 Yellow | Medium |
| Low | < 5 | 🟢 Green | Low |

---

## 🔍 LLM Query Templates

### Template: Temporal
```
User: "Show me 2025 findings"
Extract: { year: 2025 }
Query: WHERE year == 2025
```

### Template: Department
```
User: "IT findings"
Extract: { department: "IT" }
Query: WHERE department == "IT"
```

### Template: Risk
```
User: "Critical findings"
Extract: { minNilai: 15 }
Query: WHERE nilai >= 15
```

### Template: Composite
```
User: "IT findings from 2025"
Extract: { department: "IT", year: 2025 }
Query: WHERE department == "IT" AND year == 2025
```

---

## ⚡ Performance Tips

### ✅ DO
- Use composite indexes for multi-field queries
- Limit results to 50 per page
- Cache common queries (5 min TTL)
- Use `in` operator for multiple values (max 10)
- Order by indexed fields

### ❌ DON'T
- Query without indexes
- Return >100 results without pagination
- Use multiple inequality operators
- Perform full collection scans
- Use client-side filtering for large datasets

---

## 🛠️ Common Code Snippets

### Get All Findings
```typescript
const findings = await auditResultService.getAll({
  filters: [{ field: 'code', operator: '!=', value: '' }],
  sorts: [{ field: 'nilai', direction: 'desc' }]
});
```

### Get by Department
```typescript
const itFindings = await auditResultService.getAuditResultsByDepartment('IT');
```

### Get by Year
```typescript
const findings2025 = await auditResultService.getAuditResultsByYear(2025);
```

### Get by Project
```typescript
const projectFindings = await auditResultService.getAuditResultsByProject('Grand Hotel Jakarta');
```

### Get High Risk
```typescript
const critical = await auditResultService.getAll({
  filters: [{ field: 'nilai', operator: '>=', value: 15 }],
  sorts: [{ field: 'nilai', direction: 'desc' }]
});
```

### Paginated Query
```typescript
const page1 = await auditResultService.getPaginated(
  { page: 1, pageSize: 50 },
  { filters, sorts }
);
```

---

## 🔧 Troubleshooting

### Error: Missing Index
```bash
# Copy index URL from error
# Add to firestore.indexes.json
# Deploy
firebase deploy --only firestore:indexes
```

### Error: Permission Denied
```typescript
// Check Firestore Rules
// Verify user authentication
// Check field-level permissions
```

### Error: No Results
```typescript
// Check filter values (case-sensitive)
// Verify data exists in Firestore Console
// Try broader filters
// Check for typos in field names
```

### Slow Query
```typescript
// Add composite index
// Reduce result set size
// Enable caching
// Use pagination
```

---

## 📝 Index Examples

### Single Field Index
```json
{
  "collectionGroup": "audit-results",
  "fields": [
    { "fieldPath": "year", "order": "DESCENDING" }
  ]
}
```

### Composite Index
```json
{
  "collectionGroup": "audit-results",
  "fields": [
    { "fieldPath": "department", "order": "ASCENDING" },
    { "fieldPath": "year", "order": "DESCENDING" }
  ]
}
```

### Complex Composite
```json
{
  "collectionGroup": "audit-results",
  "fields": [
    { "fieldPath": "sh", "order": "ASCENDING" },
    { "fieldPath": "projectName", "order": "ASCENDING" },
    { "fieldPath": "year", "order": "DESCENDING" }
  ]
}
```

---

## 🎯 Query Decision Tree

```
Has Analysis Keywords? (recommend, analyze, etc.)
├─ YES → Complex or Hybrid Query
│   └─ Has Filters?
│       ├─ YES → Hybrid (Filter + AI)
│       └─ NO → Complex (AI Only)
└─ NO → Simple Query
    └─ Direct Database Lookup
```

---

## 📊 Performance Benchmarks

| Query Type | Avg Time | Notes |
|------------|----------|-------|
| Simple (1 filter) | 150ms | Direct index lookup |
| Composite (2 filters) | 200ms | Composite index required |
| Inequality | 180ms | Must orderBy inequality field |
| Text search | 500ms | Client-side filtering |
| AI Analysis | 2-4s | Includes LLM processing |

---

## 🔗 Quick Links

- [Full Guide](./firebase-query-guide.md)
- [Summary](./firebase-query-guide-summary.md)
- [Flow Diagrams](./firebase-query-flow-diagram.md)
- [Database Schema](./docai-database-schema.md)

---

## 💡 Pro Tips

1. **Always use indexes** for production queries
2. **Cache frequently accessed data** (5-10 min TTL)
3. **Paginate large result sets** (50 items/page)
4. **Use `in` operator** for multiple values (max 10)
5. **Order by indexed fields** for better performance
6. **Monitor query performance** in Firebase Console
7. **Use client-side filtering** for text search
8. **Batch AI requests** when possible
9. **Validate inputs** before querying
10. **Log query patterns** for optimization

---

**Last Updated**: December 8, 2025  
**Version**: 1.0.0
