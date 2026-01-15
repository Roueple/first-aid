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

// Generate unique ID from row data (same as import script)
function generateUniqueId(rowData) {
  const uniqueString = `${rowData.year}-${rowData.sh}-${rowData.projectName}-${rowData.department}-${rowData.riskArea}-${rowData.descriptions}-${rowData.code}`;
  return crypto.createHash('sha256').update(uniqueString).digest('hex').substring(0, 20);
}

// Read Excel file
async function readExcelFile() {
  console.log('\n📥 Reading Excel file...');
  console.log('='.repeat(70));
  
  const excelPath = join(__dirname, '..', 'audit-result.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const worksheet = workbook.worksheets[0];
  
  console.log(`   Total rows: ${worksheet.rowCount}`);
  console.log(`   Data rows: ${worksheet.rowCount - 1}`);
  
  const records = new Map();
  let skippedRows = 0;
  
  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    
    if (!row.hasValues) {
      skippedRows++;
      continue;
    }
    
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
    
    if (!rowData.projectName || !rowData.year) {
      skippedRows++;
      continue;
    }
    
    const uniqueId = generateUniqueId(rowData);
    records.set(uniqueId, rowData);
  }
  
  console.log(`✅ Read ${records.size} valid records from Excel`);
  console.log(`   Skipped ${skippedRows} rows`);
  
  return records;
}



// Delete all existing audit results
async function deleteAllAuditResults() {
  console.log('\n🗑️  Deleting all existing audit-results...');
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

// Import all records to Firestore
async function importAllRecords(excelRecords) {
  console.log('\n💾 Importing all records to Firestore...');
  console.log('='.repeat(70));
  
  const batchSize = 500;
  let importedCount = 0;
  const errors = [];
  const recordsArray = Array.from(excelRecords.entries());
  
  for (let i = 0; i < recordsArray.length; i += batchSize) {
    const batch = db.batch();
    const batchRecords = recordsArray.slice(i, i + batchSize);
    
    for (const [id, data] of batchRecords) {
      try {
        // Find matching project to maintain relationship
        const projectSnapshot = await db.collection('projects')
          .where('projectName', '==', data.projectName)
          .limit(1)
          .get();
        
        const projectId = projectSnapshot.empty ? null : projectSnapshot.docs[0].id;
        
        const docRef = db.collection('audit-results').doc(id);
        const record = {
          auditResultId: id,
          year: data.year,
          sh: data.sh,
          projectName: data.projectName,
          projectId: projectId, // Maintain relationship
          department: data.department,
          riskArea: data.riskArea,
          descriptions: data.descriptions,
          code: data.code,
          bobot: data.bobot,
          kadar: data.kadar,
          nilai: data.nilai,
          createdBy: 'admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        batch.set(docRef, record);
      } catch (error) {
        errors.push({ id, error: error.message });
      }
    }
    
    try {
      await batch.commit();
      importedCount += batchRecords.length;
      console.log(`   Imported ${importedCount} / ${recordsArray.length} records...`);
    } catch (error) {
      console.error(`   ❌ Batch commit failed:`, error.message);
    }
  }
  
  console.log(`\n✅ Import complete:`);
  console.log(`   Successfully imported: ${importedCount}`);
  console.log(`   Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log(`\n❌ Errors encountered:`);
    errors.slice(0, 5).forEach(err => {
      console.log(`   ${err.id}: ${err.error}`);
    });
  }
  
  return { importedCount, errors };
}

// Verify import
async function verifyImport(expectedCount) {
  console.log('\n✅ Verifying import...');
  console.log('='.repeat(70));
  
  const snapshot = await db.collection('audit-results').get();
  const actualCount = snapshot.size;
  
  console.log(`\n📊 Verification results:`);
  console.log(`   Expected: ${expectedCount}`);
  console.log(`   Actual: ${actualCount}`);
  console.log(`   Match: ${actualCount === expectedCount ? '✅ YES' : '❌ NO'}`);
  
  // Sample records
  console.log(`\n📋 Sample records (first 3):`);
  snapshot.docs.slice(0, 3).forEach((doc, index) => {
    const data = doc.data();
    console.log(`\n${index + 1}. ID: ${doc.id}`);
    console.log(`   Year: ${data.year}`);
    console.log(`   Project: ${data.projectName}`);
    console.log(`   ProjectId: ${data.projectId || 'null'}`);
    console.log(`   Department: ${data.department?.substring(0, 50)}...`);
  });
  
  return actualCount === expectedCount;
}

// Main execution
async function main() {
  console.log('\n🔄 REIMPORT AUDIT RESULTS FROM EXCEL');
  console.log('='.repeat(70));
  console.log('This will DELETE all existing records and reimport from audit-result.xlsx');
  console.log('All relationships (projectId) will be maintained');
  console.log('='.repeat(70));
  
  try {
    // Step 1: Read Excel file
    const excelRecords = await readExcelFile();
    
    // Step 2: Delete all existing records
    const deletedCount = await deleteAllAuditResults();
    
    // Step 3: Import all records
    const { importedCount, errors } = await importAllRecords(excelRecords);
    
    // Step 4: Verify
    const isComplete = await verifyImport(excelRecords.size);
    
    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(70));
    console.log(`Deleted: ${deletedCount} documents`);
    console.log(`Excel records: ${excelRecords.size}`);
    console.log(`Imported: ${importedCount} documents`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Verification: ${isComplete ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(70));
    
    if (isComplete && errors.length === 0) {
      console.log('\n🎉 SUCCESS! Import is 100% complete!');
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
    console.log('\n✅ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
