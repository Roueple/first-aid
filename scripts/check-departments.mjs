#!/usr/bin/env node

/**
 * Script to check departments in Firestore
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceaccountKey.json'), 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function checkDepartments() {
  console.log('🔍 Fetching all departments...\n');
  
  const snapshot = await db.collection('departments').get();
  console.log(`📊 Total departments: ${snapshot.size}\n`);

  // Group by category
  const byCategory = new Map();
  const allDepts = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    allDepts.push({ id: doc.id, ...data });
    
    const category = data.category || 'Uncategorized';
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category).push(data);
  });

  // Sort categories by count
  const sortedCategories = [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length);

  console.log('📊 Departments by Category:\n');
  for (const [category, depts] of sortedCategories) {
    console.log(`\n${category} (${depts.length}):`);
    console.log('─'.repeat(50));
    
    for (const dept of depts.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`  • ${dept.name}`);
      if (dept.originalNames && dept.originalNames.length > 0) {
        console.log(`    Original: ${dept.originalNames.join(', ')}`);
      }
    }
  }

  // Check for potential duplicates
  console.log('\n\n🔍 Checking for potential duplicates...\n');
  const nameMap = new Map();
  
  for (const dept of allDepts) {
    const lowerName = dept.name.toLowerCase();
    if (!nameMap.has(lowerName)) {
      nameMap.set(lowerName, []);
    }
    nameMap.get(lowerName).push(dept);
  }

  const duplicates = [...nameMap.entries()].filter(([_, depts]) => depts.length > 1);
  
  if (duplicates.length > 0) {
    console.log('⚠️  Found potential duplicates:');
    for (const [name, depts] of duplicates) {
      console.log(`\n  "${name}" appears ${depts.length} times:`);
      for (const dept of depts) {
        console.log(`    - ID: ${dept.id}, Category: ${dept.category}`);
      }
    }
  } else {
    console.log('✅ No duplicates found');
  }
}

checkDepartments()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
