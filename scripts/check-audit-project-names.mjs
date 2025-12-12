import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkAuditProjectNames() {
  console.log('Checking audit_results collection...\n');
  
  const snapshot = await db.collection('audit_results').limit(5).get();
  
  console.log(`Total documents in sample: ${snapshot.size}\n`);
  
  if (snapshot.size > 0) {
    console.log('Sample audit result #1:');
    console.log('Fields:', Object.keys(snapshot.docs[0].data()));
    console.log('\nData:', JSON.stringify(snapshot.docs[0].data(), null, 2));
  } else {
    console.log('No documents found in audit_results collection!');
    
    // Check other collections
    console.log('\nChecking other collections...');
    const collections = await db.listCollections();
    console.log('Available collections:');
    collections.forEach(col => console.log(`  - ${col.id}`));
  }
  
  // Get all unique project names
  const allSnapshot = await db.collection('audit_results').get();
  const projectNames = new Set();
  const allFields = new Set();
  
  allSnapshot.forEach(doc => {
    const data = doc.data();
    Object.keys(data).forEach(key => allFields.add(key));
    const name = data.project_name || data.projectName || data.project;
    if (name) projectNames.add(name);
  });
  
  console.log(`\n\nTotal documents: ${allSnapshot.size}`);
  console.log(`All fields found: ${Array.from(allFields).join(', ')}`);
  console.log(`Total unique project names: ${projectNames.size}`);
  
  // Search for "garden city"
  const matches = Array.from(projectNames).filter(name => 
    name.toLowerCase().includes('garden') && name.toLowerCase().includes('city')
  );
  
  console.log(`\nProjects with "garden" and "city":`);
  matches.forEach(name => console.log(`  - ${name}`));
}

checkAuditProjectNames().then(() => process.exit(0));
