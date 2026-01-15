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

async function sampleAuditResults() {
  console.log('Fetching sample audit results...\n');

  const snapshot = await db.collection('audit-results').limit(5).get();
  
  snapshot.docs.forEach((doc, index) => {
    console.log(`\n=== Sample ${index + 1} ===`);
    console.log('ID:', doc.id);
    console.log('Data:', JSON.stringify(doc.data(), null, 2));
  });
}

sampleAuditResults().then(() => process.exit(0)).catch(console.error);
