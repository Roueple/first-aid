# DocAI Data Types and Query Conventions

## Overview

This document defines the permanent data type conventions for DocAI queries to ensure consistency between the application code and Firestore database schema.

## Critical Data Type Rules

### 1. Year Field - ALWAYS STRING

**Database Schema**: The `year` field in `audit-results` collection is stored as a **STRING** (e.g., "2024", "2023", "2022").

**Why**: Historical data was imported with year as string, and changing it would require a full database migration.

**Implementation**:

```typescript
// ✅ CORRECT - Year as string
export interface AuditResult {
  year: string; // "2024", not 2024
  // ... other fields
}

// ✅ CORRECT - Query with string
filters: [{ field: 'year', operator: '==', value: "2024" }]

// ❌ WRONG - Query with number
filters: [{ field: 'year', operator: '==', value: 2024 }]
```

**Files Updated**:
- `src/services/AuditResultService.ts` - Interface and methods
- `src/services/queryPatterns.ts` - All year parameter extractors
- `src/services/DocAIFilterService.ts` - FilterIntent interface

### 2. Department Filter - ALWAYS JOIN WITH DEPARTMENTS TABLE

**Database Schema**: The `department` field in `audit-results` contains the **original department name** as entered (e.g., "Manajemen Risiko Teknologi Informasi dan Keamanan Informasi").

**Why**: Department names are not normalized in audit-results. We need to join with the `departments` collection to:
1. Map user queries (e.g., "IT") to all possible original names
2. Support department categories (IT, HR, Finance, etc.)
3. Handle variations in department naming

**Implementation**:

```typescript
// ✅ CORRECT - Join with departments table
const departments = await departmentService.searchByName("IT");
const originalNames = departments.flatMap(d => d.originalNames);

// Query for each original name
for (const name of originalNames) {
  filters.push({ field: 'department', operator: '==', value: name });
}

// ❌ WRONG - Direct query without normalization
filters: [{ field: 'department', operator: '==', value: "IT" }]
```

**Files Implementing This**:
- `src/services/SimpleQueryExecutor.ts` - `normalizeDepartmentFilter()` method
- `src/services/DocAIFilterService.ts` - Department expansion logic

## Query Pattern Examples

### Example 1: "show all IT findings 2024"

**Pattern Match**: `composite-show-all-dept-findings-year`

**Extracted Parameters**:
```typescript
{
  department: "IT",
  year: "2024"  // STRING, not number
}
```

**Query Execution**:
1. Normalize "IT" → Get all original department names with category "IT"
   - Result: ["Manajemen Risiko Teknologi Informasi dan Keamanan Informasi", "IT", "ICT", ...]
2. Query Firestore:
   ```typescript
   filters: [
     { field: 'year', operator: '==', value: "2024" },
     { field: 'department', operator: '==', value: "Manajemen Risiko..." }
   ]
   ```
3. Repeat for each department name
4. Merge and sort results

### Example 2: "2024 findings"

**Pattern Match**: `temporal-year-prefix`

**Extracted Parameters**:
```typescript
{
  year: "2024"  // STRING
}
```

**Query Execution**:
```typescript
filters: [
  { field: 'year', operator: '==', value: "2024" }
]
```

## Testing Queries

### Test Query: IT Findings 2024

**Expected Results**: 6 findings from Asuransi Ciputra Life

**Query Variations** (all should work):
- "show all IT findings 2024"
- "IT findings 2024"
- "show IT findings in 2024"
- "2024 IT findings"

**Verification Script**:
```bash
node scripts/test-docai-it-findings.mjs
```

## Common Pitfalls

### ❌ Pitfall 1: Using Number for Year

```typescript
// WRONG
{ field: 'year', operator: '==', value: 2024 }

// This will return 0 results because Firestore compares:
// "2024" (string in DB) !== 2024 (number in query)
```

### ❌ Pitfall 2: Direct Department Query

```typescript
// WRONG - Will miss most results
{ field: 'department', operator: '==', value: "IT" }

// Only finds records where department field is exactly "IT"
// Misses "Manajemen Risiko Teknologi Informasi...", "ICT", etc.
```

### ❌ Pitfall 3: Forgetting Department Normalization

```typescript
// WRONG
const results = await auditResultService.getAll({
  filters: [
    { field: 'year', operator: '==', value: "2024" },
    { field: 'department', operator: '==', value: "IT" }
  ]
});

// RIGHT
const deptNames = await normalizeDepartmentFilter("IT");
const allResults = [];
for (const name of deptNames) {
  const results = await auditResultService.getAll({
    filters: [
      { field: 'year', operator: '==', value: "2024" },
      { field: 'department', operator: '==', value: name }
    ]
  });
  allResults.push(...results);
}
```

## Database Statistics (as of Dec 2024)

- **Total audit results 2024**: 3,029
- **IT findings 2024**: 6 (0.2%)
- **Department categories**: 9 (IT, HR, Finance, etc.)
- **Unique department names**: 52
- **IT department variations**: 6 different names

## Migration Notes

If you need to change the year field to number in the future:

1. Create a migration script to update all documents
2. Update all query patterns
3. Update the AuditResult interface
4. Run comprehensive tests
5. Update this documentation

**Estimated effort**: 2-3 hours + testing

**Risk**: High - affects all year-based queries

**Recommendation**: Keep as string unless there's a compelling reason to change.

## Related Files

- `src/services/AuditResultService.ts` - Core data types
- `src/services/queryPatterns.ts` - Query pattern definitions
- `src/services/SimpleQueryExecutor.ts` - Query execution logic
- `src/services/DocAIFilterService.ts` - Filter mode logic
- `src/services/DepartmentService.ts` - Department normalization
- `docs/department-normalization.md` - Department mapping details
- `scripts/test-docai-it-findings.mjs` - Test script for verification

## Version History

- **2024-12-08**: Initial documentation
  - Defined year as string convention
  - Documented department join requirement
  - Added IT findings 2024 test case
