import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkCGCJ() {
  console.log('Checking CitraGarden City Jakarta...\n');
  
  // First get all audit results for this project
  const allSnapshot = await db.collection('audit_results')
    .where('project_name', '==', 'CitraGarden City Jakarta')
    .get();
  
  console.log(`Total audit results: ${allSnapshot.size}`);
  
  // Count by code
  const codeCounts = {};
  allSnapshot.forEach(doc => {
    const code = doc.data().code || 'NO_CODE';
    codeCounts[code] = (codeCounts[code] || 0) + 1;
  });
  
  console.log('\nCodes breakdown:');
  Object.entries(codeCounts).sort().forEach(([code, count]) => {
    console.log(`  ${code}: ${count}`);
  });
  
  // Now check F codes specifically
  const snapshot = await db.collection('audit_results')
    .where('project_name', '==', 'CitraGarden City Jakarta')
    .where('code', '==', 'F')
    .get();
  
  console.log(`\nTotal F codes found: ${snapshot.size}\n`);
  
  const noDesc = [];
  const withDesc = [];
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const desc = (data.description || '').trim();
    
    if (!desc) {
      noDesc.push({
        id: doc.id,
        year: data.year,
        department: data.department,
        code: data.code
      });
    } else {
      withDesc.push({ desc: desc.substring(0, 50) });
    }
  });
  
  console.log(`F codes WITH description: ${withDesc.length}`);
  console.log(`F codes WITHOUT description: ${noDesc.length}\n`);
  
  if (noDesc.length > 0) {
    console.log('⚠️  F codes missing descriptions:');
    console.log('='.repeat(80));
    noDesc.forEach((r, i) => {
      console.log(`${i + 1}. Year: ${r.year} | Dept: ${r.department}`);
      console.log(`   ID: ${r.id}`);
      console.log('-'.repeat(80));
    });
  } else {
    console.log('✓ All F codes have descriptions!');
  }
}

checkCGCJ().then(() => process.exit(0));
