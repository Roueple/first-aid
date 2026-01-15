#!/usr/bin/env node
/**
 * Query: Filter audit results by project name
 * Usage: node scripts/queries/02-filter-by-project.mjs
 */

// ============================================================
// 🔧 CONFIGURATION - Change these values as needed
// ============================================================
const PROJECT_NAME = 'Hotel Raffles Jakarta';  // Exact project name
const LIMIT = 100;                              // Max results (0 = all)
// ============================================================

import { initDb, formatResults, printConfig } from './_db-helper.mjs';

const db = initDb();

async function query() {
  printConfig({ PROJECT_NAME, LIMIT });

  let q = db.collection('audit-results').where('projectName', '==', PROJECT_NAME);
  if (LIMIT > 0) q = q.limit(LIMIT);

  const snapshot = await q.get();
  const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  formatResults(results, ['projectName', 'code', 'finding', 'department', 'year']);
}

query().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
