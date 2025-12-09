#!/usr/bin/env node

/**
 * Quick script to check audit-results data in Firestore
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

async function checkAuditResults() {
  console.log('🔍 Checking audit-results collection...\n');

  try {
    // 1. Count total documents
    const allDocs = await db.collection('audit-results').get();
    console.log(`📊 Total documents: ${allDocs.size}`);

    // 2. Check year 2024 documents (as number)
    const year2024Num = await db.collection('audit-results')
      .where('year', '==', 2024)
      .get();
    console.log(`📅 Year 2024 (number): ${year2024Num.size}`);

    // 3. Check year 2024 documents (as string)
    const year2024Str = await db.collection('audit-results')
      .where('year', '==', '2024')
      .get();
    console.log(`📅 Year "2024" (string): ${year2024Str.size}`);

    const year2024 = year2024Str.size > 0 ? year2024Str : year2024Num;

    // 4. Check IT department documents
    const itDocs = await db.collection('audit-results')
      .where('department', '==', 'IT')
      .get();
    console.log(`💻 IT department (exact): ${itDocs.size}`);

    // 5. Check what years exist and their types
    const yearMap = new Map();
    allDocs.forEach(doc => {
      const data = doc.data();
      const year = data.year;
      const type = typeof year;
      const key = `${year} (${type})`;
      yearMap.set(key, (yearMap.get(key) || 0) + 1);
    });
    console.log(`\n📅 Years in database:`);
    Array.from(yearMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([year, count]) => console.log(`   - ${year}: ${count} docs`));

    // 6. Sample departments in 2024
    const deptMap = new Map();
    year2024.forEach(doc => {
      const data = doc.data();
      const dept = data.department;
      deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
    });
    console.log(`\n🏢 Departments in 2024 (${deptMap.size}):`);
    Array.from(deptMap.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([dept, count]) => console.log(`   - ${dept}: ${count} docs`));

    // 6. Check for findings (code != '')
    let findingsCount = 0;
    year2024.forEach(doc => {
      const data = doc.data();
      if (data.code && data.code !== '') {
        findingsCount++;
      }
    });
    console.log(`\n🔍 Findings in 2024: ${findingsCount}`);
    console.log(`📝 Non-findings in 2024: ${year2024.size - findingsCount}`);

    // 7. Show sample IT 2024 finding
    console.log('\n📋 Sample IT 2024 documents:');
    let count = 0;
    year2024.forEach(doc => {
      const data = doc.data();
      if (data.department && data.department.toLowerCase().includes('it') && count < 3) {
        console.log(`\n   ${count + 1}. ${data.auditResultId}`);
        console.log(`      Department: ${data.department}`);
        console.log(`      Year: ${data.year}`);
        console.log(`      Project: ${data.projectName}`);
        console.log(`      Code: ${data.code || '(empty)'}`);
        console.log(`      Type: ${data.code ? 'Finding' : 'Non-Finding'}`);
        count++;
      }
    });

    if (count === 0) {
      console.log('   ⚠️ No IT documents found in 2024');
      console.log('\n   Checking all department names containing "IT":');
      year2024.forEach(doc => {
        const data = doc.data();
        if (data.department && data.department.toUpperCase().includes('IT')) {
          console.log(`      - "${data.department}"`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }

  process.exit(0);
}

checkAuditResults();
