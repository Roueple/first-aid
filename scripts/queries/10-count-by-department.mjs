#!/usr/bin/env node
/**
 * Query: Count audit results grouped by department (with category from departments table)
 * Usage: node scripts/queries/10-count-by-department.mjs
 */

// ============================================================
// 🔧 CONFIGURATION - No configuration needed
// ============================================================

import { initDb, printConfig, loadDepartments } from './_db-helper.mjs';

const db = initDb();

async function query() {
  printConfig({ QUERY: 'Count by Department (with Categories)' });

  // Load departments for category lookup
  const departments = await loadDepartments();
  const deptToCategory = {};
  departments.forEach(d => {
    if (d.originalNames) {
      d.originalNames.forEach(name => {
        deptToCategory[name] = d.category || 'Uncategorized';
      });
    }
  });

  const snapshot = await db.collection('audit-results').get();
  
  const countByDept = {};
  snapshot.docs.forEach(doc => {
    const dept = doc.data().department || 'Unknown';
    countByDept[dept] = (countByDept[dept] || 0) + 1;
  });

  console.log('\n📊 Audit Results Count by Department:\n');
  console.log('-'.repeat(80));
  console.log('Department'.padEnd(45) + 'Category'.padEnd(25) + 'Count'.padStart(8));
  console.log('-'.repeat(80));

  Object.entries(countByDept)
    .sort((a, b) => b[1] - a[1])
    .forEach(([dept, count]) => {
      const category = deptToCategory[dept] || 'Unknown';
      console.log(
        dept.substring(0, 44).padEnd(45) +
        category.substring(0, 24).padEnd(25) +
        count.toString().padStart(8)
      );
    });

  console.log('-'.repeat(80));
  console.log('TOTAL'.padEnd(70) + snapshot.size.toString().padStart(8));
  console.log();
}

query().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
