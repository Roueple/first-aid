# DocAI Department Integration

## Overview

This document describes the integration between DocAI simple queries and the department normalization table for improved department filtering.

## Architecture

### Before (Old Approach)
```
User Query → Pattern Match → Direct Filter on audit-results.department
```

**Problem**: Department names in audit-results are inconsistent (e.g., "IT", "Departemen IT", "Information Technology")

### After (New Approach)
```
User Query → Pattern Match → Department Table Lookup → Normalized Names → Filter on audit-results
```

**Solution**: Use the `departments` table to normalize department names and find all variations

## Implementation

### 1. Department Table Structure

```typescript
interface Department {
  id: string;
  name: string;              // Normalized name (e.g., "IT")
  originalNames: string[];   // All variations (e.g., ["IT", "Departemen IT", "Information Technology"])
  keywords: string[];        // Searchable keywords
  category: string;          // Category (e.g., "IT", "Finance")
}
```

### 2. Query Flow

#### Step 1: Pattern Matching
```typescript
// User query: "show IT department findings"
// Pattern matched: department-show
// Extracted params: { department: "IT" }
```

#### Step 2: Department Normalization
```typescript
// Look up "IT" in departments table
const departments = await departmentService.searchByName("IT");

// Get all original names
const originalNames = ["IT", "Departemen IT", "Information Technology", "ICT"];
```

#### Step 3: Query Execution
```typescript
// Query audit-results for each original name
for (const deptName of originalNames) {
  const results = await auditResultService.getAll({
    filters: [
      { field: 'department', operator: '==', value: deptName },
      ...otherFilters
    ]
  });
  allFindings.push(...results);
}

// Sort and limit combined results
return sortAndLimitFindings(allFindings, sorts, limit);
```

### 3. Code Changes

#### SimpleQueryExecutor.ts

**Added Methods**:
- `normalizeDepartmentFilter(departmentValue: string): Promise<string[]>`
  - Looks up department in departments table
  - Returns all original names that match
  - Falls back to original value if not found

- `sortAndLimitFindings(findings, sorts, limit): AuditResult[]`
  - Sorts combined results from multiple queries
  - Applies limit after sorting

**Modified Method**:
- `execute(pattern, params): Promise<SimpleQueryResult>`
  - Detects department filters
  - Normalizes department names using department table
  - Executes multiple queries for each original name
  - Combines and sorts results

## Benefits

### 1. Flexible Department Matching
Users can query using any department variation:
- "IT findings" → matches "IT", "Departemen IT", "Information Technology"
- "Finance findings" → matches "Finance", "Keuangan", "FAD"
- "HR findings" → matches "HR", "HRD", "SDM", "Human Resources"

### 2. Consistent Results
All audit results for a department are returned regardless of how the department name was entered in the original data.

### 3. Maintainable
- Department normalization is centralized in the `departments` table
- No need to update query patterns when new department variations are added
- Easy to merge duplicate departments

### 4. Scalable
- Works with composite queries (e.g., "IT findings from 2023")
- Supports all query patterns that include department filters

## Usage Examples

### Simple Department Query
```
User: "show IT findings"
→ Matches: department-show pattern
→ Normalizes: "IT" → ["IT", "Departemen IT", "Information Technology", "ICT"]
→ Queries: audit-results where department in normalized names
→ Returns: All IT findings across all name variations
```

### Composite Query (Department + Year)
```
User: "IT findings from 2023"
→ Matches: composite-dept-year-from pattern
→ Normalizes: "IT" → ["IT", "Departemen IT", "Information Technology", "ICT"]
→ Queries: audit-results where department in normalized names AND year = 2023
→ Returns: All IT findings from 2023
```

### Composite Query (Department + Risk)
```
User: "critical IT findings"
→ Matches: composite-critical-dept pattern
→ Normalizes: "IT" → ["IT", "Departemen IT", "Information Technology", "ICT"]
→ Queries: audit-results where department in normalized names AND nilai >= 15
→ Returns: All critical IT findings
```

## Performance Considerations

### Query Optimization
- Each department variation requires a separate Firestore query
- Results are combined in memory
- Sorting and limiting happen after combining

### Caching
- SimpleQueryService caches query results
- Cache key includes normalized department names
- TTL: 5 minutes (configurable)

### Best Practices
1. Keep department variations to a minimum (< 10 per department)
2. Regularly merge duplicate departments
3. Use department categories for broader queries

## Testing

### Test Cases
1. **Single department name**: "IT findings"
2. **Department variation**: "Information Technology findings"
3. **Composite with year**: "IT findings from 2023"
4. **Composite with risk**: "critical IT findings"
5. **Non-existent department**: "XYZ findings" → empty results
6. **Multiple variations**: Verify all variations are queried

### Manual Testing
```bash
# Run simple query tests
npm run test:simple-query

# Or use batch file
run-simple-query-tests.bat
```

## Migration Notes

### Existing Data
- No migration needed for audit-results
- Department table should already be populated
- Run `normalize-departments.bat` to ensure all departments are normalized

### Backward Compatibility
- Old queries still work
- Hardcoded department patterns still supported
- Gradual migration to flexible patterns

## Future Enhancements

### 1. Fuzzy Matching
- Support typos and partial matches
- "Informasi" → "Information Technology"

### 2. Multi-Department Queries
- "IT and Finance findings"
- "All departments except IT"

### 3. Department Hierarchy
- Parent-child relationships
- "All Engineering departments"

### 4. Analytics
- Track most queried departments
- Identify missing department normalizations

## Related Documentation

- [Department Normalization](./department-normalization.md)
- [Simple Query Configuration](./simple-query-configuration.md)
- [DocAI Architecture](./docai-2-table-architecture.md)
- [Query Patterns](../src/services/queryPatterns.ts)
