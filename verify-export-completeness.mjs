import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  await import('fs').then(fs => 
    fs.promises.readFile(join(__dirname, 'serviceaccountKey.json'), 'utf8')
  )
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function verifyExportCompleteness() {
  console.log('🔍 Verifying Export Completeness\n');
  console.log('='.repeat(60));

  try {
    // 1. Count Firestore audit-results
    console.log('\n📊 Counting Firestore audit-results collection...');
    const auditResultsSnapshot = await db.collection('audit-results').get();
    const firestoreCount = auditResultsSnapshot.size;
    console.log(`✅ Firestore count: ${firestoreCount} documents`);

    // 2. Count Excel rows
    console.log('\n📊 Counting Excel file rows...');
    const excelPath = join(__dirname, 'Master-finding.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    
    const worksheet = workbook.worksheets[0];
    // Subtract 1 for header row
    const excelCount = worksheet.rowCount - 1;
    console.log(`✅ Excel count: ${excelCount} rows (excluding header)`);

    // 3. Compare counts
    console.log('\n' + '='.repeat(60));
    console.log('📈 COMPARISON RESULTS:');
    console.log('='.repeat(60));
    console.log(`Firestore: ${firestoreCount}`);
    console.log(`Excel:     ${excelCount}`);
    console.log(`Difference: ${Math.abs(firestoreCount - excelCount)}`);
    
    if (firestoreCount === excelCount) {
      console.log('\n✅ ✅ ✅ PERFECT MATCH! Export is complete.');
    } else if (firestoreCount > excelCount) {
      console.log(`\n⚠️  Firestore has ${firestoreCount - excelCount} MORE records than Excel`);
      console.log('This might indicate duplicate imports or additional data.');
    } else {
      console.log(`\n❌ Excel has ${excelCount - firestoreCount} MORE records than Firestore`);
      console.log('This indicates incomplete import!');
    }

    // 4. Sample verification - check first 5 records
    console.log('\n' + '='.repeat(60));
    console.log('🔍 SAMPLE VERIFICATION (First 5 records):');
    console.log('='.repeat(60));
    
    const sampleDocs = auditResultsSnapshot.docs.slice(0, 5);
    console.log('\nFirestore Sample:');
    sampleDocs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n${index + 1}. ID: ${doc.id}`);
      console.log(`   Project: ${data.projectName || 'N/A'}`);
      console.log(`   Finding: ${data.findingTitle?.substring(0, 50) || 'N/A'}...`);
      console.log(`   Status: ${data.status || 'N/A'}`);
    });

    // 5. Check for duplicates in Firestore
    console.log('\n' + '='.repeat(60));
    console.log('🔍 CHECKING FOR DUPLICATES:');
    console.log('='.repeat(60));
    
    const uniqueIds = new Set();
    const duplicates = [];
    
    auditResultsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const uniqueKey = `${data.projectName}-${data.findingTitle}`;
      
      if (uniqueIds.has(uniqueKey)) {
        duplicates.push({
          id: doc.id,
          project: data.projectName,
          finding: data.findingTitle?.substring(0, 50)
        });
      } else {
        uniqueIds.add(uniqueKey);
      }
    });

    if (duplicates.length > 0) {
      console.log(`\n⚠️  Found ${duplicates.length} potential duplicates:`);
      duplicates.slice(0, 5).forEach((dup, index) => {
        console.log(`\n${index + 1}. ID: ${dup.id}`);
        console.log(`   Project: ${dup.project}`);
        console.log(`   Finding: ${dup.finding}...`);
      });
      if (duplicates.length > 5) {
        console.log(`\n... and ${duplicates.length - 5} more duplicates`);
      }
    } else {
      console.log('\n✅ No duplicates found!');
    }

    // 6. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY:');
    console.log('='.repeat(60));
    console.log(`Total Firestore Records: ${firestoreCount}`);
    console.log(`Total Excel Rows: ${excelCount}`);
    console.log(`Unique Records: ${uniqueIds.size}`);
    console.log(`Potential Duplicates: ${duplicates.length}`);
    console.log(`Match Status: ${firestoreCount === excelCount ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);

  } catch (error) {
    console.error('\n❌ Error during verification:', error);
    throw error;
  }
}

// Run verification
verifyExportCompleteness()
  .then(() => {
    console.log('\n✅ Verification completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
