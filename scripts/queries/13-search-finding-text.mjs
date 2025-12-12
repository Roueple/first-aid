#!/usr/bin/env node
/**
 * Query: Search audit results by finding text (contains keyword)
 * Note: This loads all data and filters in memory (Firestore doesn't support LIKE)
 * Usage: node scripts/queries/13-search-finding-text.mjs
 */

// ============================================================
// 🔧 CONFIGURATION - Change these values as needed
// ============================================================
const SEARCH_TEXT = 'pajak';          // Text to search in finding field
const CASE_SENSITIVE = false;         // true = case sensitive, false = ignore case
const LIMIT = 50;                     // Max results (0 = all)
// ============================================================

import { initDb, formatResults, printConfig } from './_db-helper.mjs';

const db = initDb();

async function query() {
  printConfig({ SEARCH_TEXT, CASE_SENSITIVE, LIMIT });

  const snapshot = await db.collection('audit-results').get();
  
  const searchLower = CASE_SENSITIVE ? SEARCH_TEXT : SEARCH_TEXT.toLowerCase();
  
  let results = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(item => {
      const finding = item.finding || '';
      const text = CASE_SENSITIVE ? finding : finding.toLowerCase();
      return text.includes(searchLower);
    });

  if (LIMIT > 0) results = results.slice(0, LIMIT);

  formatResults(results, ['projectName', 'code', 'finding', 'department', 'year']);
}

query().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
