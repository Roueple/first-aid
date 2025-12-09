# Migration & Setup Scripts Archive

This folder contains one-time migration and setup scripts that have been completed.

## DocAI Setup Scripts

**Database Setup:**
- `create-docai-tables.mjs` - Initialize DocAI collections
- `create-docai-2-tables.mjs` - Two-table architecture setup
- `migrate-docai-to-2-tables.mjs` - Migration to two-table model

**Verification:**
- `test-docai-tables.mjs` - Full test suite
- `check-docai-status.mjs` - Status verification
- `verify-docai-tables.mjs` - Table validation
- `verify-docai-2-tables.mjs` - Two-table validation

**Maintenance:**
- `cleanup-test-sessions.mjs` - Remove test data
- `add-titles-to-existing-sessions.mjs` - Backfill session titles

## Data Quality Scripts

**Analysis:**
- `analyze-data-quality.mjs` - Data quality checks
- `verify-export-completeness.mjs` - Export validation
- `verify-unique-ids.mjs` - ID uniqueness verification

**Validation:**
- `check-duplicates-correct.mjs` - Duplicate detection
- `check-project-fields.mjs` - Field validation
- `check-projects-details.mjs` - Project details check
- `check-projects-duplicates.mjs` - Project duplicate check
- `count-audit-results.mjs` - Count audit records

**Inspection:**
- `inspect-project-structure.mjs` - Structure analysis

## Utility Scripts

**Data Management:**
- `mark-projects-inactive.mjs` - Mark inactive projects
- `delete-findings-columns.mjs` - Column cleanup

## Usage

These scripts are archived for reference. They were used during initial setup and migration. Most are one-time operations that don't need to be run again.

**If you need to run any script:**
```bash
node scripts-archive/migration-scripts/[script-name].mjs
```

## Status

All scripts completed successfully. Database is in production state.
