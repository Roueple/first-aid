# Project Initials Feature

## Overview
All projects now have a 3-character initials field that is automatically generated from the project name. This provides a quick, memorable identifier for each project.

## Initials Generation Rules

The system generates **unique** initials (3-4 characters) using a simple, safe approach:

### Base Generation Rule

**Simple**: Take the first 3-4 letters from the project name (removing spaces and special characters)

Examples:
- "Hotel Raffles Jakarta" → **HOTE**
- "Ciputra Beach Resort" → **CIPU**
- "CitraLand Manado" → **CITR**
- "Century21" → **CENT**
- "Vidaview Apartment" → **VIDA**
- "Mall Ciputra Semarang" → **MALL**

### Uniqueness Enforcement

If the base initials are already taken, the system automatically appends a number:

1. **Collision resolution**: Append sequential numbers (1-99)
   - "Hotel Raffles Jakarta" → **HOTE**
   - "Hotel Ciputra Jakarta" → **HOTE1**
   - "Hotel Citra Dream Cirebon" → **HOTE2**
   - "Hotel Ciputra World Surabaya" → **HOTE3**

2. **Final fallback**: If all numbers exhausted (rare), use hash-based suffix

**Result**: Every project is guaranteed to have a unique initial (3-6 characters).

## Implementation

### Database Schema
The `initials` field has been added to the Project interface:

```typescript
export interface Project {
  // ... other fields
  initials: string; // 3-character initials from project name
  // ... other fields
}
```

### Auto-Generation
Initials are automatically generated when:
- Creating a new project via `ProjectService.createProject()`
- Importing projects from Excel via `import-projects-from-excel.mjs`

### UI Display
The initials column appears in the Projects Table between the "Project" and "Total Finding" columns, displayed as a blue badge for easy visibility.

## Migration

All existing projects (110 total) have been migrated to include **unique** initials.

### Initial Migration
```bash
node scripts/add-initials-to-projects.mjs
```

This script:
- Reads all projects from Firestore
- Generates unique initials for each project
- Tracks used initials to prevent duplicates
- Updates the database with the new field
- Reports any collisions that were resolved

### Verification & Fix Script
```bash
node scripts/verify-and-fix-initials-uniqueness.mjs
```

This script:
- Verifies all initials are unique
- Identifies any duplicate initials
- Automatically fixes duplicates by generating new unique initials
- Provides detailed report of changes

**Migration Results**:
- 110 projects processed
- 27 duplicates resolved across 17 collision groups
- 110 unique initials confirmed
- Common collisions: SCK (5 projects), HCD (5 projects), CHC (3 projects)

## Usage

### In Code
```typescript
const projectService = new ProjectService();
const project = await projectService.createProject({
  sh: 'SH01',
  projectName: 'Hotel Raffles Jakarta',
  projectType: 'Audit',
  description: 'Hotel project'
}, 'user@example.com');

console.log(project.initials); // "HRJ"
```

### In UI
The initials are displayed in the Projects Table and can be:
- Sorted by clicking the "Initials" column header
- Filtered using the search box
- Exported to Excel (when export feature is implemented)

## Benefits

1. **Quick Identification**: Easy to reference projects in conversations
2. **Compact Display**: Takes less space than full project names
3. **Memorable**: Easier to remember than numeric IDs
4. **Consistent**: Automatically generated, no manual input needed
5. **Sortable**: Can be used for alphabetical organization
6. **Guaranteed Unique**: Every project has a distinct initial
7. **Collision-Free**: Automatic resolution of duplicate initials

## Real-World Examples

From the actual database:

| Project Name | Initial | Notes |
|-------------|---------|-------|
| Hotel Raffles Jakarta | HOTE | First hotel |
| Hotel Ciputra Jakarta | HOTE1 | Collision resolved |
| Hotel Citra Dream Cirebon | HOTE2 | Collision resolved |
| Ciputra Beach Resort | CIPU | First Ciputra |
| Ciputra International Puri | CIPU2 | Collision resolved |
| CitraLand Manado | CITR | First CitraLand |
| CitraLand BSB Semarang | CITR3 | Collision resolved |
| CitraLand Kendari | CITR6 | Collision resolved |
| Mall Ciputra Semarang | MALL | First mall |
| Mall Ciputra World Surabaya | MALL1 | Collision resolved |
| Century21 | CENT | Unique |
| Vidaview Apartment | VIDA | Unique |

## Future Enhancements

Potential improvements:
- Allow manual override of auto-generated initials (with uniqueness validation)
- Add initials to project export functionality
- Display initials in project selection dropdowns
- Use initials in finding references and reports
