#!/usr/bin/env node
/**
 * Query: Count audit results grouped by project
 * Usage: node scripts/queries/11-count-by-project.mjs
 */

// ============================================================
// 🔧 CONFIGURATION - Change these values as needed
// ============================================================
const TOP_N = 20;                     // Show top N projects (0 = all)
// ============================================================

import { initDb, printConfig } from './_db-helper.mjs';

const db = initDb();

async function query() {
  printConfig({ TOP_N: TOP_N || 'All' });

  const snapshot = await db.collection('audit-results').get();
  
  const countByProject = {};
  snapshot.docs.forEach(doc => {
    const project = doc.data().projectName || 'Unknown';
    countByProject[project] = (countByProject[project] || 0) + 1;
  });

  const sorted = Object.entries(countByProject).sort((a, b) => b[1] - a[1]);
  const display = TOP_N > 0 ? sorted.slice(0, TOP_N) : sorted;

  console.log('\n📊 Audit Results Count by Project:\n');
  console.log('-'.repeat(70));
  console.log('Project Name'.padEnd(55) + 'Count'.padStart(10));
  console.log('-'.repeat(70));

  display.forEach(([project, count]) => {
    console.log(project.substring(0, 54).padEnd(55) + count.toString().padStart(10));
  });

  console.log('-'.repeat(70));
  console.log(`Showing ${display.length} of ${sorted.length} projects`);
  console.log('TOTAL RECORDS'.padEnd(55) + snapshot.size.toString().padStart(10));
  console.log();
}

query().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
