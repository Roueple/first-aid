#!/usr/bin/env node

/**
 * Import Audit Results from audit-result.xlsx
 * 
 * This script reads audit-result.xlsx and imports/updates audit results
 * into the Firestore 'audit-results' collection using Firebase Admin SDK.
 * 
 * Features:
 * - Uses existing Audit Result ID from Excel (20-char SHA-256 prefix)
 * - Maps Project Name to projectName in projects table
 * - Updates existing records or creates new ones
 * - Handles all 8,840+ audit results
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
 * Find project by projectName
 */
async function findProjectByName(projectName) {
  try {
    const projectsRef = db.collection('projects');
    const snapshot = await projectsRef
      .where('projectName', '==', projectName)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const projectData = snapshot.docs[0].data();
      return {
        projectId: projectData.projectId,
        docId: snapshot.docs[0].id
      };
    }
    return null;
  } catch (error) {
    console.error(`Error finding project: ${projectName}:`, error);
    return null;
  }
}

/**
 * Import audit results from Excel
 */
async function importAuditResults() {
  console.log('📊 Starting audit results import from audit-result.xlsx...\n');

  // Read Excel file
  const excelPath = join(__dirname, '..', 'audit-result.xlsx');

  let workbook;
  try {
    console.log(`📂 Reading file: ${excelPath}`);
    
    // Try multiple methods to read the file
    try {
      workbook = XLSX.readFile(excelPath);
    } catch (err1) {
      console.log('⚠️  Standard read failed, trying with buffer method...');
      const fs = await import('fs');
      const buffer = fs.readFileSync(excelPath);
      workbook = XLSX.read(buffer, { type: 'buffer' });
    }
    
    console.log('✅ File read successfully!');
  } catch (error) {
    console.error('\n❌ Cannot read Excel file. Please make sure:');
    console.error('   1. The file "audit-result.xlsx" exists in the project root');
    console.error('   2. The file is NOT open in Excel or another program');
    console.error('   3. You have read permissions for the file');
    console.error('   4. Try closing Excel completely and run the script again\n');
    console.error('Error details:', error.message);
    throw error;
  }

  // Get first sheet (Audit Results)
  const sheetName = workbook.SheetNames[0];
  console.log(`📋 Reading sheet: ${sheetName}`);
  
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  console.log(`📋 Found ${data.length} audit results in Excel\n`);

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let projectNotFound = 0;

  // Cache for project lookups
  const projectCache = new Map();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    try {
      // Map Excel columns
      const auditResultId = row['Audit Result ID'] || '';
      const year = parseInt(row['Year']) || 0;
      const sh = row['SH'] || '';
      const projectName = row['Project Name'] || '';
      const department = row['Department'] || '';
      const riskArea = row['Risk Area'] || '';
      const description = row['Description'] || '';
      const code = row['Code'] || '';
      const bobot = parseFloat(row['Bobot']) || 0;
      const kadar = parseFloat(row['Kadar']) || 0;
      const nilai = parseFloat(row['Nilai']) || 0;
      const createdBy = row['Created By'] || 'excel-import';

      // Skip if essential fields are missing
      if (!auditResultId || !projectName) {
        console.log(`⚠️  Row ${i + 1}: Skipping - missing Audit Result ID or Project Name`);
        skipped++;
        continue;
      }

      // Find linked project (with caching)
      let projectInfo = projectCache.get(projectName);
      if (!projectInfo) {
        projectInfo = await findProjectByName(projectName);
        if (projectInfo) {
          projectCache.set(projectName, projectInfo);
        }
      }

      if (!projectInfo) {
        console.log(`⚠️  Row ${i + 1}: Project not found: ${projectName}`);
        projectNotFound++;
      }

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
        projectId: projectInfo?.projectId || null,
        department,
        riskArea,
        description,
        code,
        bobot,
        kadar,
        nilai,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'excel-import',
      };

      if (!existingQuery.empty) {
        // Update existing audit result
        const docId = existingQuery.docs[0].id;
        await auditResultsRef.doc(docId).update(auditResultData);
        updated++;
        
        if ((updated + imported) % 100 === 0) {
          console.log(`Progress: ${updated + imported}/${data.length} processed...`);
        }
      } else {
        // Create new audit result
        auditResultData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        auditResultData.createdBy = createdBy;

        await auditResultsRef.add(auditResultData);
        imported++;
        
        if ((updated + imported) % 100 === 0) {
          console.log(`Progress: ${updated + imported}/${data.length} processed...`);
        }
      }

    } catch (error) {
      console.error(`❌ Row ${i + 1}: Error processing:`, error.message);
      skipped++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Import Summary:');
  console.log(`   ✨ Created: ${imported}`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
  console.log(`   🔍 Projects not found: ${projectNotFound}`);
  console.log(`   📋 Total rows: ${data.length}`);
  console.log('='.repeat(60));
}

// Run import
console.log('🔐 Using Firebase Admin SDK with service account...');
console.log('✅ Admin authentication ready!\n');

importAuditResults()
  .then(() => {
    console.log('\n✅ Import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });
