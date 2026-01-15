#!/usr/bin/env node

/**
 * Fix Hotel Raffles Jakarta counts
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

async function fixRaffles() {
  console.log('🔧 Fixing Hotel Raffles Jakarta counts...\n');

  // Get the project
  const projectsSnapshot = await db
    .collection('projects')
    .where('projectName', '==', 'Hotel Raffles Jakarta')
    .get();

  if (projectsSnapshot.empty) {
    console.log('❌ Project not found');
    return;
  }

  const projectDoc = projectsSnapshot.docs[0];
  const project = projectDoc.data();

  console.log('📊 Current project data:');
  console.log('  finding:', project.finding);
  console.log('  nonFinding:', project.nonFinding);
  console.log('  total:', project.total);
  console.log();

  // Get audit results
  console.log('🔍 Querying audit-results...');
  const auditResultsSnapshot = await db
    .collection('audit-results')
    .where('projectName', '==', project.projectName)
    .get();

  console.log('  Found:', auditResultsSnapshot.size, 'records');
  console.log();

  // Count findings and non-findings
  let findingCount = 0;
  let nonFindingCount = 0;

  console.log('📋 Processing audit results:');
  auditResultsSnapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    const code = (data.code || '').toUpperCase();

    if (index < 5) {
      console.log(`  [${index}] code: "${data.code}" -> upper: "${code}"`);
    }

    if (code.startsWith('NF')) {
      nonFindingCount++;
    } else if (code.startsWith('F')) {
      findingCount++;
    }
  });

  const totalCount = findingCount + nonFindingCount;

  console.log();
  console.log('📊 Calculated counts:');
  console.log('  Findings:', findingCount);
  console.log('  Non-Findings:', nonFindingCount);
  console.log('  Total:', totalCount);
  console.log();

  // Update the project
  console.log('💾 Updating project...');
  await db.collection('projects').doc(projectDoc.id).update({
    finding: findingCount,
    nonFinding: nonFindingCount,
    total: totalCount,
    updatedAt: new Date()
  });

  console.log('✅ Project updated successfully!');
  console.log();

  // Verify the update
  const updatedDoc = await db.collection('projects').doc(projectDoc.id).get();
  const updatedData = updatedDoc.data();

  console.log('✔️  Verification:');
  console.log('  finding:', updatedData.finding);
  console.log('  nonFinding:', updatedData.nonFinding);
  console.log('  total:', updatedData.total);
}

fixRaffles()
  .then(() => {
    console.log('\n✨ Fix complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
