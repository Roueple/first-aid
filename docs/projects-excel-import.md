# Projects Excel Import Guide

## Excel File Format

Your Excel file should have the following columns (case-insensitive):

| Column Name | Required | Type | Description | Example |
|------------|----------|------|-------------|---------|
| SH | Yes | Text | Subholding code | SH-001 |
| Project | Yes | Text | Project name | Grand Hotel Development |
| Type | Yes | Text | Project type | Hotel |
| Total | No | Number | Total score | 45 |
| Finding | No | Number | Number of findings | 3 |
| Non-Finding | No | Number | Number of non-findings | 0 |
| Subtype | No | Text | Project subtype | Luxury |
| Description | No | Text | Project description | 5-star hotel project |

## Valid Project Types

- Hotel
- Landed House
- Apartment
- School
- University
- Insurance
- Hospital
- Clinic
- Mall
- Office Building
- Mixed-Use Development

## Auto-Generated Fields

### Project ID (7-digit)
The system automatically generates a unique 7-digit ID based on:
- SH (Subholding)
- Project Name
- Type

Example: `SH-001` + `Grand Hotel` + `Hotel` → `3847562`

This ensures:
- Consistent IDs for the same project
- Always 7 digits (1000000-9999999)
- No manual ID management needed

### Row Number
The "No" column in the table is automatically generated based on display order and is NOT affected by filters or sorting. It's a visual row counter, not stored in the database.

## Import Instructions

### Option 1: Import from Excel File

```bash
node scripts/import-projects-from-excel.mjs path/to/your/file.xlsx
```

Or use the default file:
```bash
node scripts/import-projects-from-excel.mjs
```
(This will look for `raw_data.xlsx` in the root directory)

### Option 2: Migrate from Existing Findings

If you already have findings in the database:

```bash
node scripts/migrate-to-summary.mjs
```

This will:
1. Read all findings from the database
2. Group them by unique project (projectName + projectType)
3. Calculate aggregated statistics
4. Create project records with auto-generated IDs

## Excel Template Example

```
| SH     | Project              | Type   | Total | Finding | Non-Finding | Subtype | Description                    |
|--------|---------------------|--------|-------|---------|-------------|---------|--------------------------------|
| SH-001 | Grand Hotel         | Hotel  | 45    | 3       | 0           | Luxury  | 5-star hotel development       |
| SH-001 | Office Tower A      | Office | 32    | 2       | 1           | Grade A | Premium office building        |
| SH-002 | Sunrise Apartments  | Apartment | 28 | 4       | 0           | Mid-range | Residential complex         |
```

## Import Behavior

- **Duplicate Detection**: Projects with the same `projectName` are skipped
- **Validation**: Required fields (SH, Project, Type) must be present
- **Default Values**: Missing optional fields default to 0 or empty string
- **Error Handling**: Invalid rows are logged but don't stop the import

## After Import

1. **View Projects**: Use the ProjectsTable component to see imported data
2. **Refresh Statistics**: Click "Refresh Statistics" button to recalculate from findings
3. **Verify Data**: Check that Project IDs are generated correctly
4. **Deploy Indexes**: Run `firebase deploy --only firestore:indexes` if needed

## Troubleshooting

### "Project already exists" error
- The project name is already in the database
- Either skip it or delete the existing record first

### Invalid project type
- Check that the Type column matches one of the valid project types
- Types are case-sensitive

### Missing required fields
- Ensure SH, Project, and Type columns are present and not empty
- Check for typos in column names

### Import script not found
- Make sure you're running the command from the project root directory
- Verify the script exists in `scripts/` folder
