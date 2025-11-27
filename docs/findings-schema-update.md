# Findings Table Structure Update

## Overview

The findings table structure has been updated to match the comprehensive schema defined in `findings-table-structure.md`. This document outlines the changes and migration path.

## Schema Changes

### Core Identification Fields

**New Fields:**
- `auditYear` (number): Year of audit for historical tracking
- `id` format changed to: `FND-YYYY-###` (e.g., FND-2024-001)

### Organizational Structure

**New Fields:**
- `subholding` (string): Business unit level (replaces `location`)
- `projectType` (enum): Hotel, Landed House, Apartment, School, University, Insurance, Hospital, Clinic, Mall, Office Building, Mixed-Use Development
- `projectName` (string): Specific project name
- `findingDepartment` (string): Department where finding was identified (replaces `department`)

### Audit Team

**New Fields:**
- `executor` (string): Auditor who executed the audit (replaces `responsiblePerson`)
- `reviewer` (string): Auditor who reviewed (replaces `reviewerPerson`)
- `manager` (string): Manager who approved

### Finding Classification

**New Fields:**
- `controlCategory` (enum): Preventive, Detective, Corrective
- `processArea` (string): Sales, Procurement, Finance, HR, IT, Legal, Marketing, Construction, Project Development, Customer Service, Property Management (replaces `category`)

### Finding Details

**Changed Fields:**
- `findingTitle` (string): Brief title 50-100 chars (was `title`)
- `findingDescription` (string): Detailed description (was `description`)

**New Fields:**
- `rootCause` (string): Root cause analysis
- `impactDescription` (string): Actual or potential impact

### Severity & Priority

**New Scoring System:**
- `findingBobot` (1-4): Weight/Severity
- `findingKadar` (1-5): Degree/Intensity
- `findingTotal` (1-20): Combined score (Bobot × Kadar) - **auto-calculated**
- `priorityLevel` (enum): Critical, High, Medium, Low - **auto-calculated from Total**

**Priority Calculation:**
- Critical: 16-20
- High: 11-15
- Medium: 6-10
- Low: 1-5

**Removed:**
- `severity` (replaced by `priorityLevel`)
- `riskLevel` (replaced by `findingTotal`)

### Tags & Classification

**Changed Fields:**
- `primaryTag` (string): Main category (was first item in `tags` array)
- `secondaryTags` (string[]): Additional relevant tags (was `tags` array)

**Complete Tag Library** (see `src/types/finding.constants.ts`):
- Financial/Revenue (9 tags)
- Customer/Sales (9 tags)
- Marketing & Promotion (10 tags)
- Legal & Compliance (11 tags)
- IT Controls (13 tags)
- Operational (10 tags)
- Finance & Accounting (10 tags)
- HR & Payroll (8 tags)
- Document & Record (7 tags)
- Treasury & Banking (6 tags)
- Tax Management (6 tags)
- Project Development (6 tags)
- Hotel Operations (6 tags)
- Property Management (5 tags)
- Other (7 tags)

### Additional Metadata

**New Fields:**
- `creationTimestamp` (Timestamp): Auto-generated (replaces `dateCreated`)
- `lastModifiedDate` (Timestamp): Auto-updated (replaces `dateUpdated`)
- `modifiedBy` (string): User who last modified
- `notes` (string): Additional comments/notes

## Migration Guide

### Step 1: Update Type Definitions

The type definitions have been updated in:
- `src/types/finding.types.ts` - Main interfaces and schemas
- `src/types/finding.constants.ts` - Constants, tag library, and helper functions

### Step 2: Update Service Layer

The `FindingsService` has been updated to:
- Calculate `findingTotal` and `priorityLevel` automatically
- Map old filter fields to new schema
- Update search to use new field names

### Step 3: Migrate Existing Data

Use the migration utility in `src/utils/findingMigration.ts`:

```typescript
import { migrateOldFinding, validateMigratedFinding } from './utils/findingMigration';

// For each old finding
const migratedFinding = migrateOldFinding(oldFinding, 2024, sequenceNumber);

// Validate
const errors = validateMigratedFinding(migratedFinding);
if (errors.length > 0) {
  console.error('Validation errors:', errors);
}

// Save to database
await findingsService.create(migratedFinding);
```

### Step 4: Update UI Components

Components that need updates:
- `FindingsTable.tsx` - Update column definitions
- `FindingEditDialog.tsx` - Update form fields
- `FindingDetailsPanel.tsx` - Update display fields
- `FilterPanel.tsx` - Update filter options
- `SearchBar.tsx` - Update search fields

### Step 5: Update Seed Data

The seed data generator needs to be updated to use the new schema. See `src/utils/seedData.ts`.

## API Changes

### Creating a Finding

**Before:**
```typescript
await findingsService.createFinding({
  title: 'Finding title',
  description: 'Description',
  severity: 'High',
  category: 'Financial',
  location: 'Jakarta',
  responsiblePerson: 'John Doe',
  riskLevel: 8,
  // ...
});
```

**After:**
```typescript
await findingsService.createFinding({
  auditYear: 2024,
  subholding: 'Jakarta Office',
  projectType: 'Office Building',
  projectName: 'Jakarta Tower',
  findingDepartment: 'Finance',
  executor: 'John Doe',
  reviewer: 'Jane Smith',
  manager: 'Bob Johnson',
  controlCategory: 'Detective',
  processArea: 'Finance',
  findingTitle: 'Finding title',
  findingDescription: 'Description',
  rootCause: 'Root cause',
  impactDescription: 'Impact',
  recommendation: 'Recommendation',
  findingBobot: 4, // 1-4
  findingKadar: 3, // 1-5
  // findingTotal and priorityLevel auto-calculated
  primaryTag: 'Budget Management',
  secondaryTags: ['Financial Reporting', 'Budget Variance'],
  // ...
});
```

### Filtering Findings

The filter interface remains compatible, but maps to new fields internally:
- `severity` → `priorityLevel`
- `location` → `subholding`
- `category` → `processArea`
- `department` → `findingDepartment`
- `responsiblePerson` → `executor`
- `riskLevel` → `findingTotal`
- `tags` → `secondaryTags`

## Database Indexes

Update Firestore indexes for optimal query performance:

```json
{
  "indexes": [
    {
      "collectionGroup": "findings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "auditYear", "order": "DESCENDING" },
        { "fieldPath": "priorityLevel", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "findings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "subholding", "order": "ASCENDING" },
        { "fieldPath": "dateIdentified", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "findings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "processArea", "order": "ASCENDING" },
        { "fieldPath": "findingTotal", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Testing

After migration:
1. Verify all findings have required fields
2. Test filtering by new fields
3. Test search functionality
4. Verify priority level calculations
5. Test CRUD operations
6. Verify UI displays correctly

## Rollback Plan

If issues occur:
1. Keep backup of old data structure
2. Revert type definitions
3. Revert service layer changes
4. Restore from backup if needed

## Support

For questions or issues with the migration, refer to:
- `findings-table-structure.md` - Original specification
- `src/types/finding.constants.ts` - Tag library and helpers
- `src/utils/findingMigration.ts` - Migration utilities
