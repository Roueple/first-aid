#!/usr/bin/env node
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function checkYearType() {
  console.log('\n🔍 Checking year data type in audit-results\n');
  
  const sample = await db.collection('audit-results').limit(5).get();
  
  sample.docs.forEach(doc => {
    const data = doc.data();
    const yearValue = data.year;
    const yearType = typeof yearValue;
    console.log(`Year: ${yearValue} | Type: ${yearType} | Project: ${data.projectName}`);
  });

  // Test query with string
  console.log('\n\nTesting query with STRING "2024":');
  const stringQuery = await db.collection('audit-results').where('year', '==', '2024').limit(3).get();
  console.log(`Results: ${stringQuery.size}`);

  // Test query with number
  console.log('\nTesting query with NUMBER 2024:');
  const numberQuery = await db.collection('audit-results').where('year', '==', 2024).limit(3).get();
  console.log(`Results: ${numberQuery.size}`);
}

checkYearType().then(() => process.exit(0)).catch(console.error);
