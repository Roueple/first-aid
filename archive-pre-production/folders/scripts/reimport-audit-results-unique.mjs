#!/usr/bin/env node

/**
 * Re-import Audit Results with Unique Identifier Format
 * 
 * Unique ID Format: [ProjectInitial]-[First 3 letters of Department]-[F/NF]-[Count]
 * Example: CWSACCF01 (Citra World Surabaya - Accounting - Finding - 01)
 * 
 * This script:
 * 1. Clears existing audit-results collection
 * 2. Reads Master-finding.xlsx
 * 3. Fetches project initials from projects table
 * 4. Groups findings by Project + Department + Type (F/NF)
 * 5. Generates unique sequential IDs
 * 6. Imports to Firestore audit-results collection
 */

import admin from 'firebase-admin';
import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
const serviceAccountPath = join(__dirname, '..', 'serviceaccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

/**
 * Clear all documents in audit-results collection
 */
async function clearAuditResults() {
  console.log('🗑️  Clearing existing audit-results...');
  
  const auditResultsRef = db.collection('audit-results');
  const snapshot = await auditResultsRef.get();
  
  if (snapshot.empty) {
    console.log('   ℹ️  Collection is already empty\n');
    return;
  }
  
  const batchSize = 500;
  let deleted = 0;
  
  while (true) {
    const batch = db.batch();
    const docs = await auditResultsRef.limit(batchSize).get();
    
    if (docs.empty) break;
    
    docs.forEach(doc => {
      batch.delete(doc.ref);
      deleted++;
    });
    
    await batch.commit();
    console.log(`   🗑️  Deleted ${deleted} documents...`);
  }
  
  console.log(`✅ Cleared ${deleted} existing audit results\n`);
}

/**
 * Fetch all projects with their initials
 */
async function fetchAllProjects() {
  console.log('🔍 Fetching all projects with initials...');
  
  const projectsRef = db.collection('projects');
  const snapshot = await projectsRef.get();
  
  const projectMap = new Map();
  let withInitials = 0;
  let withoutInitials = 0;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const key = `${data.sh}-${data.projectName}`;
    
    if (data.initials) {
      projectMap.set(key, {
        projectId: data.projectId,
        initials: data.initials,
        projectName: data.projectName
      });
      withInitials++;
    } else {
      withoutInitials++;
      console.log(`   ⚠️  No initials: ${data.projectName}`);
    }
  });
  
  console.log(`✅ Found ${withInitials} projects with initials`);
  if (withoutInitials > 0) {
    console.log(`⚠️  ${withoutInitials} projects without initials (will be skipped)\n`);
  } else {
    console.log('');
  }
  
  return projectMap;
}

/**
 * Generate unique audit result ID
 * Format: [ProjectInitial]-[Dept3Letters]-[F/NF]-[YY]-[Count]
 * Example: CWSACCF2201 (Citra World Surabaya - Accounting - Finding - 2022 - 01)
 */
function generateUniqueId(projectInitial, department, code, year, count) {
  // Get first 3 letters of department (uppercase, letters only)
  const deptCode = department
    .replace(/[^a-zA-Z]/g, '') // Remove non-letters
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X'); // Pad with X if less than 3 letters
  
  // Determine F (Finding) or NF (Non-Finding)
  const findingType = (code && code.trim().toUpperCase() === 'F') ? 'F' : 'NF';
  
  // Get last 2 digits of year (2022 -> 22, 2023 -> 23)
  const yearStr = year ? year.toString().slice(-2) : '00';
  
  // Format count as 2-digit number (01, 02, etc.)
  const countStr = count.toString().padStart(2, '0');
  
  // Combine: ProjectInitial + DeptCode + FindingType + Year + Count
  return `${projectInitial}${deptCode}${findingType}${yearStr}${countStr}`;
}

/**
 * Group audit results by Project + Department + Type + Year
 */
