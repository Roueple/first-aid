#!/usr/bin/env node

/**
 * Verify data completeness between audit-results and projects tables
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

async function verifyCompleteness() {
  console.log('🔍 Data Completeness Check\n');
  console.log('='.repeat(80));

  // Get all audit results
  console.log('📊 Fetching audit-results...');
  const auditResultsSnapshot = await db.collection('audit-results').get();
  const totalAuditResults = auditResultsSnapshot.size;

  // Count by code type
  let findingsInAudit = 0;
  let nonFindingsInAudit = 0;
  let otherInAudit = 0;

  auditResultsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const code = (data.code || '').toUpperCase();
    
    if (code.startsWith('NF')) {
      nonFindingsInAudit++;
    } else if (code.startsWith('F')) {
      findingsInAudit++;
    } else {
      otherInAudit++;
    }
  });

  console.log(`   Total records: ${totalAuditResults}`);
  console.log(`   Findings (F*): ${findingsInAudit}`);
  console.log(`   Non-Findings (NF*): ${nonFindingsInAudit}`);
  console.log(`   Other/Unknown: ${otherInAudit}`);
  console.log();

  // Get all projects
  console.log('📊 Fetching projects...');
  const projectsSnapshot = await db.collection('projects').get();
  const totalProjects = projectsSnapshot.size;

  let totalFindingsInProjects = 0;
  let totalNonFindingsInProjects = 0;
  let totalInProjects = 0;

  const projectDetails = [];

  projectsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const finding = data.finding || 0;
    const nonFinding = data.nonFinding || 0;
    const total = data.total || 0;

    totalFindingsInProjects += finding;
    totalNonFindingsInProjects += nonFinding;
    totalInProjects += total;

    projectDetails.push({
      projectName: data.projectName,
      finding,
      nonFinding,
      total
    });
  });

  console.log(`   Total projects: ${totalProjects}`);
  console.log(`   Sum of findings: ${totalFindingsInProjects}`);
  console.log(`   Sum of non-findings: ${totalNonFindingsInProjects}`);
  console.log(`   Sum of totals: ${totalInProjects}`);
  console.log();

  // Comparison
  console.log('='.repeat(80));
  console.log('📈 COMPARISON\n');

  const findingMatch = findingsInAudit === totalFindingsInProjects;
  const nonFindingMatch = nonFindingsInAudit === totalNonFindingsInProjects;
  const totalMatch = (findingsInAudit + nonFindingsInAudit) === totalInProjects;

  console.log(`Findings:     ${findingsInAudit} (audit) vs ${totalFindingsInProjects} (projects) ${findingMatch ? '✅' : '❌'}`);
  console.log(`Non-Findings: ${nonFindingsInAudit} (audit) vs ${totalNonFindingsInProjects} (projects) ${nonFindingMatch ? '✅' : '❌'}`);
  console.log(`Total:        ${findingsInAudit + nonFindingsInAudit} (audit) vs ${totalInProjects} (projects) ${totalMatch ? '✅' : '❌'}`);
  console.log();

  if (otherInAudit > 0) {
    console.log(`⚠️  Warning: ${otherInAudit} audit results have codes that don't start with 'F' or 'NF'`);
    console.log();
  }

  // Show all projects with their counts
  console.log('='.repeat(80));
  console.log('📋 ALL PROJECTS (sorted by total, descending)\n');

  projectDetails.sort((a, b) => b.total - a.total);

  console.log('Project Name'.padEnd(50) + 'Finding'.padStart(10) + 'Non-Find'.padStart(10) + 'Total'.padStart(10));
  console.log('-'.repeat(80));

  projectDetails.forEach(p => {
    console.log(
      p.projectName.padEnd(50) +
      p.finding.toString().padStart(10) +
      p.nonFinding.toString().padStart(10) +
      p.total.toString().padStart(10)
    );
  });

  console.log('-'.repeat(80));
  console.log(
    'TOTAL'.padEnd(50) +
    totalFindingsInProjects.toString().padStart(10) +
    totalNonFindingsInProjects.toString().padStart(10) +
    totalInProjects.toString().padStart(10)
  );

  console.log();
  console.log('='.repeat(80));

  if (totalMatch && findingMatch && nonFindingMatch) {
    console.log('✅ DATA IS COMPLETE - All counts match!');
  } else {
    console.log('❌ DATA MISMATCH - Counts do not match!');
    
    if (!totalMatch) {
      const diff = (findingsInAudit + nonFindingsInAudit) - totalInProjects;
      console.log(`   Difference: ${diff > 0 ? '+' : ''}${diff} records`);
    }
  }

  console.log('='.repeat(80));
}

verifyCompleteness()
  .then(() => {
    console.log('\n✨ Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
