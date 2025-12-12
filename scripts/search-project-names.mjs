import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function searchProjects() {
  const searchTerm = process.argv[2] || 'garden';
  console.log(`Searching for projects containing: "${searchTerm}"\n`);
  
  const snapshot = await db.collection('projects').get();
  const matches = [];
  
  // First check what fields exist
  if (snapshot.size > 0) {
    const firstDoc = snapshot.docs[0];
    console.log('Sample project fields:', Object.keys(firstDoc.data()));
    console.log('Sample data:', firstDoc.data());
    console.log('');
  }
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const name = data.project_name || data.name || data.projectName || '';
    if (name && name.toLowerCase().includes(searchTerm.toLowerCase())) {
      matches.push({
        id: doc.id,
        name: name,
        initials: data.initials
      });
    }
  });
  
  if (matches.length === 0) {
    console.log('No matches found.');
    console.log('\nShowing first 20 projects:');
    let count = 0;
    snapshot.forEach(doc => {
      if (count < 20) {
        const data = doc.data();
        const name = data.project_name || data.name || data.projectName || doc.id;
        console.log(`  - ${name}`);
        count++;
      }
    });
  } else {
    console.log(`Found ${matches.length} matches:\n`);
    matches.forEach(m => {
      console.log(`  - ${m.name} (${m.initials})`);
    });
  }
}

searchProjects().then(() => process.exit(0));
