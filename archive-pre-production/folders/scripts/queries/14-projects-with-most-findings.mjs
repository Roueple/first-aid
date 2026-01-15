#!/usr/bin/env node
/**
 * Query: Get projects with most findings (sorted by finding count)
 * Usage: node scripts/queries/14-projects-with-most-findings.mjs
 */

// ============================================================
// 🔧 CONFIGURATION - Change these values as needed
// ============================================================
const TOP_N = 10;                     // Show top N projects
const MIN_FINDINGS = 0;               // Minimum findings to include
// ============================================================

import { initDb, printConfig } from './_db-helper.mjs';

const db = initDb();

async function query() {
  printConfig({ TOP_N, MIN_FINDINGS });

  const snapshot = await db.collection('projects').get();
  
  const projects = snapshot.docs
    .map(doc => doc.data())
    .filter(p => (p.finding || 0) >= MIN_FINDINGS)
    .sort((a, b) => (b.finding || 0) - (a.finding || 0))
    .slice(0, TOP_N);

  console.log('\n📊 Projects with Most Findings:\n');
  console.log('-'.repeat(75));
  console.log('#'.padStart(3) + '  ' + 'Project Name'.padEnd(50) + 'Findings'.padStart(10) + 'Total'.padStart(10));
  console.log('-'.repeat(75));

  projects.forEach((p, i) => {
    console.log(
      (i + 1).toString().padStart(3) + '  ' +
      (p.projectName || 'Unknown').substring(0, 49).padEnd(50) +
      (p.finding || 0).toString().padStart(10) +
      (p.total || 0).toString().padStart(10)
    );
  });

  console.log('-'.repeat(75));
  console.log();
}

query().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
