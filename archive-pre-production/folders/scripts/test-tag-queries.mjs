#!/usr/bin/env node
/**
 * Test tag-based queries as an auditor would use them
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceaccountKey.json'), 'utf8')
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function queryByTag(tag, limit = 3) {
  const snapshot = await db.collection('audit-results')
    .where('tags', 'array-contains', tag)
    .limit(limit)
    .get();
  return snapshot.docs.map(d => d.data());
}

async function runTests() {
  const tests = [
    { tag: 'KPR', desc: 'Temuan terkait kredit pemilikan rumah/mortgage' },
    { tag: 'PPJB', desc: 'Temuan terkait perjanjian pengikatan jual beli' },
    { tag: 'Serah Terima', desc: 'Temuan terkait handover unit ke konsumen' },
    { tag: 'APAR', desc: 'Temuan terkait alat pemadam kebakaran' },
    { tag: 'Tender', desc: 'Temuan terkait proses tender/pengadaan' },
    { tag: 'BPJS', desc: 'Temuan terkait jaminan sosial karyawan' },
    { tag: 'Jadwal Dokter', desc: 'Temuan terkait jadwal praktek dokter (hospital)' },
    { tag: 'F&B', desc: 'Temuan terkait food & beverage (hotel/mall)' },
    { tag: 'Escrow', desc: 'Temuan terkait rekening penampungan KPR' },
    { tag: 'Internal Control', desc: 'Temuan terkait pengendalian internal' },
  ];

  console.log('=== TAG QUERY VALIDATION ===\n');

  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TAG: "${test.tag}"`);
    console.log(`Expected: ${test.desc}`);
    console.log('='.repeat(60));

    const results = await queryByTag(test.tag);
    
    if (results.length === 0) {
      console.log('❌ NO RESULTS FOUND');
      continue;
    }

    console.log(`✅ Found ${results.length} sample(s):\n`);

    results.forEach((r, i) => {
      console.log(`--- Result ${i + 1} ---`);
      console.log(`Project: ${r.projectName}`);
      console.log(`Dept: ${r.department}`);
      console.log(`Risk: ${r.riskArea?.substring(0, 120)}...`);
      console.log(`Desc: ${r.description?.substring(0, 100) || '(empty)'}`);
      console.log(`Tags: ${r.tags?.join(', ')}`);
      console.log('');
    });
  }
}

runTests().then(() => process.exit(0)).catch(console.error);
