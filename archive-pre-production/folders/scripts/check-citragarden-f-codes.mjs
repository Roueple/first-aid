import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkCitraGardenFCodes() {
  console.log('Searching for CitraGarden projects...\n');
  
  try {
    // First, find all projects with "citra" in the name
    const projectsSnapshot = await db.collection('projects').get();
    const citraProjects = [];
    
    projectsSnapshot.forEach(doc => {
      const name = doc.data().name || '';
      if (name.toLowerCase().includes('citra')) {
        citraProjects.push(name);
      }
    });
    
    console.log('Projects with "Citra" in name:');
    citraProjects.forEach(name => console.log(`  - ${name}`));
    console.log('');
    
    // Now check audit results for each
    for (const projectName of citraProjects) {
      const allSnapshot = await db.collection('audit_results')
        .where('project_name', '==', projectName)
        .get();
      
      if (allSnapshot.size === 0) continue;
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Project: ${projectName}`);
      console.log(`Total audit results: ${allSnapshot.size}`);
      
      // Count by code
      const codeCounts = {};
      allSnapshot.forEach(doc => {
        const code = doc.data().code || 'NO_CODE';
        codeCounts[code] = (codeCounts[code] || 0) + 1;
      });
      
      console.log('Codes found:');
      Object.entries(codeCounts).sort().forEach(([code, count]) => {
        console.log(`  ${code}: ${count}`);
      });
      
      // Now check for F codes with no description
      const fSnapshot = await db.collection('audit_results')
        .where('project_name', '==', projectName)
        .where('code', '==', 'F')
        .get();
      
      console.log(`\nTotal F codes: ${fSnapshot.size}`);
      
      let noDescCount = 0;
      const results = [];
      
      fSnapshot.forEach(doc => {
        const data = doc.data();
        const desc = data.description || '';
        
        if (!desc || desc.trim() === '') {
          noDescCount++;
          results.push({
            id: doc.id,
            year: data.year,
            department: data.department,
            code: data.code,
            description: desc
          });
        }
      });
      
      console.log(`F codes with NO description: ${noDescCount}`);
      
      if (results.length > 0) {
        console.log('\nDetails:');
        results.forEach((r, i) => {
          console.log(`  ${i + 1}. Year: ${r.year} | Dept: ${r.department} | ID: ${r.id}`);
        });
      } else if (fSnapshot.size > 0) {
        console.log('✓ All F codes have descriptions!');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCitraGardenFCodes().then(() => process.exit(0));
