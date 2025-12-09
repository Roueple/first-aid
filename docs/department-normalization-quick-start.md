# Department Normalization - Quick Start

## What It Does

Transforms messy department names into clean, searchable data:

```
"Departemen Finance & Accounting" → "Finance Accounting"
"Department IT - General Control" → "IT General Control"  
"Departement HR/SDM" → "HR SDM"
```

## Setup (One-Time)

1. Run the normalization script:
```bash
normalize-departments.bat
```

2. Deploy Firestore indexes:
```bash
firebase deploy --only firestore:indexes
```

## Usage

### Search Audit Results by Department Keyword

```typescript
import auditResultService from './services/AuditResultService';

// Find all IT-related audit results
const results = await auditResultService.searchByDepartmentKeyword('it');

// Find all finance-related audit results
const results = await auditResultService.searchByDepartmentKeyword('finance');
```

### Get Normalized Department

```typescript
import departmentService from './services/DepartmentService';

// Automatically normalizes and finds/creates department
const dept = await departmentService.findOrCreate('Departemen IT', userId);

console.log(dept.name); // "IT"
console.log(dept.keywords); // ["it", "teknologi", "informasi"]
console.log(dept.category); // "IT"
```

### Normalize Department Name (Utility)

```typescript
import { normalizeDepartmentName } from './utils/departmentNormalizer';

const normalized = normalizeDepartmentName('Departemen Finance & Accounting');
// Returns: "Finance Accounting"
```

## How It Works

1. **Normalization**: Removes prefixes, special characters, extra spaces
2. **Keywords**: Extracts searchable terms (filters stopwords)
3. **Categorization**: Auto-assigns category (IT, Finance, HR, etc.)
4. **Indexing**: Stores in Firestore with array-contains index for fast search

## Benefits

- **Consistent**: All variations map to same normalized name
- **Searchable**: Keyword-based search finds all variations
- **Fast**: Firebase array-contains queries are indexed
- **Automatic**: LLM can extract keywords from natural language queries

## Example Query Flow

User asks: "Show me all IT audit findings"

1. LLM extracts keyword: "it"
2. System searches departments with "it" keyword
3. Finds all variations: "Departemen IT", "IT General Control", "Audit IT", etc.
4. Returns audit results from all matching departments

## Maintenance

### View All Departments
```typescript
const names = await departmentService.getAllNames();
```

### Search Departments
```typescript
const depts = await departmentService.searchByName('finance');
```

### Merge Duplicates
```typescript
await departmentService.mergeDepartments(keepId, [mergeId1, mergeId2], userId);
```

## Categories

- IT
- Finance
- HR
- Marketing & Sales
- Property Management
- Engineering & Construction
- Legal & Compliance
- Audit & Risk
- Operations
- Planning & Development
- Hospitality & F&B
- Healthcare
- Insurance & Actuarial
- CSR & Community
- Security
- Corporate
- Supply Chain & Procurement
- Academic & Administration
- Outsourcing & Third Party
- Other

See [Department Categories Reference](./department-categories-reference.md) for detailed information on each category.

## Files Created

- `src/services/DepartmentService.ts` - Main service
- `src/utils/departmentNormalizer.ts` - Utility functions
- `scripts/normalize-departments.mjs` - Initial setup script
- `normalize-departments.bat` - Windows batch file
- `docs/department-normalization.md` - Full documentation

## Testing

```bash
npm test DepartmentService.test.ts
npm test departmentNormalizer.test.ts
```

All tests pass ✅
