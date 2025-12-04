#!/usr/bin/env node

/**
 * Import Audit Results from Excel (Master sheet) - ADMIN VERSION
 * 
 * This script reads the "Master" sheet from Master-finding.xlsx and imports audit results
 * into the Firestore 'audit-results' collection using Firebase Admin SDK.
 * 
 * Excel columns: Year, SH, Project Name, Department, Risk Area, Descriptions, Code, Bobot, Kadar, Nilai
 * 
 * Features:
 * - Generates 6-digit unique ID
 * - Links SH and Project Name to projects table
 * - Calculates Nilai = Bobot x Kadar
 * - Uses Admin SDK for full permissions
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
 * Generate a 6-digit unique ID from row data
 */
function generateAuditResultId(year, sh, projectName, code) {
  const combined = `${year}-${sh}-${projectName}-${code}`;

  // Create a simple hash
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to positive 6-digit number
  const positiveHash = Math.abs(hash);
  const sixDigit = (positiveHash % 900000) + 100000; // Ensures 6 digits (100000-999999)

  return sixDigit.toString();
}

/**
 * Find project ID by SH and Project Name
 */
async function findProjectId(sh, projectName) {
  try {
    const projectsRef = db.collection('projects');
    const snapshot = await projectsRef
      .where('sh', '==', sh)
      .where('projectName', '==', projectName)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      return snapshot.docs[0].data().projectId;
    }
    return null;
  } catch (error) {
    console.error(`Error finding project for SH: ${sh}, Project: ${projectName}:`, error);
    return null;
  }
}

/**
 * No authentication needed - Admin SDK uses service account
 */
async function authenticate() {
  console.log('🔐 Using Firebase Admin SDK with service account...');
  console.log('✅ Admin authentication ready!\n');
}

/**
 * Import audit results from Excel
 */
async function importAuditResults() {
  console.log('📊 Starting audit results import from Excel...\n');

  // Read Excel file
  const excelPath = join(__dirname, '..', 'Master-finding.xlsx');

  let workbook;
  try {
    console.log(`📂 Reading file: ${excelPath}`);
    
    // Try reading with different options for Windows compatibility
    try {
      workbook = XLSX.readFile(excelPath);
    } catch (err1) {
      console.log('⚠️  Standard read failed, trying with cellDates option...');
      try {
        workbook = XLSX.readFile(excelPath, { cellDates: true });
      } catch (err2) {
        console.log('⚠️  cellDates read failed, trying with FS option...');
        const fs = await import('fs');
        const buffer = fs.readFileSync(excelPath);
        workbook = XLSX.read(buffer, { type: 'buffer' });
      }
    }
    
    console.log('✅ File read successfully!');
  } catch (error) {
    console.error('\n❌ Cannot read Excel file. Please make sure:');
    console.error('   1. The file "Master-finding.xlsx" exists in the project root');
    console.error('   2. The file is NOT open in Excel or another program');
    console.error('   3. You have read permissions for the file');
    console.error('   4. Try closing Excel completely and run the script again\n');
    console.error('Error details:', error.message);
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

  let imported = 0;
  let skipped = 0;
  let updated = 0;

  for (const row of data) {
    try {
      // Map Excel columns to audit result fields
      const year = row['Year'] || '';
      const sh = row['SH'] || '';
      const projectName = row['Project Name'] || '';
      const department = row['Department'] || '';
      const riskArea = row['Risk Area'] || '';
      const descriptions = row['Descriptions'] || '';
      const code = row['Code'] || '';
      const bobot = parseFloat(row['Bobot']) || 0;
      const kadar = parseFloat(row['Kadar']) || 0;

      // Calculate Nilai = Bobot x Kadar
      const nilai = bobot * kadar;

      // Skip if essential fields are missing
      if (!sh || !projectName) {
        console.log(`⚠️  Skipping row - missing SH or Project Name`);
        skipped++;
        continue;
      }

      // Generate 6-digit audit result ID
      const auditResultId = generateAuditResultId(year, sh, projectName, code);

      // Find linked project ID
      const projectId = await findProjectId(sh, projectName);
      if (!projectId) {
        console.log(`⚠️  Warning: No matching project found for SH: ${sh}, Project: ${projectName}`);
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
        // Update existing audit result
        const docId = existingQuery.docs[0].id;
        await auditResultsRef.doc(docId).update(auditResultData);
        console.log(`✅ Updated: ${projectName} - ${code} (ID: ${auditResultId})`);
        updated++;
      } else {
        // Create new audit result
        auditResultData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        auditResultData.createdBy = 'excel-import';

        await auditResultsRef.add(auditResultData);
        console.log(`✨ Created: ${projectName} - ${code} (ID: ${auditResultId})`);
        imported++;
      }

    } catch (error) {
      console.error(`❌ Error processing row:`, error.message);
      skipped++;
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

// Run import with authentication
authenticate()
  .then(() => importAuditResults())
  .then(() => {
    console.log('\n✅ Import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });
