#!/usr/bin/env node
/**
 * Query: List all projects with their counts
 * Usage: node scripts/queries/12-list-all-projects.mjs
 */

// ============================================================
// 🔧 CONFIGURATION - Change these values as needed
// ============================================================
const SORT_BY = 'total';              // 'total', 'finding', 'nonFinding', 'projectName'
const ORDER = 'desc';                 // 'asc' or 'desc'
// ============================================================

import { initDb, printConfig } from './_db-helper.mjs';

const db = initDb();

async function query() {
  printConfig({ SORT_BY, ORDER });

  const snapshot = await db.collection('projects').get();
  const projects = snapshot.docs.map(doc => doc.data());

  projects.sort((a, b) => {
    const aVal = a[SORT_BY] ?? 0;
    const bVal = b[SORT_BY] ?? 0;
    return ORDER === 'desc' ? bVal - aVal : aVal - bVal;
  });

  console.log('\n📊 All Projects:\n');
  console.log('-'.repeat(85));
  console.log('Project Name'.padEnd(50) + 'Finding'.padStart(10) + 'Non-Find'.padStart(10) + 'Total'.padStart(10));
  console.log('-'.repeat(85));

  let totalF = 0, totalNF = 0, totalT = 0;
  projects.forEach(p => {
    const f = p.finding || 0;
    const nf = p.nonFinding || 0;
    const t = p.total || 0;
    totalF += f; totalNF += nf; totalT += t;
    console.log(
      (p.projectName || 'Unknown').substring(0, 49).padEnd(50) +
      f.toString().padStart(10) +
      nf.toString().padStart(10) +
      t.toString().padStart(10)
    );
  });

  console.log('-'.repeat(85));
  console.log('TOTAL'.padEnd(50) + totalF.toString().padStart(10) + totalNF.toString().padStart(10) + totalT.toString().padStart(10));
  console.log(`\n${projects.length} projects\n`);
}

query().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
