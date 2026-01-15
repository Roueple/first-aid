#!/usr/bin/env node

/**
 * Diagnose Import Discrepancy
 * 
 * This script analyzes the Master-finding.xlsx file to identify why
 * only 418 records are imported instead of 8993.
 */

import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate an 8-character alphanumeric ID (matching fixed import script)
 */
function generateAuditResultId(year, rowIndex, sh, projectName, code) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  const combined = `${year}-${rowIndex}-${sh}-${projectName}-${code}`;
  
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  let result = '';
  let num = Math.abs(hash);
  
  for (let i = 0; i < 8; i++) {
    result += chars[num % 36];
    num = Math.floor(num / 36);
    
    if (i === 3) {
      num += rowIndex;
    }
  }
  
  return result;
}

async function diagnose() {
  console.log('🔍 Diagnosing import discrepancy...\n');

  // Read Excel file
  const excelPath = join(__dirname, '..', 'Master-finding.xlsx');

  let workbook;
  try {
    console.log(`📂 Reading file: ${excelPath}`);
    workbook = XLSX.readFile(excelPath);
    console.log('✅ File read successfully!\n');
  } catch (error) {
    console.error('❌ Cannot read Excel file:', error.message);
    throw error;
  }

  const sheetName = 'Master';
  if (!workbook.SheetNames.includes(sheetName)) {
    console.error(`❌ Sheet "${sheetName}" not found`);
    return;
  }

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  console.log(`📋 Total rows in Excel: ${data.length}\n`);

  // Analysis
  let missingShOrProject = 0;
  let emptyRows = 0;
  const generatedIds = new Map(); // Track ID collisions
  const uniqueProjects = new Set();
  const uniqueDepartments = new Set();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const year = row['Year'] || '';
    const sh = row['SH'] || '';
    const projectName = row['Project Name'] || '';
    const department = row['Department'] || '';
    const code = row['Code'] || '';

    // Check for empty rows
    if (!year && !sh && !projectName && !department && !code) {
      emptyRows++;
      continue;
    }

    // Check for missing required fields
    if (!sh || !projectName) {
      missingShOrProject++;
      if (i < 10) { // Show first 10 examples
        console.log(`⚠️  Row ${i + 2}: Missing SH="${sh}" or Project="${projectName}"`);
      }
      continue;
    }

    // Generate ID and track collisions
    const auditResultId = generateAuditResultId(year, i, sh, projectName, code);
    
    if (generatedIds.has(auditResultId)) {
      const existing = generatedIds.get(auditResultId);
      existing.count++;
      existing.rows.push(i + 2);
    } else {
      generatedIds.set(auditResultId, {
        count: 1,
        rows: [i + 2],
        year,
        sh,
        projectName,
        code
      });
    }

    uniqueProjects.add(projectName);
    uniqueDepartments.add(department);
  }

  // Count ID collisions
  let uniqueIds = 0;
  let collisions = 0;
  let totalCollisionRows = 0;

  for (const [id, info] of generatedIds.entries()) {
    if (info.count === 1) {
      uniqueIds++;
    } else {
      collisions++;
      totalCollisionRows += info.count;
    }
  }

  // Report
  console.log('\n' + '='.repeat(70));
  console.log('📊 DIAGNOSTIC REPORT');
  console.log('='.repeat(70));
  console.log(`\n📋 Row Analysis:`);
  console.log(`   Total rows in Excel:           ${data.length}`);
  console.log(`   Empty rows:                    ${emptyRows}`);
  console.log(`   Missing SH or Project Name:    ${missingShOrProject}`);
  console.log(`   Valid rows:                    ${data.length - emptyRows - missingShOrProject}`);
  
  console.log(`\n🔑 ID Generation Analysis (8-char alphanumeric):`);
  console.log(`   Unique IDs generated:          ${generatedIds.size}`);
  console.log(`   IDs with no collisions:        ${uniqueIds}`);
  console.log(`   IDs with collisions:           ${collisions}`);
  console.log(`   Total rows in collisions:      ${totalCollisionRows}`);
  console.log(`   Collision rate:                ${((collisions / generatedIds.size) * 100).toFixed(2)}%`);
  
  console.log(`\n📈 Data Diversity:`);
  console.log(`   Unique projects:               ${uniqueProjects.size}`);
  console.log(`   Unique departments:            ${uniqueDepartments.size}`);

  // Show collision examples
  if (collisions > 0) {
    console.log(`\n⚠️  ID COLLISION EXAMPLES (first 10):`);
    let count = 0;
    for (const [id, info] of generatedIds.entries()) {
      if (info.count > 1 && count < 10) {
        console.log(`\n   ID: ${id} (${info.count} rows)`);
        console.log(`   Project: ${info.projectName}`);
        console.log(`   Code: ${info.code}`);
        console.log(`   Excel rows: ${info.rows.slice(0, 5).join(', ')}${info.rows.length > 5 ? '...' : ''}`);
        count++;
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('💡 CONCLUSION:');
  console.log('='.repeat(70));
  
  const expectedInFirebase = generatedIds.size;
  console.log(`\nExpected records in Firebase: ${expectedInFirebase}`);
  console.log(`Actual records in Firebase:   418`);
  
  if (expectedInFirebase === 418) {
    console.log(`\n✅ The numbers match! The discrepancy is due to:`);
    console.log(`   - ${emptyRows} empty rows`);
    console.log(`   - ${missingShOrProject} rows missing required fields`);
    console.log(`   - ${totalCollisionRows - collisions} duplicate rows (ID collisions)`);
  } else {
    console.log(`\n⚠️  There's still a ${expectedInFirebase - 418} record difference.`);
    console.log(`   This might be due to:`);
    console.log(`   - Firebase write failures`);
    console.log(`   - Permission issues`);
    console.log(`   - Network errors during import`);
  }

  console.log('\n' + '='.repeat(70));
}

diagnose()
  .then(() => {
    console.log('\n✅ Diagnosis completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Diagnosis failed:', error);
    process.exit(1);
  });
