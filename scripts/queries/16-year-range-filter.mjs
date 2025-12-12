#!/usr/bin/env node
/**
 * Query: Filter audit results by year range
 * Usage: node scripts/queries/16-year-range-filter.mjs
 */

// ============================================================
// 🔧 CONFIGURATION - Change these values as needed
// ============================================================
const START_YEAR = 2023;              // Start year (inclusive)
const END_YEAR = 2024;                // End year (inclusive)
const LIMIT = 100;
// ============================================================

import { initDb, formatResults, printConfig } from './_db-helper.mjs';

const db = initDb();

async function query() {
  printConfig({ START_YEAR, END_YEAR, LIMIT });

  let q = db.collection('audit-results')
    .where('year', '>=', START_YEAR)
    .where('year', '<=', END_YEAR);
  if (LIMIT > 0) q = q.limit(LIMIT);

  const snapshot = await q.get();
  const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  formatResults(results, ['projectName', 'code', 'finding', 'department', 'year']);
}

query().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
