#!/usr/bin/env node
/**
 * Query: Filter audit results by department CATEGORY
 * Finds all departments with matching category, gets their originalNames,
 * then queries audit-results where department matches any of those originalNames
 * Usage: node scripts/queries/03-filter-by-department.mjs
 */

// ============================================================
// 🔧 CONFIGURATION - Change these values as needed
// ============================================================
const CATEGORY = 'IT';                // Category name (e.g., 'IT', 'Finance', 'Marketing & Sales')
const LIMIT = 50;                     // Max results (0 = all)
// ============================================================

import { initDb, formatResults, printConfig, findDepartmentsByCategory } from './_db-helper.mjs';

const db = initDb();

async function query() {
  printConfig({ CATEGORY, LIMIT });

  // Find all departments with this category, get their originalNames
  const { matchingDepts, originalNames } = await findDepartmentsByCategory(CATEGORY);

  if (originalNames.length === 0) {
    console.log(`\n❌ No departments found with category "${CATEGORY}"\n`);
    console.log('Tip: Run 21-list-departments.mjs to see all available categories\n');
    return;
  }

  console.log(`📋 Found ${matchingDepts.length} department(s) in category "${CATEGORY}":`);
  matchingDepts.forEach(d => console.log(`   - ${d.name}`));
  console.log(`\n🔍 Searching ${originalNames.length} original name(s) in audit-results...\n`);

  // Query audit-results using original names (Firestore 'in' supports up to 30)
  const namesToQuery = originalNames.slice(0, 30);
  let q = db.collection('audit-results').where('department', 'in', namesToQuery);
  if (LIMIT > 0) q = q.limit(LIMIT);

  const snapshot = await q.get();
  const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  formatResults(results, ['projectName', 'code', 'finding', 'department', 'year']);
}

query().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
