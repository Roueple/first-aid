#!/usr/bin/env node

/**
 * Update Project Findings Count
 * 
 * Calculates the total findings count for each project
 * by counting audit results that match the project name.
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

async function updateProjectFindingsCounts() {
  console.log('📊 Calculating findings count per project...\n');

  const projectsRef = db.collection('projects');
  const auditResultsRef = db.collection('audit_results');

  // Get all projects
  const projectsSnapshot = await projectsRef.get();
  const projects = projectsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  console.log(`Found ${projects.length} projects to process\n`);

  let updatedCount = 0;
  let totalFindings = 0;

  for (const project of projects) {
    try {
      // Count audit results matching this project name
      const querySnapshot = await auditResultsRef
        .where('projectName', '==', project.projectName)
        .where('code', '==', 'F') // Only count actual findings
        .get();

      const findingsCount = querySnapshot.size;
      totalFindings += findingsCount;

      // Update the project with findings count
      await projectsRef.doc(project.id).update({
        findingsCount,
        updatedAt: Timestamp.now()
      });

      console.log(`✅ ${project.projectName}: ${findingsCount} findings`);
      updatedCount++;
    } catch (error) {
      console.error(`❌ Error processing ${project.projectName}:`, error.message);
    }
  }

  console.log(`\n📊 Update complete:`);
  console.log(`   ✅ Updated: ${updatedCount} projects`);
  console.log(`   🔍 Total findings: ${totalFindings}`);
}

// Run the update
updateProjectFindingsCounts()
  .then(() => {
    console.log('\n✨ Project findings count update finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
