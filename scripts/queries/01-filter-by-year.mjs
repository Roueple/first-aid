#!/usr/bin/env node
/**
 * Query: Filter audit results by year
 * Usage: node scripts/queries/01-filter-by-year.mjs
 */

// ============================================================
// 🔧 CONFIGURATION - Change these values as needed
// ============================================================
const YEAR = 2024;                    // Year to filter (e.g., 2023, 2024)
const LIMIT = 50;                     // Max results to show (0 = all)
// ============================================================

import { initDb, formatResults, printConfig } from './_db-helper.mjs';

const db = initDb();

async function query() {
  printConfig({ YEAR, LIMIT });

  let q = db.collection('audit-results').where('year', '==', YEAR);
  if (LIMIT > 0) q = q.limit(LIMIT);

  const snapshot = await q.get();
  const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  formatResults(results, ['projectName', 'code', 'finding', 'department', 'year']);
}

query().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
