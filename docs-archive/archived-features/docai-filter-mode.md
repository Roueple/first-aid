# DocAI:2 Filter Mode

## Overview

DocAI:2 Filter Mode is a smart query builder that helps users create accurate Firebase queries for the audit results database. It replaces the broken simple-query implementation with a more reliable, user-confirmed approach.

## Features

✅ **AI-Powered Query Analysis** - Understands natural language queries  
✅ **User Confirmation** - Shows interpretation before executing  
✅ **Accurate Firebase Queries** - Builds correct queries based on database schema  
✅ **Results Preview** - Shows first 10 results in chat  
✅ **XLSX Export** - Download complete results as Excel file  
✅ **Manual Trigger** - User activates when needed  

## How It Works

### 3-Step Flow

```
┌─────────────────┐
│  1. User Input  │  User describes what they want to find
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. AI Analysis │  AI analyzes input and shows interpretation
│  & Confirmation │  User confirms or goes back to refine
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Execute &   │  Query runs, results shown + downloadable
│  Show Results   │  Max 10 rows in chat, full data in XLSX
└─────────────────┘
```

### Step 1: User Input

User enters their query needs in natural language:

**Examples:**
- "Show all IT related findings in 2024"
- "Find critical findings with risk score above 15"
- "Get all Finance department findings from last year"
- "Show me findings for Grand Hotel Jakarta"

### Step 2: AI Analysis & Confirmation

AI analyzes the input and extracts structured filters:

```json
{
  "interpretation": "Show all IT department findings from 2024",
  "filters": {
    "year": 2024,
    "department": "IT",
    "onlyFindings": true
  },
  "confidence": 0.95
}
```

User sees:
- Human-readable interpretation
- Extracted filters with visual tags
- Confidence score
- Option to go back or confirm

### Step 3: Execute & Show Results

Once confirmed:
1. Builds Firebase query from filters
2. Executes query against `audit-results` collection
3. Shows first 10 results in chat with:
   - Audit Result ID
   - Risk level badge (🔴 CRITICAL, 🟠 HIGH, 🟡 MEDIUM, 🟢 LOW)
   - Project name, department, year
   - Risk score breakdown
   - Description preview
4. Provides "Export XLSX" button for complete data

## Database Schema

Filter Mode understands the `audit-results` collection structure:

| Field | Type | Description |
|-------|------|-------------|
| `year` | number | Audit year (2020-2025) |
| `department` | string | IT, HR, Finance, Sales, etc. |
| `projectName` | string | Project name |
| `sh` | string | Subholding code (CWS, CJK, etc.) |
| `nilai` | number | Risk score (0-25) |
| `bobot` | number | Weight (0-5) |
| `kadar` | number | Severity (0-5) |
| `code` | string | Finding code (empty = non-finding) |
| `descriptions` | string | Finding description |
| `riskArea` | string | Risk area |

## Supported Filters

### Temporal Filters
- **Year**: Specific year (2024, 2025, etc.)
- **Keywords**: "last year", "this year", "2024"

### Department Filters
- **Department**: IT, HR, Finance, Sales, Procurement, Legal, Marketing, Accounting, Operations
- **Case-insensitive matching**

### Risk-Based Filters
- **Critical**: Risk score ≥ 16
- **High**: Risk score ≥ 11
- **Medium**: Risk score 6-10
- **Low**: Risk score ≤ 5
- **Custom threshold**: "above 15", "greater than 10"

### Project Filters
- **Project Name**: Exact match or fuzzy match
- **Subholding (SH)**: CWS, CJK, CPK, etc.

### Type Filters
- **Only Findings**: Excludes non-findings (code != '')
- **Only Non-Findings**: Only non-findings (code == '')

### Text Search
- **Keywords**: Searches in descriptions and riskArea
- **Client-side filtering** after Firebase query

## Usage

### From Doc Assistant Page

1. Click the **"Filter Mode"** button (purple button in header)
2. Enter your query in natural language
3. Click **"Analyze Query"**
4. Review the AI interpretation
5. Click **"Confirm & Execute"** or **"← Back"** to refine
6. View results and optionally **"Export XLSX"**

### Example Queries

#### Simple Queries
```
"Show all IT findings in 2024"
"Find Finance department findings"
"Get findings for Grand Hotel Jakarta"
```

#### Complex Queries
```
"Show critical IT findings from 2024"
"Find all findings with risk score above 15"
"Get Finance and HR findings from last year"
```

#### Text Search
```
"Find findings about security"
"Search for access control issues"
"Show findings mentioning compliance"
```

