#!/usr/bin/env node

/**
 * Import Department Master Data from Excel to Firestore
 * 
 * This script imports department master data from an Excel file into the department_tags collection.
 * The Excel file should have columns: departmentName, tags (comma-separated), category, findingsCount
 * 
 * Usage:
 *   node scripts/import-department-master.mjs <path-to-excel-file>
 * 
 * Example:
 *   node scripts/import-department-master.mjs data/Department_Master.xlsx
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
 * Transform Excel row to department_tags document
 */
function transformToDepartmentTag(row) {
  // Extract fields from Excel row (actual column names from Departemen_Master.xlsx)
  const departmentName = row['Department'] || '';
  const category = row['Category'] || 'Other';
  const findingsCount = parseInt(row['Findings (F)'] || '0', 10);
  
  // Generate tags from department name
  // Extract keywords and variations
  const tags = [];
  
  // Add the full department name
  if (departmentName) {
    tags.push(departmentName);
    
    // Remove "Departemen" prefix and add as tag
    const withoutPrefix = departmentName.replace(/^Departemen\s+/i, '').trim();
    if (withoutPrefix !== departmentName) {
      tags.push(withoutPrefix);
    }
    
    // Add common abbreviations based on department name
    if (departmentName.includes('Marketing')) {
      tags.push('Marketing', 'Sales', 'HBD', 'Promotion');
    }
    if (departmentName.includes('Finance') || departmentName.includes('Accounting')) {
      tags.push('Finance', 'Keuangan', 'FAD', 'Accounting', 'Treasury');
    }
    if (departmentName.includes('Estate') || departmentName.includes('Property')) {
      tags.push('Estate', 'Property', 'Building Management', 'Property Management');
    }
    if (departmentName.includes('IT') || departmentName.includes('Information')) {
      tags.push('IT', 'ICT', 'Teknologi Informasi', 'Information Technology');
    }
    if (departmentName.includes('HR') || departmentName.includes('Human')) {
      tags.push('HR', 'HRD', 'HCM', 'SDM', 'Human Capital');
    }
    if (departmentName.includes('Engineering') || departmentName.includes('Construction')) {
      tags.push('Engineering', 'Teknik', 'Construction', 'Maintenance');
    }
    if (departmentName.includes('Legal')) {
      tags.push('Legal', 'Hukum', 'Compliance');
    }
    if (departmentName.includes('Audit')) {
      tags.push('Audit', 'Risk', 'Internal Audit');
    }
    if (departmentName.includes('Operations') || departmentName.includes('Operation')) {
      tags.push('Operations', 'Operasi', 'GA', 'General Affairs');
    }
    if (departmentName.includes('Procurement') || departmentName.includes('Supply')) {
      tags.push('Procurement', 'Supply Chain', 'Purchasing');
    }
    if (departmentName.includes('Healthcare') || departmentName.includes('Medical')) {
      tags.push('Healthcare', 'Medical', 'Medis', 'Health');
    }
    if (departmentName.includes('Hospitality') || departmentName.includes('F&B')) {
      tags.push('Hospitality', 'F&B', 'Food', 'Beverage');
    }
  }
  
  // Remove duplicates and empty strings
  const uniqueTags = [...new Set(tags)].filter(tag => tag.length > 0);
  
  // Generate originalNames from tags (for backward compatibility)
  const originalNames = [...uniqueTags];
  
  // Determine category based on department name if not provided
  let finalCategory = category;
  if (!category || category === 'Other') {
    if (departmentName.includes('Marketing')) finalCategory = 'Marketing & Sales';
    else if (departmentName.includes('Finance')) finalCategory = 'Finance';
    else if (departmentName.includes('Estate') || departmentName.includes('Property')) finalCategory = 'Property Management';
    else if (departmentName.includes('IT')) finalCategory = 'IT';
    else if (departmentName.includes('HR')) finalCategory = 'HR';
    else if (departmentName.includes('Engineering')) finalCategory = 'Engineering & Construction';
    else if (departmentName.includes('Legal')) finalCategory = 'Legal & Compliance';
    else if (departmentName.includes('Audit')) finalCategory = 'Audit & Risk';
    else if (departmentName.includes('Operations')) finalCategory = 'Operations';
    else if (departmentName.includes('Procurement')) finalCategory = 'Supply Chain & Procurement';
    else if (departmentName.includes('Healthcare')) finalCategory = 'Healthcare';
    else if (departmentName.includes('Hospitality')) finalCategory = 'Hospitality & F&B';
    else finalCategory = 'Other';
  }
  
  return {
    departmentName: departmentName.trim(),
    tags: uniqueTags,
    originalNames,
    category: finalCategory,
    findingsCount: findingsCount || 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

/**
 * Import departments to Firestore
 */
async function importDepartments(departments) {
  console.log(`\n🚀 Starting import of ${departments.length} departments...`);
  
  const batch = db.batch();
  let importCount = 0;
  let updateCount = 0;
  let skipCount = 0;
  
  for (const dept of departments) {
    if (!dept.departmentName) {
      console.warn(`⚠️  Skipping row with empty departmentName`);
      skipCount++;
      continue;
    }
    
    // Check if department already exists
    const existingQuery = await db
      .collection('department_tags')
      .where('departmentName', '==', dept.departmentName)
      .limit(1)
      .get();
    
    if (!existingQuery.empty) {
      // Update existing department
      const docRef = existingQuery.docs[0].ref;
      batch.update(docRef, {
        ...dept,
        updatedAt: Timestamp.now(),
      });
      updateCount++;
      console.log(`🔄 Updating: ${dept.departmentName}`);
    } else {
      // Create new department
      const docRef = db.collection('department_tags').doc();
      batch.set(docRef, dept);
      importCount++;
      console.log(`✨ Creating: ${dept.departmentName}`);
    }
  }
  
  // Commit batch
  await batch.commit();
  
  console.log(`\n✅ Import complete!`);
  console.log(`   📝 Created: ${importCount} departments`);
  console.log(`   🔄 Updated: ${updateCount} departments`);
  console.log(`   ⏭️  Skipped: ${skipCount} rows`);
  console.log(`   📊 Total: ${importCount + updateCount} departments in database`);
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
      console.log('  node scripts/import-department-master.mjs <path-to-excel-file>');
      console.log('\nExample:');
      console.log('  node scripts/import-department-master.mjs Departemen_Master.xlsx');
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
    
    // Transform to department_tags format
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
