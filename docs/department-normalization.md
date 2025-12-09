# Department Normalization System

## Overview

The department normalization system solves the problem of inconsistent, duplicate, and varied department names in audit results. It provides a searchable, normalized index of departments with keyword-based search capabilities.

## Problem Statement

Raw department data contains:
- Inconsistent naming: "Departemen IT", "Department IT", "Departement IT"
- Duplicates with variations: "Finance & Accounting", "Finance And Accounting"
- Special characters: slashes, ampersands, parentheses
- Mixed languages: Indonesian and English
- Typos and formatting issues

This makes searching and filtering by department unreliable and frustrating.

## Solution

### 1. Normalization Process

The system normalizes department names by:
- Removing prefixes: "Departemen", "Department", "Departement"
- Standardizing special characters: replacing `/`, `-`, `,`, `()` with spaces
- Collapsing multiple spaces
- Trimming whitespace

Example:
```
"Departemen Finance & Accounting" → "Finance Accounting"
"Department IT - General Control" → "IT General Control"
```

### 2. Keyword Generation

Each department gets searchable keywords:
- Extracts meaningful words (filters stopwords)
- Converts to lowercase
- Removes duplicates
- Includes full normalized name

Example:
```
"IT General Control" → ["it", "general", "control", "it_general_control"]
```

### 3. Categorization

Departments are auto-categorized:
- IT
- Finance
- HR
- Marketing
- Legal
- Audit
- Engineering
- Other

## Architecture

### Collections

#### `departments`
```typescript
{
  id: string;
  name: string;              // Normalized name
  originalNames: string[];   // All raw variations
  keywords: string[];        // Searchable keywords
  category: string;          // Auto-categorized
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Services

#### `DepartmentService`
- `findOrCreate(rawName)` - Find existing or create new normalized department
- `findByKeyword(keyword)` - Search by any keyword
- `searchByName(query)` - Partial name search
- `getByCategory(category)` - Filter by category
- `mergeDepartments(keepId, mergeIds)` - Merge duplicates

#### `AuditResultService` (Enhanced)
- `searchByDepartmentKeyword(keyword)` - Search audit results by department keyword
- `getAllDepartments()` - Get all unique department names

### Utilities

#### `departmentNormalizer.ts`
- `normalizeDepartmentName(rawName)` - Normalize a name
- `generateDepartmentKeywords(name)` - Generate keywords
- `areDepartmentsSimilar(name1, name2)` - Check similarity
- `categorizeDepartment(name)` - Auto-categorize
- `formatDepartmentName(name)` - Format for display

## Usage

### 1. Initial Setup

Run the normalization script to process existing data:

```bash
normalize-departments.bat
```

This will:
1. Fetch all departments from audit-results
2. Normalize and deduplicate them
3. Generate keywords
4. Store in the departments collection

### 2. Deploy Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

### 3. Using in Code

#### Find or Create Department
```typescript
import departmentService from './services/DepartmentService';

const dept = await departmentService.findOrCreate('Departemen IT', userId);
console.log(dept.name); // "IT"
console.log(dept.keywords); // ["it", "teknologi", "informasi"]
```

#### Search by Keyword
```typescript
const depts = await departmentService.findByKeyword('finance');
// Returns all departments with "finance" in keywords
```

#### Search Audit Results by Department
```typescript
import auditResultService from './services/AuditResultService';

const results = await auditResultService.searchByDepartmentKeyword('it');
// Returns audit results from all IT-related departments
```

#### Normalize Department Name
```typescript
import { normalizeDepartmentName } from './utils/departmentNormalizer';

const normalized = normalizeDepartmentName('Departemen Finance & Accounting');
// Returns: "Finance Accounting"
```

## Firebase Query Optimization

### Array-Contains Query
```typescript
db.collection('departments')
  .where('keywords', 'array-contains', 'it')
  .get();
```

This is:
- Case-insensitive (keywords are lowercase)
- Fast (indexed)
- Scalable

### Composite Index
For category + name sorting:
```typescript
db.collection('departments')
  .where('category', '==', 'IT')
  .orderBy('name', 'asc')
  .get();
```

## Integration with DocAI

The LLM can now:
1. Extract department keywords from user queries
2. Use `searchByDepartmentKeyword()` to find relevant audit results
3. Handle variations automatically

Example query:
```
"Show me all IT audit findings"
```

The system will:
1. Extract keyword: "it"
2. Find all departments with "it" keyword
3. Return audit results from all matching departments

## Maintenance

### Merging Duplicates

If you find duplicate departments:

```typescript
await departmentService.mergeDepartments(
  'keep-dept-id',
  ['merge-dept-id-1', 'merge-dept-id-2'],
  userId
);
```

### Adding New Departments

New departments are automatically created when audit results are imported:

```typescript
const dept = await departmentService.findOrCreate(rawDepartmentName, userId);
```

### Updating Categories

Categories are auto-assigned but can be manually updated:

```typescript
const dept = await departmentService.getById(deptId);
dept.category = 'NewCategory';
await departmentService.update(deptId, dept, userId);
```

## Performance

- Keyword search: O(1) with Firestore index
- Normalization: O(n) where n = word count
- Memory: Minimal (keywords are small arrays)

## Future Enhancements

1. **Fuzzy Search** - Add Fuse.js for typo tolerance (if LLM doesn't handle it)
2. **Department Hierarchy** - Parent/child relationships
3. **Aliases** - Manual synonym mapping
4. **Analytics** - Track most searched departments
5. **Bulk Operations** - UI for merging/editing departments

## Testing

Run tests:
```bash
npm test -- DepartmentService
```

Test coverage includes:
- Normalization edge cases
- Keyword generation
- Similarity detection
- Category assignment
- Firebase queries

## Troubleshooting

### Issue: Department not found
- Check if normalization script has run
- Verify Firestore indexes are deployed
- Check keyword generation logic

### Issue: Too many duplicates
- Run merge operation
- Adjust similarity threshold in `areDepartmentsSimilar()`

### Issue: Wrong category
- Update category manually
- Adjust categorization logic in `categorizeDepartment()`

## References

- [Firebase Array-Contains Queries](https://firebase.google.com/docs/firestore/query-data/queries#array_membership)
- [Firestore Indexing Best Practices](https://firebase.google.com/docs/firestore/query-data/indexing)
