# Excel File Replacement Checklist

## 📋 Overview

You want to replace the current database with data from:
- `Project_Master.xlsx` → **projects** collection
- `Master_Audit_Data.xlsx` → **audit_results** collection

## ⚠️ CRITICAL NOTES BEFORE REPLACEMENT

### 1. **BACKUP YOUR CURRENT DATA FIRST!**
```bash
# Export current data before replacement
firebase firestore:export gs://your-bucket/backup-$(date +%Y%m%d)
```

### 2. **This is a DESTRUCTIVE operation**
- All existing projects will be DELETED
- All existing audit_results will be DELETED
- This cannot be undone without a backup

---

## 📊 Expected Excel Structure

### Project_Master.xlsx Requirements

**Expected columns:**
| Column Name | Required | Type | Notes |
|------------|----------|------|-------|
| **Proyek** | ✅ Yes | Text | Project name (must be unique) |
| **SH** | ✅ Yes | Text | Subholding code |
| **TBK** | ⚠️ Optional | Text | TBK identifier |
| **Indtr** | ⚠️ Optional | Text | Industry |
| **Category** | ⚠️ Optional | Text | Project category |
| **Location** | ⚠️ Optional | Text | Project location |
| **Tag** | ⚠️ Optional | Text | Comma-separated tags |

**What will be stored in database:**
```javascript
{
  projectName: "Project ABC",      // from "Proyek" column
  sh: "SH-001",                    // from "SH" column
  tbk: "TBK-XYZ",                  // from "TBK" column
  industry: "Real Estate",         // from "Indtr" column
  category: "Hotel",               // from "Category" column
  location: "Jakarta",             // from "Location" column
  tags: ["luxury", "5-star"],      // from "Tag" column (split by comma)
  createdAt: Timestamp,
  updatedAt: Timestamp,
  isActive: true
}
```

### Master_Audit_Data.xlsx Requirements

**Expected columns:**
| Column Name | Required | Type | Notes |
|------------|----------|------|-------|
| **Proyek** | ✅ Yes | Text | Must match project name in projects table |
| **Subholding** | ✅ Yes | Text | Subholding code |
| **Year** | ✅ Yes | Number | Audit year (e.g., 2024) |
| **Departemen** | ✅ Yes | Text | Department name |
| **Risk Area** | ✅ Yes | Text | Risk area description |
| **Deskripsi** | ✅ Yes | Text | Finding description |
| **Kode** | ✅ Yes | Text | Finding code (F/NF) |
| **Bobot** | ✅ Yes | Number | Weight value |
| **Kadar** | ✅ Yes | Number | Severity value |
| **Nilai** | ✅ Yes | Number | Calculated value (bobot × kadar) |
| **Temuan Ulangan** | ⚠️ Optional | Number | Repeat finding indicator (0 or 1) |

