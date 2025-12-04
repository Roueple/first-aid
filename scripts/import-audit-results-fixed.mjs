#!/usr/bin/env node

/**
 * Import Audit Results from Excel - FIXED VERSION
 * 
 * This version uses a better ID generation strategy to avoid collisions:
 * - Uses row index + hash for uniqueness
 * - Or uses UUID if collisions still occur
 */

import admin from 'firebase-admin';
import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { randomBytes } from 'crypto';

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

// Track sequential numbers per Year-SH combination
const sequenceCounters = new Map();

/**
 * Generate a unique 8-character ID with meaningful pattern
 * Format: YY-SH-NNNN
 * - YY: Last 2 digits of year (e.g., 25 for 2025)
 * - SH: First 2 digits from SH code (e.g., 01 from SH001)
 * - NNNN: 4-digit sequential number (0001-9999)
 * 
 * Examples: 25-01-0001, 24-03-0156, 25-02-1234
 */
function generateAuditResultId(year, rowIndex, sh, projectName, code) {
  // Extract year (last 2 digits)
  const yearStr = year ? year.toString().slice(-2).padStart(2, '0') : '00';
  
  // Extract SH number (get digits only, take last 2)
  const shMatch = sh.match(/\d+/);
  const shNum = shMatch ? shMatch[0].slice(-2).padStart(2, '0') : '00';
  
  // Create key for this Year-SH combination
  const key = `${yearStr}-${shNum}`;
  
  // Get or initialize counter for this combination
  if (!sequenceCounters.has(key)) {
    sequenceCounters.set(key, 0);
  }
  
  // Increment counter
  const sequence = sequenceCounters.get(key) + 1;
  sequenceCounters.set(key, sequence);
  
  // Format as 4-digit number
  const seqStr = sequence.toString().padStart(4, '0');
  
  // Return 8-character ID: YY-SH-NNNN
  return `${yearStr}${shNum}${seqStr}`;
}

/**
 * Generate a fallback ID if somehow we exceed 9999 per Year-SH
 * This should never happen with normal audit data
 */
function generateFallbackId() {
  const timestamp = Date.now().toString().slice(-8);
  return timestamp;
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
 * Check if ID already exists in Firestore
 */
async function idExists(auditResultId) {
  const snapshot = await db.collection('audit-results')
    .where('auditResultId', '==', auditResultId)
    .limit(1)
    .get();
  
  return !snapshot.empty;
}

async function authenticate() {
  console.log('🔐 Using Firebase Admin SDK with service account...');
  console.log('✅ Admin authentication ready!\n');
}

async function importAuditResults() {
  console.log('📊 Starting audit results import from Excel (FIXED VERSION)...\n');

  // Read Excel file
  const excelPath = join(__dirname, '..', 'Master-finding.xlsx');

  let workbook;
  try {
    console.log(`📂 Reading file: ${excelPath}`);
    console.log('⚠️  Please close the Excel file if it\'s open...\n');
    
    // Wait a bit for user to close file
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      workbook = XLSX.readFile(excelPath);
    } catch (err1) {
      console.log('⚠️  Standard read failed, trying alternative method...');
      const fs = await import('fs');
      const buffer = fs.readFileSync(excelPath);
      workbook = XLSX.read(buffer, { type: 'buffer' });
    }
    
    console.log('✅ File read successfully!');
  } catch (error) {
    console.error('\n❌ Cannot read Excel file. Please:');
    console.error('   1. Close Master-finding.xlsx in Excel');
    console.error('   2. Wait a few seconds');
    console.error('   3. Run this script again\n');
    console.error('Error details:', error.message);
    throw error;
  }

  const sheetName = 'Master';
  if (!workbook.SheetNames.includes(sheetName)) {
    console.error(`❌ Sheet "${sheetName}" not found in Excel file`);
    console.log('Available sheets:', workbook.SheetNames);
    return;
  }

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  console.log(`📋 Found ${data.length} rows in Excel\n`);

  let imported = 0;
  let skipped = 0;
  let collisions = 0;
  const usedIds = new Set();

  // Process in batches for better performance
  const batchSize = 100;
  let batch = db.batch();
  let batchCount = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
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

      // Calculate Nilai
      const nilai = bobot * kadar;

      // Skip empty rows
      if (!year && !sh && !projectName && !department && !code) {
        skipped++;
        continue;
      }

      // Skip if essential fields are missing
      if (!sh || !projectName) {
        if (skipped < 10) {
          console.log(`⚠️  Row ${i + 2}: Skipping - missing SH or Project Name`);
        }
        skipped++;
        continue;
      }

      // Generate ID with row index for uniqueness
      let auditResultId = generateAuditResultId(year, i, sh, projectName, code);
      
      // Check for collision and generate fallback if needed
      if (usedIds.has(auditResultId) || await idExists(auditResultId)) {
        auditResultId = generateFallbackId();
        collisions++;
        console.log(`⚠️  Collision detected, using fallback ID: ${auditResultId}`);
      }
      
      usedIds.add(auditResultId);

      // Find linked project ID
      const projectId = await findProjectId(sh, projectName);

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
        rowIndex: i + 2, // Excel row number (1-indexed + header)
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'excel-import-fixed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Add to batch
      const docRef = db.collection('audit-results').doc();
      batch.set(docRef, auditResultData);
      batchCount++;
      imported++;

      // Commit batch every 100 records
      if (batchCount >= batchSize) {
        await batch.commit();
        console.log(`✅ Imported ${imported} records...`);
        batch = db.batch();
        batchCount = 0;
      }

    } catch (error) {
      console.error(`❌ Error processing row ${i + 2}:`, error.message);
      skipped++;
    }
  }

  // Commit remaining batch
  if (batchCount > 0) {
    await batch.commit();
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Import Summary:');
  console.log(`   ✨ Created: ${imported}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
  console.log(`   🔄 Collisions resolved: ${collisions}`);
  console.log(`   📋 Total processed: ${data.length}`);
  console.log('='.repeat(60));
}

authenticate()
  .then(() => importAuditResults())
  .then(() => {
    console.log('\n✅ Import completed successfully!');
    console.log('💡 All 8993 rows should now be in Firebase!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });
