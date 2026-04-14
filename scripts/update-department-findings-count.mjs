#!/usr/bin/env node

/**
 * Update Department Findings Count
 * 
 * Calculates the total findings count for each department in department_tags
 * by counting audit results that match the department name.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function updateDepartmentFindingsCounts() {
  console.log('📊 Calculating findings count per department...\n');

  const tagsRef = db.collection('department_tags');
  const auditResultsRef = db.collection('audit_results');

  // Get all department tags
  const tagsSnapshot = await tagsRef.get();
  const departmentTags = tagsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  console.log(`Found ${departmentTags.length} departments to process\n`);

  let updatedCount = 0;
  let totalFindings = 0;

  for (const dept of departmentTags) {
    try {
      // Count audit results matching this department name
      const querySnapshot = await auditResultsRef
        .where('department', '==', dept.departmentName)
        .where('code', '==', 'F') // Only count actual findings
        .get();

      const findingsCount = querySnapshot.size;
      totalFindings += findingsCount;

      // Update the department tag with findings count
      await tagsRef.doc(dept.id).update({
        findingsCount,
        updatedAt: Timestamp.now()
      });

      console.log(`✅ ${dept.departmentName}: ${findingsCount} findings`);
      updatedCount++;
    } catch (error) {
      console.error(`❌ Error processing ${dept.departmentName}:`, error.message);
    }
  }

  console.log(`\n📊 Update complete:`);
  console.log(`   ✅ Updated: ${updatedCount} departments`);
  console.log(`   🔍 Total findings: ${totalFindings}`);
}

// Run the update
updateDepartmentFindingsCounts()
  .then(() => {
    console.log('\n✨ Department findings count update finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
