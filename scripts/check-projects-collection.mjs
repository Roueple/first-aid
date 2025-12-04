import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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

async function checkProjectsCollection() {
  console.log('🔍 Checking projects collection...\n');
  
  const snapshot = await db.collection('projects').get();
  
  console.log(`Total projects: ${snapshot.size}\n`);
  
  if (snapshot.size === 0) {
    console.log('❌ No projects found in Firestore!');
    console.log('\n💡 You need to import projects first before importing audit results.');
    console.log('   Run: node scripts/import-projects-from-excel.mjs');
  } else {
    console.log('Projects in Firestore:');
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.projectName || 'N/A'} [${data.initials || 'N/A'}]`);
    });
  }
}

checkProjectsCollection()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
