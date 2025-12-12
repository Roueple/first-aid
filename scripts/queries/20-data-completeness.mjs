#!/usr/bin/env node
/**
 * Query: Check data completeness between audit-results and projects
 * Usage: node scripts/queries/20-data-completeness.mjs
 */

import { initDb, printConfig } from './_db-helper.mjs';

const db = initDb();

async function query() {
  printConfig({ QUERY: 'Data Completeness Check' });

  const [auditSnap, projectSnap] = await Promise.all([
    db.collection('audit-results').get(),
    db.collection('projects').get()
  ]);

  let fAudit = 0, nfAudit = 0, fProj = 0, nfProj = 0;
  auditSnap.docs.forEach(doc => {
    const code = (doc.data().code || '').toUpperCase();
    if (code === 'NF') nfAudit++; else if (code === 'F') fAudit++;
  });
  projectSnap.docs.forEach(doc => {
    const d = doc.data();
    fProj += d.finding || 0;
    nfProj += d.nonFinding || 0;
  });

  console.log('\n📊 DATA COMPLETENESS CHECK\n');
  console.log('='.repeat(60));
  console.log(`Audit Results Total: ${auditSnap.size}`);
  console.log(`Projects Total: ${projectSnap.size}`);
  console.log('-'.repeat(60));
  console.log(`Findings:     ${fAudit} (audit) vs ${fProj} (projects) ${fAudit === fProj ? '✅' : '❌'}`);
  console.log(`Non-Findings: ${nfAudit} (audit) vs ${nfProj} (projects) ${nfAudit === nfProj ? '✅' : '❌'}`);
  console.log(`Total:        ${fAudit + nfAudit} vs ${fProj + nfProj} ${(fAudit + nfAudit) === (fProj + nfProj) ? '✅' : '❌'}`);
  console.log('='.repeat(60));
  console.log();
}

query().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
