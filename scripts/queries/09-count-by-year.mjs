#!/usr/bin/env node
/**
 * Query: Count audit results grouped by year
 * Usage: node scripts/queries/09-count-by-year.mjs
 */

// ============================================================
// 🔧 CONFIGURATION - No configuration needed
// ============================================================

import { initDb, printConfig } from './_db-helper.mjs';

const db = initDb();

async function query() {
  printConfig({ QUERY: 'Count by Year' });

  const snapshot = await db.collection('audit-results').get();
  
  const countByYear = {};
  snapshot.docs.forEach(doc => {
    const year = doc.data().year || 'Unknown';
    countByYear[year] = (countByYear[year] || 0) + 1;
  });

  console.log('\n📊 Audit Results Count by Year:\n');
  console.log('-'.repeat(40));
  console.log('Year'.padEnd(15) + 'Count'.padStart(10));
  console.log('-'.repeat(40));

  Object.entries(countByYear)
    .sort((a, b) => b[0] - a[0])
    .forEach(([year, count]) => {
      console.log(year.toString().padEnd(15) + count.toString().padStart(10));
    });

  console.log('-'.repeat(40));
  console.log('TOTAL'.padEnd(15) + snapshot.size.toString().padStart(10));
  console.log();
}

query().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
