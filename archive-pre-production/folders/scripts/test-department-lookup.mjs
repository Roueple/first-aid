#!/usr/bin/env node

/**
 * Test Department Lookup Logic
 * Verify that "IT" maps to correct department names
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceaccountKey.json'), 'utf8')
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function testDepartmentLookup() {
  console.log('='.repeat(80));
  console.log('TESTING DEPARTMENT LOOKUP LOGIC');
  console.log('='.repeat(80));
  console.log();

  // Test 1: Get by category "IT"
  console.log('Test 1: Get departments by category "IT"');
  const itDepts = await db.collection('departments')
    .where('category', '==', 'IT')
    .get();
  
  console.log(`Found ${itDepts.size} departments with category="IT":`);
  itDepts.docs.forEach(doc => {
    const data = doc.data();
    console.log(`  - ${data.name} (${data.originalNames.length} original names)`);
    data.originalNames.forEach(name => {
      console.log(`    • ${name}`);
    });
  });
  console.log();

  // Test 2: Count audit results for each IT department name
  console.log('Test 2: Count audit results for each IT department name in 2024');
  const allOriginalNames = [];
  itDepts.docs.forEach(doc => {
    allOriginalNames.push(...doc.data().originalNames);
  });

  let totalFindings = 0;
  for (const name of allOriginalNames) {
    const snapshot = await db.collection('audit-results')
      .where('year', '==', '2024')
      .where('department', '==', name)
      .get();
    
    if (snapshot.size > 0) {
      console.log(`  ${name}: ${snapshot.size} findings`);
      totalFindings += snapshot.size;
    }
  }
  
  console.log();
  console.log(`Total IT findings in 2024: ${totalFindings}`);
  console.log();

  // Test 3: Verify the logic
  console.log('='.repeat(80));
  console.log('VERIFICATION');
  console.log('='.repeat(80));
  if (totalFindings === 6) {
    console.log('✅ SUCCESS: Found expected 6 IT findings');
  } else {
    console.log(`❌ FAILED: Expected 6 findings, got ${totalFindings}`);
  }
}

testDepartmentLookup()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
