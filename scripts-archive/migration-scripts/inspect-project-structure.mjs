import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function inspectProjects() {
  try {
    const projectsSnapshot = await db.collection('projects').limit(5).get();
    
    console.log('=== SAMPLE PROJECT DOCUMENTS (First 5) ===\n');
    
    projectsSnapshot.forEach((doc, idx) => {
      console.log(`\n[${idx + 1}] Document ID: ${doc.id}`);
      console.log('All fields:');
      const data = doc.data();
      console.log(JSON.stringify(data, null, 2));
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

inspectProjects();
