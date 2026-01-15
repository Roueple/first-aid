#!/usr/bin/env node
/**
 * Query: Filter audit results by year AND department CATEGORY
 * Finds all departments with matching category, gets their originalNames,
 * then queries audit-results where department matches any of those originalNames
 * Usage: node scripts/queries/06-filter-by-year-and-department.mjs
 */

// ============================================================
// 🔧 CONFIGURATION - Change these values as needed
// ============================================================
const YEAR = 2024;
const CATEGORY = 'IT';                // Category name (e.g., 'IT', 'Finance', 'Marketing & Sales')
const LIMIT = 100;
// ============================================================

import { initDb, formatResults, printConfig, findDepartmentsByCategory } from './_db-helper.mjs';

const db = initDb();

async function query() {
  printConfig({ YEAR, CATEGORY, LIMIT });

  // Find all departments with this category, get their originalNames
  const { matchingDepts, originalNames } = await findDepartmentsByCategory(CATEGORY);

  if (originalNames.length === 0) {
    console.log(`\n❌ No departments found with category "${CATEGORY}"\n`);
    console.log('Tip: Run 21-list-departments.mjs to see all available categories\n');
    return;
  }

  console.log(`📋 Found ${matchingDepts.length} department(s) in category "${CATEGORY}":`);
  matchingDepts.forEach(d => console.log(`   - ${d.name}`));
  console.log();

  // Query with year filter, then filter by department in memory
  let q = db.collection('audit-results').where('year', '==', YEAR);
  const snapshot = await q.get();
  
  const originalNamesSet = new Set(originalNames);
  let results = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(item => originalNamesSet.has(item.department));

  if (LIMIT > 0) results = results.slice(0, LIMIT);

  formatResults(results, ['projectName', 'code', 'finding', 'department', 'year']);
}

query().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
