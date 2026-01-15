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

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function main() {
  const searchTerm = process.argv[2] || 'kolam renang';
  console.log(`Searching for: "${searchTerm}"\n`);
  
  const snapshot = await db.collection('audit-results').get();
  const matches = [];
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const text = `${data.riskArea || ''} ${data.description || ''}`.toLowerCase();
    if (text.includes(searchTerm.toLowerCase())) {
      matches.push({
        id: doc.id,
        projectName: data.projectName,
        department: data.department,
        riskArea: data.riskArea,
        description: data.description,
        tags: data.tags
      });
    }
  });
  
  console.log(`Found ${matches.length} matches\n`);
  
  matches.forEach((m, i) => {
    console.log(`${i+1}. [${m.department}] ${m.projectName}`);
    console.log(`   Risk: ${m.riskArea?.substring(0, 100)}`);
    console.log(`   Desc: ${m.description?.substring(0, 100) || '(empty)'}`);
    console.log(`   Tags: ${m.tags?.join(', ') || '(none)'}\n`);
  });
}

main().then(() => process.exit(0)).catch(console.error);
