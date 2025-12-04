#!/usr/bin/env node

/**
 * Fix Project Counts from Audit Results
 * 
 * This script recalculates finding and non-finding counts for all projects
 * by querying the audit-results collection based on projectName.
 * 
 * Logic:
 * - Finding: audit results where code starts with 'F' (Finding)
 * - Non-Finding: audit results where code starts with 'NF' (Non-Finding)
 * - Total: sum of finding + nonFinding
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceaccountKey.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/**
 * Count audit results for a project
 */
async function countAuditResults(projectName) {
  try {
    const auditResultsSnapshot = await db
      .collection('audit-results')
      .where('projectName', '==', projectName)
      .get();
    
    let finding = 0;
    let nonFinding = 0;
    
    auditResultsSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      const code = data.code || '';
      
      // Check if code starts with 'F' (Finding) or 'NF' (Non-Finding)
      if (code.toUpperCase().startsWith('F') && !code.toUpperCase().startsWith('NF')) {
        finding++;
      } else if (code.toUpperCase().startsWith('NF')) {
        nonFinding++;
      }
    });
    
    const total = finding + nonFinding;
    
    return { finding, nonFinding, total };
  } catch (error) {
    console.error(`Error counting audit results for ${projectName}:`, error);
    return { finding: 0, nonFinding: 0, total: 0 };
  }
}

/**
 * Fix counts for all projects
 */
async function fixAllProjectCounts() {
  console.log('🔄 Starting project counts fix from audit-results...\n');
  
  try {
    // Get all projects
    const projectsSnapshot = await db.collection('projects').get();
    
    if (projectsSnapshot.empty) {
      console.log('⚠️  No projects found in database');
      return;
    }
    
    console.log(`📋 Found ${projectsSnapshot.size} projects\n`);
    
    let updated = 0;
    let unchanged = 0;
    let errors = 0;
    
    for (const docSnap of projectsSnapshot.docs) {
      const project = docSnap.data();
      const projectName = project.projectName;
      
      try {
        console.log(`🔍 Processing: ${projectName}...`);
        
        // Count audit results
        const { finding, nonFinding, total } = await countAuditResults(projectName);
        
        // Check if update is needed
        const needsUpdate = 
          project.finding !== finding || 
          project.nonFinding !== nonFinding || 
          project.total !== total;
        
        if (needsUpdate) {
          // Update project
          await db.collection('projects').doc(docSnap.id).update({
            finding: finding,
            nonFinding: nonFinding,
            total: total,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          console.log(`   ✅ Updated: ${finding} findings, ${nonFinding} non-findings, ${total} total`);
          console.log(`   📊 Previous: ${project.finding} findings, ${project.nonFinding} non-findings, ${project.total} total`);
          updated++;
        } else {
          console.log(`   ⏭️  Unchanged: ${finding} findings, ${nonFinding} non-findings, ${total} total`);
          unchanged++;
        }
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Fix Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Unchanged: ${unchanged}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📋 Total: ${projectsSnapshot.size}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  }
}

// Run fix
fixAllProjectCounts()
  .then(() => {
    console.log('\n✅ Project counts fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Project counts fix failed:', error);
    process.exit(1);
  });
