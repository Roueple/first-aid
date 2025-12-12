#!/usr/bin/env node
/**
 * Query: List all departments from departments table (reference)
 * Usage: node scripts/queries/21-list-departments.mjs
 */

// ============================================================
// 🔧 CONFIGURATION - Change these values as needed
// ============================================================
const GROUP_BY = 'category';          // 'category' or 'name'
// ============================================================

import { initDb, printConfig, listAllDepartments } from './_db-helper.mjs';

initDb();

async function query() {
  printConfig({ GROUP_BY });

  const departments = await listAllDepartments();

  if (GROUP_BY === 'category') {
    const byCategory = {};
    departments.forEach(d => {
      const cat = d.category || 'Uncategorized';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(d);
    });

    console.log('\n📊 Departments by Category:\n');
    Object.entries(byCategory).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cat, depts]) => {
      console.log(`\n📁 ${cat} (${depts.length})`);
      console.log('-'.repeat(60));
      depts.forEach(d => {
        console.log(`  ${d.name}`);
        if (d.keywords?.length > 0) {
          console.log(`    Keywords: ${d.keywords.slice(0, 5).join(', ')}`);
        }
      });
    });
  } else {
    console.log('\n📊 All Departments (alphabetical):\n');
    console.log('-'.repeat(70));
    console.log('Name'.padEnd(40) + 'Category'.padEnd(25));
    console.log('-'.repeat(70));
    
    departments.sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(d => {
      console.log((d.name || 'Unknown').substring(0, 39).padEnd(40) + (d.category || 'N/A').padEnd(25));
    });
  }

  console.log(`\n\nTotal: ${departments.length} departments\n`);
}

query().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
