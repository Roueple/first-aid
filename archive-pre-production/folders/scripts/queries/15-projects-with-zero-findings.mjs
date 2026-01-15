#!/usr/bin/env node
/**
 * Query: Get projects with zero findings (only non-findings)
 * Usage: node scripts/queries/15-projects-with-zero-findings.mjs
 */

// ============================================================
// 🔧 CONFIGURATION - No configuration needed
// ============================================================

import { initDb, printConfig } from './_db-helper.mjs';

const db = initDb();

async function query() {
  printConfig({ QUERY: 'Projects with Zero Findings' });

  const snapshot = await db.collection('projects').get();
  
  const projects = snapshot.docs
    .map(doc => doc.data())
    .filter(p => (p.finding || 0) === 0 && (p.total || 0) > 0)
    .sort((a, b) => (b.nonFinding || 0) - (a.nonFinding || 0));

  if (projects.length === 0) {
    console.log('\n✅ No projects with zero findings found\n');
    return;
  }

  console.log('\n📊 Projects with Zero Findings (only Non-Findings):\n');
  console.log('-'.repeat(70));
  console.log('Project Name'.padEnd(50) + 'Non-Find'.padStart(10) + 'Total'.padStart(10));
  console.log('-'.repeat(70));

  projects.forEach(p => {
    console.log(
      (p.projectName || 'Unknown').substring(0, 49).padEnd(50) +
      (p.nonFinding || 0).toString().padStart(10) +
      (p.total || 0).toString().padStart(10)
    );
  });

  console.log('-'.repeat(70));
  console.log(`\n${projects.length} projects with zero findings\n`);
}

query().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
