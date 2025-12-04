import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Load service account
const serviceAccount = JSON.parse(
  readFileSync('./serviceaccountKey.json', 'utf8')
);

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function countAuditResults() {
  try {
    console.log('Counting audit-results documents...\n');
    
    const snapshot = await db.collection('audit-results').count().get();
    const count = snapshot.data().count;
    
    console.log(`✅ Total audit-results: ${count}`);
    
    return count;
  } catch (error) {
    console.error('❌ Error counting documents:', error);
    throw error;
  }
}

countAuditResults()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
