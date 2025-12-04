import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  await import('fs').then(fs => 
    fs.promises.readFile(join(__dirname, '..', 'serviceaccountKey.json'), 'utf8')
  )
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Generate unique ID from row data
function generateUniqueId(rowData) {
  const uniqueString = `${rowData.year}-${rowData.sh}-${rowData.projectName}-${rowData.department}-${rowData.riskArea}-${rowData.descriptions}-${rowData.code}`;
  return crypto.createHash('sha256').update(uniqueString).digest('hex').substring(0, 20);
}

// Delete all existing audit results
async function deleteAllAuditResults() {
  console.log('\n🗑️  STEP 1: Deleting all existing audit-results...');
  console.log('='.repeat(70));
  
  const batchSize = 500;
  let deletedCount = 0;
  
  while (true) {
    const snapshot = await db.collection('audit-results')
      .limit(batchSize)
      .get();
    
    if (snapshot.empty) {
      break;
    }
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    deletedCount += snapshot.size;
    console.log(`   Deleted ${deletedCount} documents...`);
  }
  
  console.log(`✅ Deleted total: ${deletedCount} documents`);
  return deletedCount;
}

// Import from Excel with unique ID enforcement
async function importFromExcel() {
  console.log('\n📥 STEP 2: Importing from Excel with unique IDs...');
  console.log('='.repeat(70));
  
  const excelPath = join(__dirname, '..', 'Master-finding.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const worksheet = workbook.worksheets[0];
  
  console.log(`\n📄 Excel file loaded:`);
  console.log(`   Total rows: ${worksheet.rowCount}`);
  console.log(`   Data rows: ${worksheet.rowCount - 1}`);
  
  // Get headers
  const headerRow = worksheet.getRow(1);
  const headers = [];
  headerRow.eachCell((cell) => {
    headers.push(cell.value?.toString().trim() || '');
  });
  
  console.log(`\n📋 Column mapping:`);
  headers.forEach((header, index) => {
    console.log(`   ${index + 1}. ${header}`);
  });
  
  // Track unique IDs
  const uniqueIds = new Set();
  const duplicateRows = [];
  const records = [];
  let skippedRows = 0;
  
  // Process all rows
  console.log(`\n🔄 Processing rows...`);
  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    
    // Skip empty rows
    if (!row.hasValues) {
      skippedRows++;
      continue;
    }
    
    // Extract data
    const rowData = {
      year: row.getCell(1).value?.toString().trim() || '',
      sh: row.getCell(2).value?.toString().trim() || '',
      projectName: row.getCell(3).value?.toString().trim() || '',
      department: row.getCell(4).value?.toString().trim() || '',
      riskArea: row.getCell(5).value?.toString().trim() || '',
      descriptions: row.getCell(6).value?.toString().trim() || '',
      code: row.getCell(7).value?.toString().trim() || '',
      bobot: row.getCell(8).value?.toString().trim() || '',
      kadar: row.getCell(9).value?.toString().trim() || '',
      nilai: row.getCell(10).value?.toString().trim() || ''
    };
    
    // Validate required fields
    if (!rowData.projectName || !rowData.year) {
      console.log(`   ⚠️  Row ${rowNum}: Missing required fields, skipping`);
      skippedRows++;
      continue;
    }
    
    // Generate unique ID
    const uniqueId = generateUniqueId(rowData);
    
    // Check for duplicates
    if (uniqueIds.has(uniqueId)) {
      duplicateRows.push({ rowNum, uniqueId, projectName: rowData.projectName });
      console.log(`   ⚠️  Row ${rowNum}: Duplicate detected, skipping`);
      skippedRows++;
      continue;
    }
    
    uniqueIds.add(uniqueId);
    
    // Find matching project
    const projectSnapshot = await db.collection('projects')
      .where('projectName', '==', rowData.projectName)
      .limit(1)
      .get();
    
    const projectId = projectSnapshot.empty ? null : projectSnapshot.docs[0].id;
    
    if (!projectId) {
      console.log(`   ⚠️  Row ${rowNum}: Project "${rowData.projectName}" not found, using null`);
    }
    
    // Prepare record
    const record = {
      auditResultId: uniqueId,
      year: rowData.year,
      sh: rowData.sh,
      projectName: rowData.projectName,
      projectId: projectId,
      department: rowData.department,
      riskArea: rowData.riskArea,
      descriptions: rowData.descriptions,
      code: rowData.code,
      bobot: rowData.bobot,
      kadar: rowData.kadar,
      nilai: rowData.nilai,
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    records.push({ id: uniqueId, data: record });
    
    if (rowNum % 100 === 0) {
      console.log(`   Processed ${rowNum - 1} rows...`);
    }
  }
  
  console.log(`\n✅ Processing complete:`);
  console.log(`   Total rows processed: ${worksheet.rowCount - 1}`);
  console.log(`   Valid records: ${records.length}`);
  console.log(`   Skipped rows: ${skippedRows}`);
  console.log(`   Duplicates found: ${duplicateRows.length}`);
  
  if (duplicateRows.length > 0) {
    console.log(`\n⚠️  Duplicate rows detected:`);
    duplicateRows.slice(0, 10).forEach(dup => {
      console.log(`   Row ${dup.rowNum}: ${dup.projectName} (ID: ${dup.uniqueId})`);
    });
    if (duplicateRows.length > 10) {
      console.log(`   ... and ${duplicateRows.length - 10} more`);
    }
  }
  
  return records;
}

// Import to Firestore in batches
async function importToFirestore(records) {
  console.log('\n💾 STEP 3: Importing to Firestore...');
  console.log('='.repeat(70));
  
  const batchSize = 500;
  let importedCount = 0;
  let failedCount = 0;
  const errors = [];
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = db.batch();
    const batchRecords = records.slice(i, i + batchSize);
    
    for (const record of batchRecords) {
      try {
        const docRef = db.collection('audit-results').doc(record.id);
        batch.set(docRef, record.data);
      } catch (error) {
        failedCount++;
        errors.push({ id: record.id, error: error.message });
      }
    }
    
    try {
      await batch.commit();
      importedCount += batchRecords.length;
      console.log(`   Imported ${importedCount} / ${records.length} records...`);
    } catch (error) {
      console.error(`   ❌ Batch commit failed:`, error.message);
      failedCount += batchRecords.length;
    }
  }
  
  console.log(`\n✅ Import complete:`);
  console.log(`   Successfully imported: ${importedCount}`);
  console.log(`   Failed: ${failedCount}`);
  
  if (errors.length > 0) {
    console.log(`\n❌ Errors encountered:`);
    errors.slice(0, 5).forEach(err => {
      console.log(`   ID ${err.id}: ${err.error}`);
    });
    if (errors.length > 5) {
      console.log(`   ... and ${errors.length - 5} more errors`);
    }
  }
  
  return { importedCount, failedCount };
}

