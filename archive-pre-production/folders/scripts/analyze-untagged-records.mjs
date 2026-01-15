#!/usr/bin/env node

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';
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
  console.log('Fetching records without tags...\n');
  
  // Get all records and filter those without tags
  const snapshot = await db.collection('audit-results').get();
  
  const untagged = [];
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (!data.tags || data.tags.length === 0) {
      untagged.push({
        id: doc.id,
        projectName: data.projectName,
        department: data.department,
        riskArea: data.riskArea,
        description: data.description,
        code: data.code
      });
    }
  });
  
  console.log(`Found ${untagged.length} untagged records\n`);
  
  // Group by department for analysis
  const byDept = {};
  untagged.forEach(r => {
    const dept = r.department || 'Unknown';
    if (!byDept[dept]) byDept[dept] = [];
    byDept[dept].push(r);
  });
  
  console.log('=== BY DEPARTMENT ===');
  Object.entries(byDept).sort((a,b) => b[1].length - a[1].length).forEach(([dept, items]) => {
    console.log(`${dept}: ${items.length}`);
  });
  
  console.log('\n=== SAMPLE UNTAGGED RECORDS ===\n');
  untagged.slice(0, 50).forEach((r, i) => {
    console.log(`${i+1}. [${r.department}] ${r.projectName}`);
    console.log(`   Risk: ${r.riskArea?.substring(0, 100) || '(empty)'}`);
    console.log(`   Desc: ${r.description?.substring(0, 80) || '(empty)'}`);
    console.log('');
  });
  
  // Save to JSON for further analysis
  writeFileSync(join(__dirname, '..', 'test-results', 'untagged-records.json'), 
    JSON.stringify(untagged, null, 2));
  console.log(`\nSaved all ${untagged.length} records to test-results/untagged-records.json`);
}

main().then(() => process.exit(0)).catch(console.error);
