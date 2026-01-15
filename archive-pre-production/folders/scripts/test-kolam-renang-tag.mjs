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

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function main() {
  console.log('=== Testing "Kolam Renang" Tag ===\n');
  
  const snapshot = await db.collection('audit-results')
    .where('tags', 'array-contains', 'Kolam Renang')
    .limit(5)
    .get();
  
  console.log(`Found ${snapshot.size} records with "Kolam Renang" tag\n`);
  
  snapshot.docs.forEach((doc, i) => {
    const data = doc.data();
    console.log(`${i+1}. ${data.projectName}`);
    console.log(`   Dept: ${data.department}`);
    console.log(`   Risk: ${data.riskArea?.substring(0, 80)}...`);
    console.log(`   Tags: ${data.tags?.join(', ')}\n`);
  });
  
  // Also test Kualitas Air Kolam
  console.log('\n=== Testing "Kualitas Air Kolam" Tag ===\n');
  
  const snapshot2 = await db.collection('audit-results')
    .where('tags', 'array-contains', 'Kualitas Air Kolam')
    .limit(5)
    .get();
  
  console.log(`Found ${snapshot2.size} records with "Kualitas Air Kolam" tag\n`);
  
  snapshot2.docs.forEach((doc, i) => {
    const data = doc.data();
    console.log(`${i+1}. ${data.projectName}`);
    console.log(`   Desc: ${data.description?.substring(0, 100)}...`);
    console.log(`   Tags: ${data.tags?.join(', ')}\n`);
  });
}

main().then(() => process.exit(0)).catch(console.error);