// Verify import completeness
async function verifyImport(expectedCount) {
  console.log('\n✅ STEP 4: Verifying import...');
  console.log('='.repeat(70));
  
  const snapshot = await db.collection('audit-results').get();
  const actualCount = snapshot.size;
  
  console.log(`\n📊 Verification results:`);
  console.log(`   Expected: ${expectedCount}`);
  console.log(`   Actual: ${actualCount}`);
  console.log(`   Difference: ${Math.abs(expectedCount - actualCount)}`);
  
  if (actualCount === expectedCount) {
    console.log(`\n✅ ✅ ✅ PERFECT! 100% import success!`);
  } else {
    console.log(`\n❌ Import incomplete!`);
  }
  
  // Check for unique IDs
  const ids = new Set();
  const duplicateIds = [];
  
  snapshot.docs.forEach(doc => {
    if (ids.has(doc.id)) {
      duplicateIds.push(doc.id);
    }
    ids.add(doc.id);
  });
  
  console.log(`\n🔍 Unique ID verification:`);
  console.log(`   Total documents: ${actualCount}`);
  console.log(`   Unique IDs: ${ids.size}`);
  console.log(`   Duplicate IDs: ${duplicateIds.length}`);
  
  if (duplicateIds.length === 0) {
    console.log(`\n✅ All IDs are unique!`);
  } else {
    console.log(`\n❌ Duplicate IDs found:`, duplicateIds);
  }
  
  // Sample verification
  console.log(`\n📋 Sample records (first 3):`);
  snapshot.docs.slice(0, 3).forEach((doc, index) => {
    const data = doc.data();
    console.log(`\n${index + 1}. ID: ${doc.id}`);
    console.log(`   Year: ${data.year}`);
    console.log(`   Project: ${data.projectName}`);
    console.log(`   Department: ${data.department?.substring(0, 50)}...`);
    console.log(`   Risk Area: ${data.riskArea?.substring(0, 50)}...`);
  });
  
  return actualCount === expectedCount && duplicateIds.length === 0;
}

// Main execution
async function main() {
  console.log('\n🚀 COMPLETE AUDIT RESULTS REIMPORT');
  console.log('='.repeat(70));
  console.log('This will DELETE all existing data and reimport from Excel');
  console.log('with 100% accuracy and unique ID enforcement.');
  console.log('='.repeat(70));
  
  try {
    // Step 1: Delete all existing data
    const deletedCount = await deleteAllAuditResults();
    
    // Step 2: Import from Excel
    const records = await importFromExcel();
    
    // Step 3: Import to Firestore
    const { importedCount, failedCount } = await importToFirestore(records);
    
    // Step 4: Verify
    const isComplete = await verifyImport(records.length);
    
    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(70));
    console.log(`Deleted: ${deletedCount} documents`);
    console.log(`Processed: ${records.length} records from Excel`);
    console.log(`Imported: ${importedCount} documents`);
    console.log(`Failed: ${failedCount} documents`);
    console.log(`Verification: ${isComplete ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(70));
    
    if (isComplete && failedCount === 0) {
      console.log('\n🎉 SUCCESS! Import is 100% complete and accurate!');
    } else {
      console.log('\n⚠️  Import completed with issues. Please review the logs above.');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    throw error;
  }
}

// Run
main()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
