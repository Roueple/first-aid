#!/usr/bin/env node

/**
 * Import Department Master Data from Excel to Firestore (1:1 mapping)
 * 
 * This script imports department master data EXACTLY as it appears in the Excel file.
 * No transformation, no auto-generation - just 1:1 mapping.
 * 
 * Usage:
 *   node scripts/import-department-master-exact.mjs <path-to-excel-file>
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import XLSX from 'xlsx';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../serviceaccountKey.json'), 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

/**
 * Parse Excel file and extract department data
 */
function parseExcelFile(filePath) {
  console.log(`📖 Reading Excel file: ${filePath}`);
  
  // Check if file exists
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  try {
    // Read file as buffer first
    const buffer = readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`✅ Found ${data.length} rows in Excel file`);
    
    return data;
  } catch (error) {
    console.error(`❌ Error reading Excel file: ${error.message}`);
    throw error;
  }
}

/**
 * Transform Excel row to department_tags document (1:1 mapping)
 */
function transformToDepartmentTag(row) {
  // 1:1 mapping from Excel columns to Firestore fields
  return {
    // Core identification
    department: row['Department'] || '',
    
    // Project scope
    subholding: row['Subholding'] || '',
    years: row['Years'] || '',
    category: row['Category'] || '',
    projectsCount: parseInt(row['# Projects'] || '0', 10),
    
    // Audit statistics
    totalAuditItems: parseInt(row['Total Audit Items'] || '0', 10),
    findingsF: parseInt(row['Findings (F)'] || '0', 10),
    nonFindingsNF: parseInt(row['Non-Findings (NF)'] || '0', 10),
    otherKode: parseInt(row['Other Kode'] || '0', 10),
    findingRatePercent: parseFloat(row['Finding Rate (%)'] || '0'),
    
    // Score aggregates
    sumBobot: parseInt(row['Sum Bobot'] || '0', 10),
    sumKadar: parseFloat(row['Sum Kadar'] || '0'),
    sumNilai: parseFloat(row['Sum Nilai'] || '0'),
    
    // Additional metrics
    temuanUlangan: parseInt(row['Temuan Ulangan'] || '0', 10),
    subfindings: parseInt(row['Subfindings'] || '0', 10),
    topKategori: row['Top Kategori'] || '',
    
    // Project list
    projects: row['Projects'] || '',
    
    // Metadata
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

/**
 * Import departments to Firestore
 */
async function importDepartments(departments) {
  console.log(`\n🚀 Starting import of ${departments.length} departments...`);
  
  // First, delete all existing documents in department_tags
  console.log('🗑️  Clearing existing department_tags collection...');
  const existingDocs = await db.collection('department_tags').get();
  const deletePromises = existingDocs.docs.map(doc => doc.ref.delete());
  await Promise.all(deletePromises);
  console.log(`✅ Deleted ${existingDocs.size} existing documents`);
  
  const batch = db.batch();
  let importCount = 0;
  let skipCount = 0;
  
  for (const dept of departments) {
    if (!dept.department) {
      console.warn(`⚠️  Skipping row with empty department name`);
      skipCount++;
      continue;
    }
    
    // Create new document with auto-generated ID
    const docRef = db.collection('department_tags').doc();
    batch.set(docRef, dept);
    importCount++;
    console.log(`✨ Importing: ${dept.department}`);
  }
  
  // Commit batch
  await batch.commit();
  
  console.log(`\n✅ Import complete!`);
  console.log(`   📝 Imported: ${importCount} departments`);
  console.log(`   ⏭️  Skipped: ${skipCount} rows`);
  console.log(`   📊 Total: ${importCount} departments in database`);
}

/**
 * Main execution
 */
async function main() {
  try {
    // Get Excel file path from command line argument
    let excelFilePath = process.argv[2];
    
    if (!excelFilePath) {
      console.error('❌ Error: Please provide Excel file path');
      console.log('\nUsage:');
      console.log('  node scripts/import-department-master-exact.mjs <path-to-excel-file>');
      console.log('\nExample:');
      console.log('  node scripts/import-department-master-exact.mjs Departemen_Master.xlsx');
      process.exit(1);
    }
    
    // Resolve to absolute path
    excelFilePath = resolve(excelFilePath);
    console.log(`📂 Resolved path: ${excelFilePath}`);
    
    // Parse Excel file
    const excelData = parseExcelFile(excelFilePath);
    
    if (excelData.length === 0) {
      console.error('❌ Error: No data found in Excel file');
      process.exit(1);
    }
    
    // Transform to department_tags format (1:1 mapping)
    const departments = excelData.map(transformToDepartmentTag);
    
    // Show preview
    console.log('\n📋 Preview of first department:');
    console.log(JSON.stringify(departments[0], null, 2));
    
    // Import to Firestore
    await importDepartments(departments);
    
    console.log('\n🎉 All done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
