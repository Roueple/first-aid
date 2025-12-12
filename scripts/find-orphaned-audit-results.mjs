#!/usr/bin/env node

/**
 * Find audit results that don't have matching projects
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync('./serviceaccountKey.json', 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function findOrphans() {
  console.log('🔍 Finding orphaned audit results...\n');

  // Get all projects
  const projectsSnapshot = await db.collection('projects').get();
  const projectNames = new Set(projectsSnapshot.docs.map(doc => doc.data().projectName));

  console.log(`📊 Found ${projectNames.size} unique project names in projects table\n`);

  // Get all audit results
  const auditResultsSnapshot = await db.collection('audit-results').get();
  console.log(`📊 Found ${auditResultsSnapshot.size} audit results\n`);

  // Find audit results with project names not in projects table
  const orphanedResults = new Map();
  const matchedCount = new Map();

  auditResultsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const projectName = data.projectName;

    if (!projectNames.has(projectName)) {
      if (!orphanedResults.has(projectName)) {
        orphanedResults.set(projectName, []);
      }
      orphanedResults.get(projectName).push({
        id: doc.id,
        code: data.code,
        finding: data.finding,
        year: data.year
      });
    } else {
      matchedCount.set(projectName, (matchedCount.get(projectName) || 0) + 1);
    }
  });

  console.log('='.repeat(80));
  console.log('📈 RESULTS\n');

  if (orphanedResults.size === 0) {
    console.log('✅ No orphaned audit results found!');
    console.log('   All audit results have matching projects.');
  } else {
    console.log(`❌ Found ${orphanedResults.size} project names in audit-results that don't exist in projects table:\n`);

    let totalOrphaned = 0;
    const sortedOrphans = Array.from(orphanedResults.entries()).sort((a, b) => b[1].length - a[1].length);

    sortedOrphans.forEach(([projectName, results]) => {
      totalOrphaned += results.length;
      console.log(`\n"${projectName}" (${results.length} records)`);
      
      // Show first 3 examples
      results.slice(0, 3).forEach(r => {
        console.log(`  - ID: ${r.id}, Code: ${r.code}, Year: ${r.year}`);
      });
      
      if (results.length > 3) {
        console.log(`  ... and ${results.length - 3} more`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Total orphaned records: ${totalOrphaned}`);
    console.log(`📊 Total matched records: ${auditResultsSnapshot.size - totalOrphaned}`);
    console.log(`📊 Difference from expected: ${totalOrphaned} (this explains the mismatch!)`);
  }

  console.log('\n' + '='.repeat(80));
}

findOrphans()
  .then(() => {
    console.log('\n✨ Analysis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
