#!/usr/bin/env node

/**
 * Import Audit Results from Excel with Unique Identifier Format
 * 
 * Unique ID Format: [Project Initial]-[First 3 letters of Department]-[F/NF]-[Count]
 * Example: CWSACCF01 (Citra World Surabaya - Accounting - Finding - 01)
 * 
 * This script:
 * 1. Reads Master-finding.xlsx
 * 2. Groups findings by Project + Department + Type (F/NF)
 * 3. Generates unique sequential IDs
 * 4. Imports to Firestore audit-results collection
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
 * Get project initial from projects collection
 */
async function getProjectInitial(sh, projectName) {
  try {
    const projectsRef = db.collection('projects');
    const snapshot = await projectsRef
      .where('sh', '==', sh)
      .where('projectName', '==', projectName)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const projectData = snapshot.docs[0].data();
      return {
        projectId: projectData.projectId,
        initial: projectData.initial || null
      };
    }
    return { projectId: null, initial: null };
  } catch (error) {
    console.error(`Error finding project for SH: ${sh}, Project: ${projectName}:`, error);
    return { projectId: null, initial: null };
  }
}

/**
 * Generate unique audit result ID
 * Format: [ProjectInitial]-[Dept3Letters]-[F/NF]-[Count]
 * Example: CWSACCF01
 */
function generateUniqueId(projectInitial, department, code, count) {
  // Get first 3 letters of department (uppercase)
  const deptCode = department.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
  
  // Determine F (Finding) or NF (Non-Finding) based on code
  const findingType = code && code.trim() !== '' ? 'F' : 'NF';
  
  // Format count as 2-digit number (01, 02, etc.)
  const countStr = count.toString().padStart(2, '0');
  
  // Combine: ProjectInitial + DeptCode + FindingType + Count
  return `${projectInitial}${deptCode}${findingType}${countStr}`;
}

/**
 * Group audit results by Project + Department + Type
 */
function groupAuditResults(data, projectInitials) {
  const groups = new Map();
  
  for (const row of data) {
    const sh = row['SH'] || '';
    const projectName = row['Project Name'] || '';
    const department = row['Department'] || '';
    const code = row['Code'] || '';
    
    // Skip if essential fields are missing
    if (!sh || !projectName || !department) {
      continue;
    }
    
    // Get project initial
    const projectKey = `${sh}-${projectName}`;
    const projectInitial = projectInitials.get(projectKey);
    
    if (!projectInitial) {
      console.log(`⚠️  Warning: No initial found for ${projectName}`);
      continue;
    }
    
    // Determine finding type
    const findingType = code && code.trim() !== '' ? 'F' : 'NF';
    
    // Create group key: ProjectInitial-Department-Type
    const groupKey = `${projectInitial}-${department}-${findingType}`;
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    
    groups.get(groupKey).push(row);
  }
  
  return groups;
}

/**
 * Import audit results from Excel
 */
async function importAuditResults() {
  console.log('📊 Starting audit results import with unique IDs...\n');

  // Read Excel file
  const excelPath = 'C:\\Users\\IA-GERALDI\\WORKPAPER\\Proyek\\Ongoing\\IA2025\\FIRST-AID\\Master-finding.xlsx';

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
    
    console.log('✅ File read successfully!');
  } catch (error) {
    console.error('\n❌ Cannot read Excel file:', error.message);
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

  // Step 1: Fetch all project initials
  console.log('🔍 Fetching project initials...');
  const projectInitials = new Map();
  const projectIds = new Map();
  
  for (const row of data) {
    const sh = row['SH'] || '';
    const projectName = row['Project Name'] || '';
    
    if (!sh || !projectName) continue;
    
    const projectKey = `${sh}-${projectName}`;
    if (!projectInitials.has(projectKey)) {
      const { projectId, initial } = await getProjectInitial(sh, projectName);
      if (initial) {
        projectInitials.set(projectKey, initial);
        projectIds.set(projectKey, projectId);
        console.log(`   ✓ ${projectName}: ${initial}`);
      } else {
        console.log(`   ⚠️  ${projectName}: No initial found`);
      }
    }
  }
  
  console.log(`\n✅ Found ${projectInitials.size} projects with initials\n`);

  // Step 2: Group audit results
  console.log('📦 Grouping audit results...');
  const groups = groupAuditResults(data, projectInitials);
  console.log(`✅ Created ${groups.size} groups\n`);

  // Step 3: Import with unique IDs
  console.log('💾 Importing audit results...\n');
  
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const [groupKey, rows] of groups) {
    console.log(`\n📁 Processing group: ${groupKey} (${rows.length} items)`);
    
    let count = 1;
    
    for (const row of rows) {
      try {
        const year = row['Year'] || '';
        const sh = row['SH'] || '';
        const projectName = row['Project Name'] || '';
        const department = row['Department'] || '';
        const riskArea = row['Risk Area'] || '';
        const descriptions = row['Descriptions'] || '';
        const code = row['Code'] || '';
        const bobot = parseFloat(row['Bobot']) || 0;
        const kadar = parseFloat(row['Kadar']) || 0;
        const nilai = bobot * kadar;

        // Get project data
        const projectKey = `${sh}-${projectName}`;
        const projectInitial = projectInitials.get(projectKey);
        const projectId = projectIds.get(projectKey);

        // Generate unique ID
        const auditResultId = generateUniqueId(projectInitial, department, code, count);

        // Check if audit result already exists
        const auditResultsRef = db.collection('audit-results');
        const existingQuery = await auditResultsRef
          .where('auditResultId', '==', auditResultId)
          .limit(1)
          .get();

        const auditResultData = {
          auditResultId,
          year,
          sh,
          projectName,
          projectId: projectId || null,
          department,
          riskArea,
          descriptions,
          code,
          bobot,
          kadar,
          nilai,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (!existingQuery.empty) {
          // Update existing
          const docId = existingQuery.docs[0].id;
          await auditResultsRef.doc(docId).update(auditResultData);
          console.log(`   ✅ Updated: ${auditResultId} - ${descriptions.substring(0, 50)}...`);
          updated++;
        } else {
          // Create new
          auditResultData.createdAt = admin.firestore.FieldValue.serverTimestamp();
          auditResultData.createdBy = 'excel-import-unique';

          await auditResultsRef.add(auditResultData);
          console.log(`   ✨ Created: ${auditResultId} - ${descriptions.substring(0, 50)}...`);
          imported++;
        }

        count++;

      } catch (error) {
        console.error(`   ❌ Error processing row:`, error.message);
        skipped++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Import Summary:');
  console.log(`   ✨ Created: ${imported}`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
  console.log(`   📋 Total: ${data.length}`);
  console.log('='.repeat(60));
}

// Run import
console.log('🔐 Using Firebase Admin SDK...\n');

importAuditResults()
  .then(() => {
    console.log('\n✅ Import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });
