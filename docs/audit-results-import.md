# Audit Results Import Guide

## Overview

The audit-results table replaces the findings table for storing audit data from Master-finding.xlsx. This new structure provides better alignment with the actual data format and includes automatic calculation of the Nilai field.

## Table Structure

The `audit-results` collection has the following fields:

| Field | Type | Description |
|-------|------|-------------|
| auditResultId | string | 6-digit unique identifier |
| year | number | Audit year (stored as integer, e.g., 2024) |
| sh | string | Subholding code |
| projectName | string | Project name |
| projectId | string | Linked project ID from projects table |
| department | string | Department name |
| riskArea | string | Risk area description |
| descriptions | string | Finding description |
| code | string | Finding code (e.g., "F", "NF") |
| bobot | number | Weight value |
| kadar | number | Severity value |
| nilai | number | Calculated value (bobot × kadar) |
| createdAt | timestamp | Creation timestamp |
| createdBy | string | Creator identifier |
| updatedAt | timestamp | Last update timestamp |

## Import Process

### Prerequisites

1. Ensure Firebase is configured (`.env` file with credentials)
2. Have authentication credentials in `.test-credentials.json`
3. Close `Master-finding.xlsx` if it's open in Excel

### Running the Import

```bash
npm run import:audit-results
```

### What the Script Does

1. **Reads Excel File**: Loads data from the "Master" sheet in `Master-finding.xlsx`
2. **Generates IDs**: Creates 6-digit unique IDs based on year, SH, project name, and code
3. **Links Projects**: Finds matching project IDs from the projects table using SH and project name
4. **Calculates Nilai**: Automatically computes nilai = bobot × kadar
5. **Imports Data**: Creates or updates records in the `audit-results` collection

### Import Output

The script provides detailed feedback:
- ✨ Created: New audit results added
- ✅ Updated: Existing audit results updated
- ⚠️ Skipped: Rows with missing required fields
- 📋 Total: Total rows processed

## Chatbot Integration

The chatbot now uses the `audit-results` table instead of `findings`:

### Query Examples

- "Show me audit results from 2024"
- "What are the findings for Century21 project?"
- "Show me all IT department audit results"
- "List audit results with high nilai values"

### Changes Made

1. **SmartQueryRouter**: Updated to query `audit-results` collection
2. **QueryRouterService**: Modified to use `AuditResultService`
3. **AuditResultService**: New service for managing audit results
4. **Firestore Indexes**: Added indexes for efficient querying

## Field Mapping

### From Excel to Database

| Excel Column | Database Field |
|--------------|----------------|
| Year | year |
| SH | sh |
| Project Name | projectName |
| Department | department |
| Risk Area | riskArea |
| Descriptions | descriptions |
| Code | code |
| Bobot | bobot |
| Kadar | kadar |
| Nilai | nilai (calculated) |

### Project Linking

The script automatically links audit results to projects by:
1. Matching `sh` field
2. Matching `projectName` field
3. Storing the `projectId` for reference

If no matching project is found, `projectId` is set to `null` with a warning.

## Troubleshooting

### File Access Error

**Error**: Cannot read Excel file
**Solution**: Close Excel completely and try again

### Authentication Error

**Error**: Authentication failed
**Solution**: 
- Check `.test-credentials.json` exists
- Verify Firebase emulator is running (if using emulator)
- Check `.env` file has correct Firebase credentials

### No Matching Project

**Warning**: No matching project found for SH/Project Name
**Solution**: 
- Import projects first using `npm run import:projects`
- Verify project names match exactly between files

### Missing Required Fields

**Warning**: Skipping row - missing SH or Project Name
**Solution**: Check Excel file for empty cells in required columns

## Data Validation

The import script validates:
- ✅ Required fields (SH, Project Name)
- ✅ Numeric values (Year, Bobot, Kadar)
- ✅ Calculated Nilai accuracy
- ✅ Project existence (with warning if not found)

## Next Steps

After importing audit results:

1. **Verify Data**: Check Firestore console for imported records
2. **Test Queries**: Use the chatbot to query audit results
3. **Update Reports**: Modify any reports to use audit-results table
4. **Archive Findings**: Consider archiving the old findings table

## Migration from Findings

If you have existing data in the `findings` table:

1. **Backup**: Export existing findings data
2. **Import**: Run the audit-results import
3. **Verify**: Compare data completeness
4. **Switch**: Update all services to use audit-results
5. **Archive**: Keep findings table as backup or delete

## API Reference

### AuditResultService Methods

```typescript
// Get by project
getAuditResultsByProject(projectName: string): Promise<AuditResult[]>

// Get by year
getAuditResultsByYear(year: number): Promise<AuditResult[]>

// Get by department
getAuditResultsByDepartment(department: string): Promise<AuditResult[]>

// Get by SH
getAuditResultsBySH(sh: string): Promise<AuditResult[]>

// Get by code
getAuditResultsByCode(code: string): Promise<AuditResult[]>
```

## Performance

The audit-results table includes Firestore indexes for:
- Year (descending)
- Project name + Year
- Department + Year
- SH + Year
- SH + Project name

These indexes ensure fast query performance for common chatbot queries.
