# Projects Table - Quick Start Guide

## What You Get

✅ **Projects table** in Firestore with auto-generated 7-digit IDs  
✅ **Excel import script** to populate from "Proyek" sheet  
✅ **Auto-calculated counts** from Findings table  
✅ **React component** with sorting, filtering, and row numbers  
✅ **Maintenance scripts** to recalculate stats  

## Quick Setup (3 Steps)

### 1. Import Projects from Excel

```bash
node scripts/import-projects-from-excel.mjs
```

This will:
- Read "Proyek" sheet from `raw_data.xlsx`
- Generate 7-digit IDs for each project
- Count findings from Findings table
- Create/update projects in Firestore

### 2. Add Table to Your UI

```tsx
import ProjectsTable from '../components/ProjectsTable';

function ProjectsPage() {
  return (
    <div className="p-6">
      <ProjectsTable 
        onProjectSelect={(project) => {
          console.log('Selected:', project);
          // Navigate to project details, etc.
        }}
      />
    </div>
  );
}
```

### 3. (Optional) Recalculate Stats

If counts get out of sync:

```bash
node scripts/recalculate-project-stats.mjs
```

## Key Features Explained

### 7-Digit Auto-ID
- Generated from: `SH-ProjectName-Type`
- Example: "SH001-ProjectABC-Audit" → `1234567`
- Always 7 digits, deterministic

### Row Numbers
- **Not stored** in database
- Always sequential: 1, 2, 3...
- **Not affected** by filters or sorting
- Shows current position in view

### Finding Counts
- **Calculated from Findings table**
- `finding`: Records with `findingTotal > 0`
- `nonFinding`: Records with `findingTotal = 0`
- Auto-updated when findings change

## Excel File Format

Your `raw_data.xlsx` → "Proyek" sheet should have:

| No | SH | Project | Total Finding | Non-Finding | Type | Subtype | Description |
|----|----|---------|--------------:|------------:|------|---------|-------------|
| 1 | SH001 | Project A | 5 | 2 | Audit | Internal | Description here |
| 2 | SH002 | Project B | 3 | 1 | Review | External | Another project |

**Note**: Total Finding and Non-Finding columns are **ignored** during import. Real counts are calculated from Findings table.

## Common Tasks

### Re-import from Excel
```bash
node scripts/import-projects-from-excel.mjs
```
- Updates existing projects
- Creates new ones
- Recalculates counts

### Fix Count Mismatches
```bash
node scripts/recalculate-project-stats.mjs
```

### Query Projects in Code
```typescript
import ProjectService from '../services/ProjectService';

const service = new ProjectService();

// Get all projects
const all = await service.getAllProjects();

// Get by name
const project = await service.getProjectByName('Project ABC');

// Get by subholding
const shProjects = await service.getProjectsBySubholding('SH001');
```

## Troubleshooting

**Import fails?**
- Check sheet name is exactly "Proyek"
- Verify `.test-credentials.json` exists
- Check `.env` has correct Firebase config

**Counts wrong?**
- Run: `node scripts/recalculate-project-stats.mjs`
- Check `projectName` in Findings matches exactly

**Table not showing?**
- Check Firebase connection
- Open browser console for errors
- Verify projects collection exists

## Files Created

```
scripts/
  ├── import-projects-from-excel.mjs    # Import from Excel
  └── recalculate-project-stats.mjs     # Fix counts

src/
  ├── components/
  │   └── ProjectsTable.tsx              # React table component
  ├── services/
  │   └── ProjectService.ts              # Already exists, enhanced
  └── types/
      └── project.types.ts               # Already exists

docs/
  ├── projects-table-setup.md            # Full documentation
  └── projects-quick-start.md            # This file
```

## Next Steps

1. ✅ Run import script
2. ✅ Add table to your UI
3. ✅ Test filtering and sorting
4. 🎯 Connect to project details page
5. 🎯 Add edit/delete functionality (if needed)

Need help? Check `docs/projects-table-setup.md` for detailed documentation.