function groupAuditResults(data, projectMap) {
  console.log('📦 Grouping audit results by project, department, type, and year...');
  
  const groups = new Map();
  let skippedNoProject = 0;
  
  for (const row of data) {
    const sh = row['SH'] || '';
    const projectName = row['Project Name'] || '';
    const department = row['Department'] || '';
    const code = row['Code'] || '';
    const year = row['Year'] || '';
    
    // Skip if essential fields are missing
    if (!sh || !projectName || !department || !year) {
      continue;
    }
    
    // Get project data
    const projectKey = `${sh}-${projectName}`;
    const projectData = projectMap.get(projectKey);
    
    if (!projectData) {
      skippedNoProject++;
      continue;
    }
    
    // Determine finding type
    const findingType = (code && code.trim().toUpperCase() === 'F') ? 'F' : 'NF';
    
    // Create group key: ProjectInitials-Department-Type-Year
    const groupKey = `${projectData.initials}-${department}-${findingType}-${year}`;
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        projectData,
        department,
        findingType,
        year,
        rows: []
      });
    }
    
    groups.get(groupKey).rows.push(row);
  }
  
  console.log(`✅ Created ${groups.size} groups`);
  if (skippedNoProject > 0) {
    console.log(`⚠️  Skipped ${skippedNoProject} rows (no matching project with initial)\n`);
  } else {
    console.log('');
  }
  
  return groups;
}

/**
 * Import audit results from Excel
 */
async function importAuditResults() {
  console.log('📊 Starting audit results re-import with unique IDs...\n');

  // Step 1: Clear existing data
  await clearAuditResults();

  // Step 2: Read Excel file
  const excelPath = join(__dirname, '..', 'Master-finding.xlsx');

  let workbook;
  try {
    console.log(`📂 Reading file: ${excelPath}`);
    
    try {
      workbook = XLSX.readFile(excelPath);
    } catch (err1) {
      console.log('⚠️  Standard read failed, trying with cellDates option...');
      try {
        workbook = XLSX.readFile(excelPath, { cellDates: true });
      } catch (err2) {
        console.log('⚠️  cellDates read failed, trying with buffer...');
        const fs = await import('fs');
        const buffer = fs.readFileSync(excelPath);
        workbook = XLSX.read(buffer, { type: 'buffer' });
      }
    }
    
    console.log('✅ File read successfully!\n');
  } catch (error) {
    console.error('❌ Cannot read Excel file:', error.message);
    throw error;
  }

  // Get "Master" sheet
  const sheetName = 'Master';
  if (!workbook.SheetNames.includes(sheetName)) {
    console.error(`❌ Sheet "${sheetName}" not found in Excel file`);
    console.log('Available sheets:', workbook.SheetNames);
    return;
  }

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  console.log(`📋 Found ${data.length} audit results in Excel\n`);

  // Step 3: Fetch all projects with initials
  const projectMap = await fetchAllProjects();

  // Step 4: Group audit results
  const groups = groupAuditResults(data, projectMap);

  // Step 5: Import with unique IDs
  console.log('💾 Importing audit results to Firestore...\n');
  
  let imported = 0;
  let errors = 0;

  for (const [groupKey, groupData] of groups) {
    const { projectData, department, findingType, year, rows } = groupData;
    
    console.log(`📁 ${groupKey} (${rows.length} items)`);
    
    let count = 1;
    
    for (const row of rows) {
      try {
        const rowYear = row['Year'] || '';
        const sh = row['SH'] || '';
        const projectName = row['Project Name'] || '';
        const riskArea = row['Risk Area'] || '';
        const descriptions = row['Descriptions'] || '';
        const code = row['Code'] || '';
        const bobot = parseFloat(row['Bobot']) || 0;
        const kadar = parseFloat(row['Kadar']) || 0;
        const nilai = bobot * kadar;

        // Generate unique ID with year
        const auditResultId = generateUniqueId(projectData.initials, department, code, rowYear, count);

        const auditResultData = {
          auditResultId,
          year: rowYear,
          sh,
          projectName,
          projectId: projectData.projectId,
          department,
          riskArea,
          descriptions,
          code,
          bobot,
          kadar,
          nilai,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'excel-reimport-unique',
        };

        await db.collection('audit-results').add(auditResultData);
        
        console.log(`   ✅ ${auditResultId}: ${descriptions.substring(0, 60)}...`);
        imported++;
        count++;

      } catch (error) {
        console.error(`   ❌ Error:`, error.message);
        errors++;
      }
    }
    
    console.log('');
  }

  console.log('='.repeat(70));
  console.log('📊 Import Summary:');
  console.log(`   ✨ Successfully imported: ${imported}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📋 Total rows in Excel: ${data.length}`);
  console.log('='.repeat(70));
}

// Run import
console.log('🔐 Using Firebase Admin SDK...\n');

importAuditResults()
  .then(() => {
    console.log('\n✅ Re-import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });
