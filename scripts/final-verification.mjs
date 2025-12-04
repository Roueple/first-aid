import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  await import('fs').then(fs => 
    fs.promises.readFile(join(__dirname, '..', 'serviceaccountKey.json'), 'utf8')
  )
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function finalVerification() {
  console.log('\n🔍 FINAL VERIFICATION REPORT');
  console.log('='.repeat(70));
  
  // 1. Count verification
  console.log('\n1️⃣  COUNT VERIFICATION');
  console.log('-'.repeat(70));
  
  const snapshot = await db.collection('audit-results').get();
  const firestoreCount = snapshot.size;
  
  const excelPath = join(__dirname, '..', 'Master-finding.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const worksheet = workbook.worksheets[0];
  const excelCount = worksheet.rowCount - 1;
  
  console.log(`Firestore: ${firestoreCount}`);
  console.log(`Excel:     ${excelCount}`);
  console.log(`Match:     ${firestoreCount === excelCount ? '✅ YES' : '❌ NO'}`);
  
  // 2. Unique ID verification
  console.log('\n2️⃣  UNIQUE ID VERIFICATION');
  console.log('-'.repeat(70));
  
  const ids = new Set();
  const duplicates = [];
  
  snapshot.docs.forEach(doc => {
    if (ids.has(doc.id)) {
      duplicates.push(doc.id);
    }
    ids.add(doc.id);
  });
  
  console.log(`Total documents: ${firestoreCount}`);
  console.log(`Unique IDs:      ${ids.size}`);
  console.log(`Duplicates:      ${duplicates.length}`);
  console.log(`All unique:      ${duplicates.length === 0 ? '✅ YES' : '❌ NO'}`);
  
  // 3. Field completeness
  console.log('\n3️⃣  FIELD COMPLETENESS');
  console.log('-'.repeat(70));
  
  const fieldStats = {
    auditResultId: 0,
    year: 0,
    sh: 0,
    projectName: 0,
    projectId: 0,
    department: 0,
    riskArea: 0,
    descriptions: 0,
    code: 0,
    bobot: 0,
    kadar: 0,
    nilai: 0,
    createdBy: 0,
    createdAt: 0,
    updatedAt: 0
  };
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    Object.keys(fieldStats).forEach(field => {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        fieldStats[field]++;
      }
    });
  });
  
  Object.entries(fieldStats).forEach(([field, count]) => {
    const percentage = ((count / firestoreCount) * 100).toFixed(1);
    const status = count === firestoreCount ? '✅' : '⚠️';
    console.log(`${status} ${field.padEnd(20)}: ${count.toString().padStart(5)} (${percentage}%)`);
  });
  
  // 4. Data integrity
  console.log('\n4️⃣  DATA INTEGRITY');
  console.log('-'.repeat(70));
  
  let missingYear = 0;
  let missingProject = 0;
  let invalidIds = 0;
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (!data.year) missingYear++;
    if (!data.projectName) missingProject++;
    if (data.auditResultId !== doc.id) invalidIds++;
  });
  
  console.log(`Missing year:        ${missingYear === 0 ? '✅' : '❌'} ${missingYear}`);
  console.log(`Missing projectName: ${missingProject === 0 ? '✅' : '❌'} ${missingProject}`);
  console.log(`Invalid IDs:         ${invalidIds === 0 ? '✅' : '❌'} ${invalidIds}`);
  
  // 5. Sample records
  console.log('\n5️⃣  SAMPLE RECORDS (First 3)');
  console.log('-'.repeat(70));
  
  snapshot.docs.slice(0, 3).forEach((doc, index) => {
    const data = doc.data();
    console.log(`\n${index + 1}. Document ID: ${doc.id}`);
    console.log(`   auditResultId: ${data.auditResultId}`);
    console.log(`   Year: ${data.year}`);
    console.log(`   SH: ${data.sh}`);
    console.log(`   Project: ${data.projectName}`);
    console.log(`   Department: ${data.department?.substring(0, 40)}...`);
    console.log(`   ID Match: ${data.auditResultId === doc.id ? '✅' : '❌'}`);
  });
  
  // 6. Final verdict
  console.log('\n' + '='.repeat(70));
  console.log('🎯 FINAL VERDICT');
  console.log('='.repeat(70));
  
  const allChecks = [
    { name: 'Count matches Excel', pass: firestoreCount === excelCount },
    { name: 'All IDs unique', pass: duplicates.length === 0 },
    { name: 'All fields complete', pass: Object.values(fieldStats).every(v => v === firestoreCount) },
    { name: 'No missing years', pass: missingYear === 0 },
    { name: 'No missing projects', pass: missingProject === 0 },
    { name: 'All IDs valid', pass: invalidIds === 0 }
  ];
  
  allChecks.forEach(check => {
    console.log(`${check.pass ? '✅' : '❌'} ${check.name}`);
  });
  
  const allPassed = allChecks.every(c => c.pass);
  
  console.log('\n' + '='.repeat(70));
  if (allPassed) {
    console.log('🎉 🎉 🎉 ALL CHECKS PASSED! 100% COMPLETE AND ACCURATE! 🎉 🎉 🎉');
  } else {
    console.log('⚠️  SOME CHECKS FAILED. PLEASE REVIEW ABOVE.');
  }
  console.log('='.repeat(70));
  
  return allPassed;
}

finalVerification()
  .then(passed => {
    process.exit(passed ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
