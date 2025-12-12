#!/usr/bin/env node
/**
 * Test Felix IT query to debug why it returns 0 results
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Initialize Firebase
const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function testQuery() {
  console.log('\n🔍 Testing Felix IT Query Logic\n');
  console.log('='.repeat(60));

  // Step 1: Check departments table for IT category
  console.log('\n📋 Step 1: Looking up IT departments...\n');
  const deptsSnapshot = await db.collection('departments').get();
  const allDepts = deptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  const itDepts = allDepts.filter(d => 
    d.category?.toLowerCase() === 'it' ||
    d.originalNames?.some(name => name.toLowerCase() === 'it')
  );

  console.log(`Found ${itDepts.length} IT department(s):`);
  itDepts.forEach(d => {
    console.log(`  - ${d.name} (category: ${d.category})`);
    console.log(`    Original names: ${d.originalNames?.join(', ')}`);
  });

  // Collect all original names
  const itOriginalNames = [];
  itDepts.forEach(d => {
    if (d.originalNames) itOriginalNames.push(...d.originalNames);
  });

  console.log(`\n📝 Total ${itOriginalNames.length} original department names:`);
  itOriginalNames.forEach(name => console.log(`  - "${name}"`));

  // Step 2: Check audit-results for year 2024
  console.log('\n\n📋 Step 2: Checking audit-results for year 2024...\n');
  const auditSnapshot = await db.collection('audit-results')
    .where('year', '==', '2024')
    .limit(10)
    .get();

  console.log(`Found ${auditSnapshot.size} results with year=2024 (showing first 10)`);
  auditSnapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`  - ${data.projectName} | Dept: "${data.department}" | Year: ${data.year}`);
  });

  // Step 3: Query with IT department names
  console.log('\n\n📋 Step 3: Querying with IT department names...\n');
  
  if (itOriginalNames.length === 0) {
    console.log('❌ No IT department names found! This is the problem.');
    return;
  }

  // Try with first department name
  const firstDeptName = itOriginalNames[0];
  console.log(`Testing with first department: "${firstDeptName}"`);
  
  const testQuery = await db.collection('audit-results')
    .where('department', '==', firstDeptName)
    .where('year', '==', '2024')
    .limit(5)
    .get();

  console.log(`\nResults: ${testQuery.size}`);
  testQuery.docs.forEach(doc => {
    const data = doc.data();
    console.log(`  ✓ ${data.projectName} | ${data.department} | ${data.year}`);
  });

  // Step 4: Try with 'in' operator (up to 10 names)
  if (itOriginalNames.length > 1) {
    console.log(`\n\n📋 Step 4: Trying 'in' operator with ${Math.min(10, itOriginalNames.length)} names...\n`);
    
    const namesToQuery = itOriginalNames.slice(0, 10);
    console.log('Querying with:', namesToQuery.join(', '));
    
    const inQuery = await db.collection('audit-results')
      .where('department', 'in', namesToQuery)
      .where('year', '==', '2024')
      .limit(20)
      .get();

    console.log(`\nResults: ${inQuery.size}`);
    inQuery.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  ✓ ${data.projectName} | ${data.department} | ${data.year}`);
    });
  }

  // Step 5: Check what departments actually exist in 2024 data
  console.log('\n\n📋 Step 5: What departments exist in 2024 data?\n');
  const all2024 = await db.collection('audit-results')
    .where('year', '==', '2024')
    .get();

  const deptCounts = {};
  all2024.docs.forEach(doc => {
    const dept = doc.data().department || 'Unknown';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });

  console.log('Departments in 2024 data:');
  Object.entries(deptCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([dept, count]) => {
      const isIT = dept.toLowerCase().includes('it') || dept.toLowerCase().includes('teknologi');
      console.log(`  ${isIT ? '🔥' : '  '} ${dept}: ${count}`);
    });

  console.log('\n' + '='.repeat(60));
}

testQuery()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
