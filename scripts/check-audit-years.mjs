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

async function checkAuditYears() {
  console.log('Checking audit-results years and departments...\n');

  const snapshot = await db.collection('audit-results').get();
  console.log(`Total audit results: ${snapshot.size}\n`);

  const yearStats = {};
  const deptStats = {};
  let withDeptId = 0;
  let withoutDeptId = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const year = data.year || 'Unknown';
    
    yearStats[year] = (yearStats[year] || 0) + 1;

    if (data.departmentId) {
      withDeptId++;
      const deptDoc = await db.collection('departments').doc(data.departmentId).get();
      if (deptDoc.exists) {
        const category = deptDoc.data().category || 'Unknown';
        deptStats[category] = (deptStats[category] || 0) + 1;
      }
    } else {
      withoutDeptId++;
    }
  }

  console.log('YEAR DISTRIBUTION:');
  Object.entries(yearStats).sort().forEach(([year, count]) => {
    console.log(`  ${year}: ${count}`);
  });

  console.log('\nDEPARTMENT CATEGORY DISTRIBUTION:');
  Object.entries(deptStats).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });

  console.log(`\nWith departmentId: ${withDeptId}`);
  console.log(`Without departmentId: ${withoutDeptId}`);
}

checkAuditYears().then(() => process.exit(0)).catch(console.error);
