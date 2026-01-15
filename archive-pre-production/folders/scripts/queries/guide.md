# Query Scripts Guide

Quick reference for running data queries against Firestore.

## How to Use

1. Open the script file you want to run
2. Edit the **CONFIGURATION** section at the top (values like YEAR, PROJECT_NAME, etc.)
3. Run from project root: `node scripts/queries/<script-name>.mjs`

## Available Scripts

### Simple Filters (Single Field)

| Script | Description | Config |
|--------|-------------|--------|
| `01-filter-by-year.mjs` | Filter by year | YEAR, LIMIT |
| `02-filter-by-project.mjs` | Filter by project name | PROJECT_NAME, LIMIT |
| `03-filter-by-department.mjs` | Filter by department | DEPARTMENT, LIMIT |
| `04-filter-by-code.mjs` | Filter by code (F/NF) | CODE, LIMIT |

### Combined Filters (Multiple Fields)

| Script | Description | Config |
|--------|-------------|--------|
| `05-filter-by-year-and-project.mjs` | Year + Project | YEAR, PROJECT_NAME, LIMIT |
| `06-filter-by-year-and-department.mjs` | Year + Department | YEAR, DEPARTMENT, LIMIT |
| `07-findings-only-by-year.mjs` | Findings for year | YEAR, LIMIT |
| `08-non-findings-only-by-year.mjs` | Non-findings for year | YEAR, LIMIT |
| `16-year-range-filter.mjs` | Year range | START_YEAR, END_YEAR, LIMIT |
| `17-triple-filter.mjs` | Year + Project + Code | YEAR, PROJECT_NAME, CODE, LIMIT |

### Aggregations & Counts

| Script | Description | Config |
|--------|-------------|--------|
| `09-count-by-year.mjs` | Count grouped by year | None |
| `10-count-by-department.mjs` | Count grouped by department | None |
| `11-count-by-project.mjs` | Count grouped by project | TOP_N |
| `12-list-all-projects.mjs` | List all projects with counts | SORT_BY, ORDER |

### Search & Analysis

| Script | Description | Config |
|--------|-------------|--------|
| `13-search-finding-text.mjs` | Search text in findings | SEARCH_TEXT, CASE_SENSITIVE, LIMIT |
| `14-projects-with-most-findings.mjs` | Top projects by findings | TOP_N, MIN_FINDINGS |
| `15-projects-with-zero-findings.mjs` | Projects with only NF | None |

### Reports & Verification

| Script | Description | Config |
|--------|-------------|--------|
| `18-summary-stats.mjs` | Overall statistics (with categories) | None |
| `19-project-detail.mjs` | Detailed project info (with categories) | PROJECT_NAME |
| `20-data-completeness.mjs` | Verify data integrity | None |
| `21-list-departments.mjs` | List all departments from departments table | GROUP_BY |

## Department Lookup

Department queries (03, 06, 10) now use the **departments table** for smart lookup:
- Search by: name, category, keywords, or original names
- Example: `DEPARTMENT = 'IT'` finds all IT-related departments
- Example: `DEPARTMENT = 'Finance'` finds Finance & Accounting departments

Run `21-list-departments.mjs` to see all available departments and categories.

## Examples

```bash
# Get all IT findings for 2024
# Edit 06-filter-by-year-and-department.mjs: YEAR=2024, DEPARTMENT='IT'
node scripts/queries/06-filter-by-year-and-department.mjs

# Search for "pajak" in findings
# Edit 13-search-finding-text.mjs: SEARCH_TEXT='pajak'
node scripts/queries/13-search-finding-text.mjs

# Get summary statistics
node scripts/queries/18-summary-stats.mjs
```

## Field Reference

**audit-results fields:** projectName, code, finding, department, year, uniqueId
**projects fields:** projectName, projectId, initials, finding, nonFinding, total