**What will be stored in database:**
```javascript
{
  projectName: "Project ABC",      // from "Proyek" column
  subholding: "SH-001",           // from "Subholding" column
  year: 2024,                     // from "Year" column (as integer)
  department: "IT",               // from "Departemen" column
  riskArea: "Cybersecurity",      // from "Risk Area" column
  description: "Finding details", // from "Deskripsi" column
  code: "F",                      // from "Kode" column
  weight: 3,                      // from "Bobot" column
  severity: 4,                    // from "Kadar" column
  value: 12,                      // from "Nilai" column
  isRepeat: 0,                    // from "Temuan Ulangan" column
  uniqueId: "abc123...",          // Auto-generated SHA-256 hash
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## 🔍 What to Check in Your Excel Files

### ✅ Project_Master.xlsx Checklist

1. **File location**: `C:\Users\IA-GERALDI\WORKPAPER\Proyek\Ongoing\IA2025\FIRST-AID\Project_Master.xlsx`

2. **Sheet name**: First sheet will be used (check it's the correct one)

3. **Required columns present**:
   - [ ] "Proyek" column exists
   - [ ] "SH" column exists

4. **Data quality**:
   - [ ] No duplicate project names in "Proyek" column
   - [ ] No empty cells in "Proyek" column
   - [ ] No empty cells in "SH" column
   - [ ] Project names are consistent (will be used to link audit results)

5. **Optional columns** (if present, will be imported):
   - [ ] "TBK" column
   - [ ] "Indtr" column
   - [ ] "Category" column
   - [ ] "Location" column
   - [ ] "Tag" column (comma-separated values)

### ✅ Master_Audit_Data.xlsx Checklist

1. **File location**: `C:\Users\IA-GERALDI\WORKPAPER\Proyek\Ongoing\IA2025\FIRST-AID\Master_Audit_Data.xlsx`

2. **Sheet name**: First sheet will be used (check it's the correct one)

3. **Required columns present**:
   - [ ] "Proyek" column exists
   - [ ] "Subholding" column exists
   - [ ] "Year" column exists
   - [ ] "Departemen" column exists
   - [ ] "Risk Area" column exists
   - [ ] "Deskripsi" column exists
   - [ ] "Kode" column exists
   - [ ] "Bobot" column exists
   - [ ] "Kadar" column exists
   - [ ] "Nilai" column exists

4. **Data quality**:
   - [ ] "Proyek" values match project names in Project_Master.xlsx
   - [ ] "Year" column contains valid numbers (e.g., 2022, 2023, 2024, 2025)
   - [ ] "Bobot" column contains valid numbers
   - [ ] "Kadar" column contains valid numbers
   - [ ] "Nilai" column contains valid numbers
   - [ ] No critical empty cells in required columns

5. **Data consistency**:
   - [ ] Project names are spelled exactly the same as in Project_Master.xlsx
   - [ ] Subholding codes are consistent
   - [ ] Department names are normalized

---

## 🚨 Common Issues to Watch For

### Issue 1: Column Name Mismatch
**Problem**: Script expects "Proyek" but your file has "Project Name"
**Solution**: Rename columns in Excel to match expected names exactly

### Issue 2: Project Name Mismatch
**Problem**: Audit results reference "Hotel ABC" but projects table has "Hotel ABC Project"
**Solution**: Ensure project names are EXACTLY the same in both files (case-sensitive)

### Issue 3: Missing Required Columns
**Problem**: Script fails because "Risk Area" column is missing
**Solution**: Add all required columns, even if some cells are empty

### Issue 4: Invalid Data Types
**Problem**: "Year" column contains text like "2024-01-01" instead of number 2024
**Solution**: Ensure numeric columns contain only numbers

### Issue 5: Duplicate Projects
**Problem**: Multiple rows with same project name in Project_Master.xlsx
**Solution**: Remove duplicates or merge them

---

## 🔧 How to Update the Import Script

The current script expects these file names:
- `Master Proyek.xlsx` (with space)
- `master_audit_2022_2025.xlsx`

But your files are named:
- `Project_Master.xlsx`
- `Master_Audit_Data.xlsx`

### Option 1: Rename Your Files (Easiest)
```bash
# In the FIRST-AID directory
copy "Project_Master.xlsx" "Master Proyek.xlsx"
copy "Master_Audit_Data.xlsx" "master_audit_2022_2025.xlsx"
```

### Option 2: Update the Script
Edit `scripts/drop-and-import-new-tables.mjs`:

**Line 67** - Change:
```javascript
const filePath = join(rootDir, 'Master Proyek.xlsx');
```
To:
```javascript
const filePath = join(rootDir, 'Project_Master.xlsx');
```

**Line 109** - Change:
```javascript
const filePath = join(rootDir, 'master_audit_2022_2025.xlsx');
```
To:
```javascript
const filePath = join(rootDir, 'Master_Audit_Data.xlsx');
```

---

## 📝 Step-by-Step Replacement Process

### Step 1: Prepare Your Files
```bash
# Navigate to project directory
cd C:\Users\IA-GERALDI\WORKPAPER\Proyek\Ongoing\IA2025\FIRST-AID

# Copy files to root (if not already there)
copy "Project_Master.xlsx" "Master Proyek.xlsx"
copy "Master_Audit_Data.xlsx" "master_audit_2022_2025.xlsx"
```

### Step 2: Backup Current Data (IMPORTANT!)
```bash
# Option A: Export via Firebase CLI
firebase firestore:export gs://your-bucket/backup

# Option B: Use Firestore console
# Go to Firestore → Import/Export → Export
```

### Step 3: Verify Excel Files
- [ ] Open both Excel files
- [ ] Check column names match expected names
- [ ] Check for empty required cells
- [ ] Check project names are consistent between files
- [ ] Close Excel files before running import

### Step 4: Run the Import
```bash
node scripts/drop-and-import-new-tables.mjs
```

### Step 5: Verify Import
```bash
# Check counts
# Expected output:
# ✅ Migration Complete!
#    Projects: XXX
#    Audit Results: YYY
```

### Step 6: Test in Application
- [ ] Open FIRST-AID application
- [ ] Navigate to Projects page
- [ ] Verify projects are displayed
- [ ] Navigate to Bernard (chat) page
- [ ] Test query: "Show me audit results from 2024"
- [ ] Verify audit results are returned

---

## 🎯 Quick Validation Queries

After import, test these in Bernard chat:

```
1. "How many projects do we have?"
2. "Show me all projects"
3. "Show me audit results from 2024"
4. "What are the findings for [your project name]?"
5. "Show me IT department audit results"
```

---

## 🆘 Troubleshooting

### Error: "Cannot find module"
**Solution**: Run `npm install` first

### Error: "ENOENT: no such file or directory"
**Solution**: Check file paths and names are correct

### Error: "Sheet not found"
**Solution**: Verify Excel files have data in the first sheet

### Error: "Column 'Proyek' not found"
**Solution**: Check column names in Excel match expected names exactly

### Import succeeds but no data shows
**Solution**: 
1. Check Firestore console to verify data was imported
2. Check browser console for errors
3. Verify Firebase indexes are deployed

---

## 📞 Need Help?

If you encounter issues:
1. Check the error message carefully
2. Verify all checklist items above
3. Check Firestore console for imported data
4. Review browser console for errors
5. Check that column names match exactly

---

## ✅ Final Checklist Before Running

- [ ] Backed up current database
- [ ] Verified Project_Master.xlsx has correct columns
- [ ] Verified Master_Audit_Data.xlsx has correct columns
- [ ] Project names are consistent between both files
- [ ] Closed both Excel files
- [ ] Updated script file paths (if needed)
- [ ] Ready to run `node scripts/drop-and-import-new-tables.mjs`

**⚠️ REMEMBER: This will DELETE all existing data!**
