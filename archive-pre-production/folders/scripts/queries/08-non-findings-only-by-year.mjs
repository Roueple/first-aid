#!/usr/bin/env node
/**
 * Query: Get only Non-Findings (code='NF') for a specific year
 * Usage: node scripts/queries/08-non-findings-only-by-year.mjs
 */

// ============================================================
// 🔧 CONFIGURATION - Change these values as needed
// ============================================================
const YEAR = 2024;
const LIMIT = 100;
// ============================================================

import { initDb, formatResults, printConfig } from './_db-helper.mjs';

const db = initDb();

async function query() {
  printConfig({ YEAR, LIMIT, CODE: 'NF (Non-Findings only)' });

  let q = db.collection('audit-results')
    .where('year', '==', YEAR)
    .where('code', '==', 'NF');
  if (LIMIT > 0) q = q.limit(LIMIT);

  const snapshot = await q.get();
  const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  formatResults(results, ['projectName', 'code', 'finding', 'department', 'year']);
}

query().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
