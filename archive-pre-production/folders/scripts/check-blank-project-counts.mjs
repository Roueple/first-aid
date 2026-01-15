#!/usr/bin/env node

/**
 * Check for projects with blank/null/undefined counts
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

async function checkBlankCounts() {
  console.log('🔍 Checking for blank project counts...\n');

  const projectsSnapshot = await db.collection('projects').get();
  console.log(`📊 Total projects: ${projectsSnapshot.size}\n`);

  const issues = {
    blankFinding: [],
    blankNonFinding: [],
    blankTotal: [],
    zeroTotal: [],
    mismatchTotal: []
  };

  projectsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const finding = data.finding;
    const nonFinding = data.nonFinding;
    const total = data.total;

    // Check for null/undefined
    if (finding === null || finding === undefined) {
      issues.blankFinding.push(data.projectName);
    }
    if (nonFinding === null || nonFinding === undefined) {
      issues.blankNonFinding.push(data.projectName);
    }
    if (total === null || total === undefined) {
      issues.blankTotal.push(data.projectName);
    }

    // Check for zero total
    if (total === 0) {
      issues.zeroTotal.push(data.projectName);
    }

    // Check if total matches finding + nonFinding
    const calculatedTotal = (finding || 0) + (nonFinding || 0);
    if (total !== calculatedTotal) {
      issues.mismatchTotal.push({
        projectName: data.projectName,
        finding: finding || 0,
        nonFinding: nonFinding || 0,
        total: total || 0,
        expected: calculatedTotal
      });
    }
  });

  console.log('='.repeat(80));
  console.log('📈 RESULTS\n');

  // Blank finding
  if (issues.blankFinding.length > 0) {
    console.log(`❌ Projects with blank/null finding count: ${issues.blankFinding.length}`);
    issues.blankFinding.forEach(name => console.log(`   - ${name}`));
    console.log();
  } else {
    console.log('✅ No projects with blank finding count\n');
  }

  // Blank non-finding
  if (issues.blankNonFinding.length > 0) {
    console.log(`❌ Projects with blank/null nonFinding count: ${issues.blankNonFinding.length}`);
    issues.blankNonFinding.forEach(name => console.log(`   - ${name}`));
    console.log();
  } else {
    console.log('✅ No projects with blank nonFinding count\n');
  }

  // Blank total
  if (issues.blankTotal.length > 0) {
    console.log(`❌ Projects with blank/null total count: ${issues.blankTotal.length}`);
    issues.blankTotal.forEach(name => console.log(`   - ${name}`));
    console.log();
  } else {
    console.log('✅ No projects with blank total count\n');
  }

  // Zero total
  if (issues.zeroTotal.length > 0) {
    console.log(`⚠️  Projects with zero total: ${issues.zeroTotal.length}`);
    issues.zeroTotal.forEach(name => console.log(`   - ${name}`));
    console.log();
  } else {
    console.log('✅ No projects with zero total\n');
  }

  // Mismatched total
  if (issues.mismatchTotal.length > 0) {
    console.log(`❌ Projects with mismatched total (total ≠ finding + nonFinding): ${issues.mismatchTotal.length}`);
    issues.mismatchTotal.forEach(p => {
      console.log(`   - ${p.projectName}`);
      console.log(`     Finding: ${p.finding}, NonFinding: ${p.nonFinding}, Total: ${p.total} (expected: ${p.expected})`);
    });
    console.log();
  } else {
    console.log('✅ All project totals match finding + nonFinding\n');
  }

  console.log('='.repeat(80));

  const hasIssues = 
    issues.blankFinding.length > 0 ||
    issues.blankNonFinding.length > 0 ||
    issues.blankTotal.length > 0 ||
    issues.mismatchTotal.length > 0;

  if (hasIssues) {
    console.log('\n❌ ISSUES FOUND - Some projects have data quality problems');
  } else {
    console.log('\n✅ ALL CHECKS PASSED - No data quality issues found');
  }

  console.log('='.repeat(80));
}

checkBlankCounts()
  .then(() => {
    console.log('\n✨ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
