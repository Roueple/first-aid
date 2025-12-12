#!/usr/bin/env node
/**
 * Query: Get summary statistics for all data (with department categories)
 * Usage: node scripts/queries/18-summary-stats.mjs
 */

import { initDb, printConfig, loadDepartments } from './_db-helper.mjs';

const db = initDb();

async function query() {
  printConfig({ QUERY: 'Summary Statistics' });

  // Load departments for category lookup
  const departments = await loadDepartments();
  const deptToCategory = {};
  departments.forEach(d => {
    if (d.originalNames) {
      d.originalNames.forEach(name => { deptToCategory[name] = d.category || 'Unknown'; });
    }
  });

  const [auditSnap, projectSnap] = await Promise.all([
    db.collection('audit-results').get(),
    db.collection('projects').get()
  ]);

  const stats = { years: {}, categories: {}, codes: { F: 0, NF: 0 } };
  auditSnap.docs.forEach(doc => {
    const d = doc.data();
    stats.years[d.year] = (stats.years[d.year] || 0) + 1;
    const cat = deptToCategory[d.department] || 'Unknown';
    stats.categories[cat] = (stats.categories[cat] || 0) + 1;
    if (d.code === 'F') stats.codes.F++;
    else if (d.code === 'NF') stats.codes.NF++;
  });

  console.log('\n📊 SUMMARY STATISTICS\n');
  console.log('='.repeat(50));
  console.log(`Total Audit Results: ${auditSnap.size}`);
  console.log(`Total Projects: ${projectSnap.size}`);
  console.log(`Total Departments: ${departments.length}`);
  console.log(`Findings (F): ${stats.codes.F}`);
  console.log(`Non-Findings (NF): ${stats.codes.NF}`);
  console.log('='.repeat(50));
  console.log('\nBy Year:');
  Object.entries(stats.years).sort((a,b) => b[0]-a[0]).forEach(([y,c]) => console.log(`  ${y}: ${c}`));
  console.log('\nBy Category:');
  Object.entries(stats.categories).sort((a,b) => b[1]-a[1]).forEach(([c,n]) => console.log(`  ${c}: ${n}`));
  console.log();
}

query().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
