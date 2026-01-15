import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync('./serviceaccountKey.json', 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function checkCodeFCount() {
  console.log('🔍 Checking code F count in audit-results...\n');

  try {
    // Query all code F records
    const snapshot = await db
      .collection('audit-results')
      .where('code', '==', 'F')
      .get();

    console.log(`✅ Total code F records: ${snapshot.size}`);
    
    // Check by year
    const yearCounts = {};
    snapshot.forEach(doc => {
      const year = doc.data().year;
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    });
    
    console.log('\n📊 Breakdown by year:');
    Object.entries(yearCounts)
      .sort(([a], [b]) => b.localeCompare(a))
      .forEach(([year, count]) => {
        console.log(`  ${year}: ${count} findings`);
      });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCodeFCount().then(() => process.exit(0));
