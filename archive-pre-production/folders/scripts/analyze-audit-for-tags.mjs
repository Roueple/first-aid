#!/usr/bin/env node

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

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function analyzeAuditResults() {
  console.log('Fetching first 100 audit results for analysis...\n');

  const snapshot = await db.collection('audit-results').limit(100).get();
  
  const departments = new Set();
  const projectNames = new Set();
  const samples = [];
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    departments.add(data.department);
    projectNames.add(data.projectName);
    samples.push({
      id: doc.id,
      department: data.department,
      riskArea: data.riskArea,
      description: data.description,
      projectName: data.projectName
    });
  });
  
  console.log('=== UNIQUE DEPARTMENTS (' + departments.size + ') ===');
  [...departments].sort().forEach(d => console.log('  - ' + d));
  
  console.log('\n=== UNIQUE PROJECT NAMES (' + projectNames.size + ') ===');
  [...projectNames].sort().forEach(p => console.log('  - ' + p));
  
  console.log('\n=== SAMPLE DATA (first 15) ===');
  samples.slice(0, 15).forEach((s, i) => {
    console.log(`\n--- Sample ${i + 1} ---`);
    console.log('Project:', s.projectName);
    console.log('Department:', s.department);
    console.log('Risk Area:', s.riskArea?.substring(0, 100) + '...');
    console.log('Description:', s.description?.substring(0, 100) || '(empty)');
  });
}

analyzeAuditResults().then(() => process.exit(0)).catch(console.error);
