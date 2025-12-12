#!/usr/bin/env node
/**
 * Query: Filter audit results by code (F = Finding, NF = Non-Finding)
 * Usage: node scripts/queries/04-filter-by-code.mjs
 */

// ============================================================
// 🔧 CONFIGURATION - Change these values as needed
// ============================================================
const CODE = 'F';                     // 'F' for Finding, 'NF' for Non-Finding
const LIMIT = 50;                     // Max results (0 = all)
// ============================================================

import { initDb, formatResults, printConfig } from './_db-helper.mjs';

const db = initDb();

async function query() {
  printConfig({ CODE, LIMIT });

  let q = db.collection('audit-results').where('code', '==', CODE);
  if (LIMIT > 0) q = q.limit(LIMIT);

  const snapshot = await q.get();
  const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  formatResults(results, ['projectName', 'code', 'finding', 'department', 'year']);
}

query().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
