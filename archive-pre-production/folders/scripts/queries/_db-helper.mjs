/**
 * Shared database helper for query scripts
 * DO NOT MODIFY - Used by all query scripts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

let db = null;
let departmentsCache = null;

export function initDb() {
  if (db) return db;
  
  const serviceAccount = JSON.parse(
    readFileSync('./serviceaccountKey.json', 'utf8')
  );

  initializeApp({
    credential: cert(serviceAccount),
  });

  db = getFirestore();
  return db;
}

/**
 * Load departments table and cache it
 */
export async function loadDepartments() {
  if (departmentsCache) return departmentsCache;
  
  const db = initDb();
  const snapshot = await db.collection('departments').get();
  departmentsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return departmentsCache;
}

/**
 * Find department by EXACT match on originalNames array only
 * Returns the original department name(s) used in audit-results
 */
export async function findDepartmentMatches(searchTerm) {
  const departments = await loadDepartments();
  const searchLower = searchTerm.toLowerCase().trim();
  
  const matchingDepts = departments.filter(dept => {
    // EXACT match on originalNames only (case-insensitive)
    return dept.originalNames?.some(n => n.toLowerCase() === searchLower);
  });

  // Return all original names from matching departments
  const originalNames = [];
  matchingDepts.forEach(dept => {
    if (dept.originalNames) {
      originalNames.push(...dept.originalNames);
    }
  });
  
  return { matchingDepts, originalNames };
}

/**
 * Find departments by category (exact match)
 */
export async function findDepartmentsByCategory(category) {
  const departments = await loadDepartments();
  const categoryLower = category.toLowerCase().trim();
  
  const matchingDepts = departments.filter(dept => 
    dept.category?.toLowerCase() === categoryLower
  );

  const originalNames = [];
  matchingDepts.forEach(dept => {
    if (dept.originalNames) {
      originalNames.push(...dept.originalNames);
    }
  });
  
  return { matchingDepts, originalNames };
}

/**
 * List all available departments for reference
 */
export async function listAllDepartments() {
  const departments = await loadDepartments();
  return departments.map(d => ({
    name: d.name,
    category: d.category,
    originalNames: d.originalNames,
    keywords: d.keywords
  }));
}

export function formatResults(results, fields = null) {
  if (results.length === 0) {
    console.log('\n📭 No results found\n');
    return;
  }

  console.log(`\n📊 Found ${results.length} results:\n`);
  console.log('-'.repeat(100));

  results.forEach((item, index) => {
    if (fields) {
      const display = fields.map(f => `${f}: ${item[f] ?? 'N/A'}`).join(' | ');
      console.log(`[${index + 1}] ${display}`);
    } else {
      console.log(`[${index + 1}]`, JSON.stringify(item, null, 2));
    }
  });

  console.log('-'.repeat(100));
  console.log(`Total: ${results.length} records\n`);
}

export function printConfig(config) {
  console.log('='.repeat(60));
  console.log('⚙️  QUERY CONFIGURATION');
  console.log('='.repeat(60));
  Object.entries(config).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log('='.repeat(60));
  console.log();
}
