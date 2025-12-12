#!/usr/bin/env node

/**
 * Update project finding counts from audit-results table
 * 
 * This script recalculates the finding, nonFinding, and total columns
 * in the projects table by counting audit results:
 * - Finding: code starts with 'F' (but not 'NF')
 * - Non-Finding: code starts with 'NF'
 * - Total: sum of findings + non-findings
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

async function updateProjectCounts() {
  console.log('🔄 Starting project counts update from audit-results...\n');

  try {
    // Get all projects
    const projectsSnapshot = await db.collection('projects').get();
    const projects = projectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📊 Found ${projects.length} projects to update\n`);

    let updatedCount = 0;
    let unchangedCount = 0;
    let errorCount = 0;

    for (const project of projects) {
      try {
        // Get all audit results for this project
        const auditResultsSnapshot = await db
          .collection('audit-results')
          .where('projectName', '==', project.projectName)
          .get();

        // Count findings and non-findings based on code
        let findingCount = 0;
        let nonFindingCount = 0;

        auditResultsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const code = (data.code || '').toUpperCase();

          // Check if code starts with 'F' (Finding) or 'NF' (Non-Finding)
          if (code.startsWith('NF')) {
            nonFindingCount++;
          } else if (code.startsWith('F')) {
            findingCount++;
          }
        });

        const totalCount = findingCount + nonFindingCount;

        // Check if update is needed
        const needsUpdate = 
          project.finding !== findingCount ||
          project.nonFinding !== nonFindingCount ||
          project.total !== totalCount;

        if (needsUpdate) {
          // Update the project
          await db.collection('projects').doc(project.id).update({
            finding: findingCount,
            nonFinding: nonFindingCount,
            total: totalCount,
            updatedAt: new Date()
          });

          console.log(`✅ ${project.projectName}`);
          console.log(`   Findings: ${project.finding || 0} → ${findingCount}`);
          console.log(`   Non-Findings: ${project.nonFinding || 0} → ${nonFindingCount}`);
          console.log(`   Total: ${project.total || 0} → ${totalCount}\n`);
          
          updatedCount++;
        } else {
          console.log(`⏭️  ${project.projectName} (no changes needed)`);
          unchangedCount++;
        }

      } catch (error) {
        console.error(`❌ Error updating ${project.projectName}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 Update Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Updated: ${updatedCount} projects`);
    console.log(`⏭️  Unchanged: ${unchangedCount} projects`);
    console.log(`❌ Errors: ${errorCount} projects`);
    console.log(`📊 Total: ${projects.length} projects`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the update
updateProjectCounts()
  .then(() => {
    console.log('\n✨ Project counts update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  });
