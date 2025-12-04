# FIRST-AID Consolidated Guides

**Last Updated**: December 4, 2025

This document consolidates all essential guides and documentation for the FIRST-AID system.

---

## 📚 Table of Contents

1. [Quick Start](#quick-start)
2. [Setup & Installation](#setup--installation)
3. [Features Overview](#features-overview)
4. [Import & Data Management](#import--data-management)
5. [Troubleshooting](#troubleshooting)

---

## Quick Start

### For New Users
1. Install dependencies: `npm install`
2. Configure Firebase: Copy `.env.example` to `.env` and add your keys
3. Import data: `npm run import:projects` then `npm run import:audit-results`
4. Start app: `npm run dev`

### For Developers
- **Main Documentation**: See `README.md` in root
- **Project Structure**: See `PROJECT-STRUCTURE.md`
- **API Docs**: See `docs/api-reference.md`

---

## Setup & Installation

### Prerequisites
- Node.js 18+
- Firebase project with Firestore enabled
- Service account credentials

### Installation Steps

1. **Clone and Install**
   ```bash
   git clone <repository>
   cd first-aid-system
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase config
   ```

3. **Import Data**
   ```bash
   npm run import:projects
   npm run import:audit-results
   ```

4. **Deploy Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

5. **Start Development**
   ```bash
   npm run dev
   ```

---

## Features Overview

### 1. Projects Management
- **Location**: Projects page (`/projects`)
- **Features**: View, filter, sort projects with finding counts
- **Import**: `npm run import:projects` from `raw_data.xlsx`
- **Recalculate**: `npm run recalc:projects`

### 2. Audit Results Dashboard
- **Location**: Audit Results page (`/audit-results`)
- **Features**: View 8,840+ audit results, filter by year/SH, export to Excel
- **Import**: `npm run import:audit-results` from `Master-finding.xlsx`
- **Data**: Unique SHA-256 IDs, linked to projects

### 3. AI Chat Assistant
- **Location**: Chat page (`/chat`)
- **Features**: 
  - Natural language queries
  - Smart filter extraction
  - Hybrid RAG system
  - Semantic search
- **Usage**: Ask questions like "Show me IT findings 2024"

### 4. Findings Table
- **Location**: Findings page (`/findings`)
- **Features**: Complete findings management with 30+ fields
- **Export**: Excel export with all data

---

## Import & Data Management

### Projects Import

**Source**: `raw_data.xlsx` (Proyek sheet)

```bash
npm run import:projects
```

**What it does**:
- Generates 7-digit unique IDs
- Links to findings table
- Calculates finding counts
- Creates/updates projects

**Troubleshooting**:
- Close Excel file before importing
- Ensure "Proyek" sheet exists
- Check Firebase credentials

### Audit Results Import

**Source**: `Master-finding.xlsx` (Master sheet)

```bash
npm run import:audit-results
```

**What it does**:
- Generates SHA-256 unique IDs
- Links to projects via projectName
- Auto-calculates nilai = bobot × kadar
- Handles duplicates

**Data Quality**:
- 8,840 unique records
- 57 duplicates detected and skipped
- 100% field completeness
- All projects matched

### Complete Reimport (if needed)

```bash
node scripts/complete-reimport-audit-results.mjs
```

**Warning**: Deletes all existing audit-results and reimports from scratch.

---

## Troubleshooting

### Common Issues

#### Import Fails
**Problem**: Permission denied or file locked

**Solutions**:
1. Close Excel file
2. Check Firebase credentials in `.env`
3. Verify service account key exists
4. Ensure Firestore is enabled

#### Missing Data
**Problem**: Records not showing in app

**Solutions**:
1. Verify import completed successfully
2. Check Firestore console for data
3. Deploy Firestore rules: `firebase deploy --only firestore:rules`
4. Clear browser cache and reload

#### Count Mismatches
**Problem**: Project counts don't match

**Solutions**:
```bash
npm run recalc:projects
# or
node scripts/fix-project-counts-from-audit-results.mjs
```

#### Permission Errors
**Problem**: "Permission denied" in app

**Solutions**:
1. Deploy Firestore rules
2. Check user is authenticated
3. Verify rules allow read/write for authenticated users

### Performance Issues

#### Slow Queries
- Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
- Check network connection
- Monitor Firestore usage in console

#### Slow Import
- Normal for large datasets (8,840+ records)
- Import runs in batches of 500
- Expected time: 3-5 minutes

---

## Key Scripts

```bash
# Development
npm run dev                    # Start development server
npm run build                  # Build for production

# Data Import
npm run import:projects        # Import projects from Excel
npm run import:audit-results   # Import audit results from Excel
npm run recalc:projects        # Recalculate project statistics

# Testing
npm run test:hybrid-rag        # Test hybrid RAG system
npm test                       # Run all tests

# Deployment
firebase deploy --only firestore:rules    # Deploy security rules
firebase deploy --only firestore:indexes  # Deploy indexes
```

---

## Data Structure

### Projects Collection
- **ID**: 7-digit generated from SH-Project-Type
- **Fields**: projectName, sh, type, subtype, finding, nonFinding, total
- **Relationships**: Links to findings and audit-results

### Audit Results Collection
- **ID**: 20-char SHA-256 hash (unique)
- **Fields**: year, sh, projectName, projectId, department, riskArea, descriptions, code, bobot, kadar, nilai
- **Relationships**: Links to projects via projectName

### Findings Collection
- **ID**: Auto-generated
- **Fields**: 30+ fields including title, description, priority, status, department, etc.
- **Relationships**: Links to projects via projectName

---

## Best Practices

### Data Import
1. Always close Excel files before importing
2. Backup data before reimporting
3. Verify counts after import
4. Deploy indexes after schema changes

### Development
1. Use TypeScript strict mode
2. Follow ESLint rules
3. Test before committing
4. Document new features

### Production
1. Deploy rules before deploying app
2. Monitor Firestore usage
3. Set up error logging
4. Regular backups

---

## Support Resources

### Documentation
- **Main README**: `README.md`
- **Project Structure**: `PROJECT-STRUCTURE.md`
- **API Reference**: `docs/api-reference.md`
- **This Guide**: `docs/CONSOLIDATED-GUIDES.md`

### Scripts Location
- **Import Scripts**: `scripts/` folder
- **Test Scripts**: Root folder (`test-*.mjs`, `test-*.ts`)

### Configuration
- **Environment**: `.env` file
- **Firebase**: `firebase.json`, `firestore.rules`, `firestore.indexes.json`
- **TypeScript**: `tsconfig.json`

---

**For detailed feature documentation, see individual files in the `docs/` folder.**
