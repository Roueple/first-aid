#!/usr/bin/env node
/**
 * Test Felix follow-up query issue
 * Investigate why "khusus mall ciputra cibubur" returns different results
 */

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

async function testQuery() {
  console.log('🔍 Testing Felix follow-up query issue\n');

  // First query: All HC findings 2024
  console.log('📋 Query 1: All HC findings 2024');
  const query1 = db.collection('audit-results')
    .where('year', '==', 2024)
    .where('code', '==', 'F');

  const snapshot1 = await query1.get();
  console.log(`Found ${snapshot1.size} results\n`);

  // Filter by department in-memory (since we need to match multiple department names)
  const hcDepartments = ['HCM', 'HRD', 'Departemen HCM', 'Departemen HRD', 'Human Capital', 'HR'];
  const hcResults = snapshot1.docs.filter(doc => {
    const dept = doc.data().department;
    return hcDepartments.some(hcDept => 
      dept && dept.toLowerCase().includes(hcDept.toLowerCase())
    );
  });

  console.log(`After HC department filter: ${hcResults.length} results`);

  // Find Mall Ciputra Cibubur in results
  const mallCiputraCibubur = hcResults.filter(doc => {
    const projectName = doc.data().projectName;
    return projectName && projectName.toLowerCase().includes('mall ciputra cibubur');
  });

  console.log(`\n📍 Mall Ciputra Cibubur findings in Query 1: ${mallCiputraCibubur.length}`);
  mallCiputraCibubur.forEach(doc => {
    const data = doc.data();
    console.log(`  - ${data.projectName} | ${data.department} | ${data.description.substring(0, 80)}...`);
    console.log(`    ID: ${doc.id}`);
  });

  // Second query: Only Mall Ciputra Cibubur
  console.log('\n\n📋 Query 2: Only Mall Ciputra Cibubur (HC, 2024, F)');
  
  // Get all projects to find exact name
  const projectsSnapshot = await db.collection('projects').get();
  const allProjectNames = projectsSnapshot.docs.map(doc => doc.data().projectName);
  
  // Find exact match for "Mall Ciputra Cibubur"
  const exactMatch = allProjectNames.find(name => 
    name.toLowerCase().includes('mall ciputra cibubur')
  );
  
  console.log(`Exact project name: "${exactMatch}"`);

  let hcResults2 = [];
  if (exactMatch) {
    const query2 = db.collection('audit-results')
      .where('projectName', '==', exactMatch)
      .where('year', '==', 2024)
      .where('code', '==', 'F');

    const snapshot2 = await query2.get();
    console.log(`Found ${snapshot2.size} results (all departments)\n`);

    // Filter by HC departments
    hcResults2 = snapshot2.docs.filter(doc => {
      const dept = doc.data().department;
      return hcDepartments.some(hcDept => 
        dept && dept.toLowerCase().includes(hcDept.toLowerCase())
      );
    });

    console.log(`After HC department filter: ${hcResults2.length} results`);
    
    hcResults2.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.department} | ${data.riskArea}`);
      console.log(`    ${data.description.substring(0, 100)}...`);
      console.log(`    ID: ${doc.id}\n`);
    });

    // Check if the specific finding is in Query 2
    const specificFindingId = 'pYWCTz5TfceUf42aBOEg';
    const foundInQuery2 = hcResults2.some(doc => doc.id === specificFindingId);
    
    console.log(`\n🔍 Specific finding (${specificFindingId}) found in Query 2: ${foundInQuery2}`);
    
    if (!foundInQuery2) {
      // Check if it exists at all
      const specificDoc = await db.collection('audit-results').doc(specificFindingId).get();
      if (specificDoc.exists) {
        const data = specificDoc.data();
        console.log(`\n⚠️ Finding exists but not in Query 2 results:`);
        console.log(`  Project: ${data.projectName}`);
        console.log(`  Department: ${data.department}`);
        console.log(`  Year: ${data.year} (type: ${typeof data.year})`);
        console.log(`  Code: ${data.code}`);
        console.log(`  Description: ${data.description.substring(0, 100)}...`);
      } else {
        console.log(`\n❌ Finding ${specificFindingId} does not exist in database`);
      }
    }
  }

  // Compare results
  console.log('\n\n📊 COMPARISON:');
  console.log(`Query 1 (All HC 2024): ${hcResults.length} results`);
  console.log(`Query 2 (Mall Ciputra Cibubur HC 2024): ${hcResults2.length} results`);
  
  if (mallCiputraCibubur.length > 0 && hcResults2.length > 0) {
    const query1Ids = new Set(mallCiputraCibubur.map(doc => doc.id));
    const query2Ids = new Set(hcResults2.map(doc => doc.id));
    
    const inQuery1NotQuery2 = [...query1Ids].filter(id => !query2Ids.has(id));
    const inQuery2NotQuery1 = [...query2Ids].filter(id => !query1Ids.has(id));
    
    console.log(`\nIn Query 1 but not Query 2: ${inQuery1NotQuery2.length}`);
    inQuery1NotQuery2.forEach(id => {
      const doc = mallCiputraCibubur.find(d => d.id === id);
      if (doc) {
        const data = doc.data();
        console.log(`  - ${id}: ${data.projectName} | ${data.department}`);
      }
    });
    
    console.log(`\nIn Query 2 but not Query 1: ${inQuery2NotQuery1.length}`);
    inQuery2NotQuery1.forEach(id => {
      const doc = hcResults2.find(d => d.id === id);
      if (doc) {
        const data = doc.data();
        console.log(`  - ${id}: ${data.projectName} | ${data.department}`);
      }
    });
  }
}

testQuery()
  .then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