## Firebase Query Building

### Example 1: Department + Year

**User Input**: "Show all IT findings in 2024"

**Extracted Filters**:
```typescript
{
  year: 2024,
  department: "IT",
  onlyFindings: true
}
```

**Firebase Query**:
```typescript
const query = collection(db, 'audit-results')
  .where('year', '==', 2024)
  .where('department', '==', 'IT')
  .where('code', '!=', '')
  .orderBy('year', 'desc')
  .orderBy('nilai', 'desc');
```

### Example 2: Risk-Based

**User Input**: "Find critical findings"

**Extracted Filters**:
```typescript
{
  minNilai: 16,
  onlyFindings: true
}
```

**Firebase Query**:
```typescript
const query = collection(db, 'audit-results')
  .where('nilai', '>=', 16)
  .where('code', '!=', '')
  .orderBy('nilai', 'desc');
```

### Example 3: Text Search

**User Input**: "Find findings about security"

**Extracted Filters**:
```typescript
{
  keywords: ["security"]
}
```

**Process**:
1. Fetch all audit results
2. Client-side filter where `descriptions` or `riskArea` contains "security"
3. Return filtered results

## XLSX Export

### Export Format

| Column | Description |
|--------|-------------|
| Audit Result ID | Unique identifier |
| Year | Audit year |
| Subholding | SH code |
| Project Name | Project name |
| Department | Department name |
| Risk Area | Risk area description |
| Description | Full description |
| Code | Finding code |
| Bobot | Weight (0-5) |
| Kadar | Severity (0-5) |
| Nilai (Risk Score) | Calculated risk score |
| Risk Level | CRITICAL/HIGH/MEDIUM/LOW |

### File Naming

Format: `audit-results-YYYY-MM-DDTHH-MM-SS.xlsx`

Example: `audit-results-2024-12-08T14-30-45.xlsx`

## Technical Implementation

### Services

**DocAIFilterService** (`src/services/DocAIFilterService.ts`)
- `analyzeUserInput()` - Extract filters from natural language
- `buildFirestoreQuery()` - Build Firebase query from filters
- `executeQuery()` - Execute query and return results
- `formatResultsForChat()` - Format results for display
- `exportToXLSX()` - Export results to Excel

### Components

**DocAIFilterMode** (`src/components/DocAIFilterMode.tsx`)
- Modal UI with 3-step flow
- Input form with examples
- Confirmation screen with filter preview
- Results display with export button

### Integration

**DocPage** (`src/renderer/pages/DocPage.tsx`)
- "Filter Mode" button in header
- Modal overlay when activated
- Integrated with user authentication

## Performance

- **Query Analysis**: ~500-1000ms (Gemini API)
- **Query Execution**: ~100-500ms (Firebase)
- **Total Time**: ~1-2 seconds from input to results
- **Export**: Instant (client-side XLSX generation)

## Advantages Over Simple Query

| Feature | Simple Query | Filter Mode |
|---------|-------------|-------------|
| **Accuracy** | Pattern matching (brittle) | AI analysis (flexible) |
| **User Confidence** | No confirmation | Shows interpretation |
| **Debugging** | Silent failures | Clear error messages |
| **Flexibility** | Fixed patterns | Understands variations |
| **Export** | Not available | XLSX export included |
| **User Control** | Automatic | Manual trigger |

## Troubleshooting

### No Results Found

**Possible Causes**:
- Filters too restrictive
- Typo in department/project name
- Year out of range
- No data matching criteria

**Solution**:
- Go back and refine query
- Try broader filters
- Check spelling

### Low Confidence Score

**Possible Causes**:
- Ambiguous query
- Multiple interpretations possible
- Missing context

**Solution**:
- Review interpretation carefully
- Refine query to be more specific
- Add more details (year, department, etc.)

### Export Not Working

**Possible Causes**:
- Browser blocking download
- No results to export
- File system permissions

**Solution**:
- Check browser download settings
- Ensure results exist
- Try different browser

## Future Enhancements

- [ ] Save favorite queries
- [ ] Query history
- [ ] Advanced filters UI
- [ ] Multiple export formats (CSV, PDF)
- [ ] Scheduled queries
- [ ] Email results
- [ ] Query templates
- [ ] Batch operations

## Related Documentation

- [Firebase Query Guide](./firebase-query-guide.md)
- [DocAI 2-Table Architecture](./DOCAI-README-2-TABLE.md)
- [Audit Results Database](./audit-results-import.md)

---

**Last Updated**: December 8, 2025  
**Version**: 1.0.0
