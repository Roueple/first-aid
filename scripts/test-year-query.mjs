#!/usr/bin/env node

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

async function testYearQuery() {
  console.log('Testing year queries with string vs number...\n');

  // Test 1: Query with string "2024"
  console.log('Test 1: Querying with string "2024"');
  const stringQuery = await db.collection('audit-results')
    .where('year', '==', '2024')
    .limit(5)
    .get();
  console.log(`  Results: ${stringQuery.size}`);
  if (stringQuery.size > 0) {
    console.log(`  Sample year value: "${stringQuery.docs[0].data().year}" (type: ${typeof stringQuery.docs[0].data().year})`);
  }

  // Test 2: Query with number 2024
  console.log('\nTest 2: Querying with number 2024');
  const numberQuery = await db.collection('audit-results')
    .where('year', '==', 2024)
    .limit(5)
    .get();
  console.log(`  Results: ${numberQuery.size}`);
  if (numberQuery.size > 0) {
    console.log(`  Sample year value: "${numberQuery.docs[0].data().year}" (type: ${typeof numberQuery.docs[0].data().year})`);
  }

  // Test 3: Check IT department findings in 2024
  console.log('\nTest 3: IT findings in 2024 (string query)');
  const itQuery = await db.collection('audit-results')
    .where('year', '==', '2024')
    .get();
  
  const itFindings = itQuery.docs.filter(doc => {
    const dept = doc.data().department;
    return dept && (
      dept.includes('IT') || 
      dept.includes('ICT') || 
      dept.includes('Teknologi Informasi')
    );
  }).filter(doc => doc.data().code && doc.data().code !== 'NF');

  console.log(`  Total 2024 results: ${itQuery.size}`);
  console.log(`  IT-related findings: ${itFindings.length}`);
}

testYearQuery().then(() => process.exit(0)).catch(console.error);
