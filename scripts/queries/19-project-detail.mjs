#!/usr/bin/env node
/**
 * Query: Get detailed info for a specific project (with department categories)
 * Usage: node scripts/queries/19-project-detail.mjs
 */

// ============================================================
// 🔧 CONFIGURATION - Change these values as needed
// ============================================================
const PROJECT_NAME = 'Hotel Raffles Jakarta';
// ============================================================

import { initDb, printConfig, loadDepartments } from './_db-helper.mjs';

const db = initDb();

async function query() {
  printConfig({ PROJECT_NAME });

  // Load departments for category lookup
  const departments = await loadDepartments();
  const deptToCategory = {};
  departments.forEach(d => {
    if (d.originalNames) {
      d.originalNames.forEach(name => { deptToCategory[name] = d.category || 'Unknown'; });
    }
  });

  const [projectSnap, auditSnap] = await Promise.all([
    db.collection('projects').where('projectName', '==', PROJECT_NAME).get(),
    db.collection('audit-results').where('projectName', '==', PROJECT_NAME).get()
  ]);

  if (projectSnap.empty) {
    console.log(`\n❌ Project "${PROJECT_NAME}" not found\n`);
    return;
  }

  const project = projectSnap.docs[0].data();
  const byYear = {}, byDept = {}, byCategory = {};
  auditSnap.docs.forEach(doc => {
    const d = doc.data();
    byYear[d.year] = (byYear[d.year] || 0) + 1;
    byDept[d.department || 'Unknown'] = (byDept[d.department || 'Unknown'] || 0) + 1;
    const cat = deptToCategory[d.department] || 'Unknown';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });

  console.log('\n📊 PROJECT DETAIL\n');
  console.log('='.repeat(60));
  console.log(`Name: ${project.projectName}`);
  console.log(`ID: ${project.projectId || 'N/A'} | Initials: ${project.initials || 'N/A'}`);
  console.log(`Findings: ${project.finding || 0} | Non-Findings: ${project.nonFinding || 0} | Total: ${project.total || 0}`);
  console.log('='.repeat(60));
  console.log('\nBy Year:');
  Object.entries(byYear).sort((a,b) => b[0]-a[0]).forEach(([y,c]) => console.log(`  ${y}: ${c}`));
  console.log('\nBy Category:');
  Object.entries(byCategory).sort((a,b) => b[1]-a[1]).forEach(([c,n]) => console.log(`  ${c}: ${n}`));
  console.log('\nBy Department (top 10):');
  Object.entries(byDept).sort((a,b) => b[1]-a[1]).slice(0,10).forEach(([d,c]) => console.log(`  ${d}: ${c}`));
  console.log();
}

query().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
