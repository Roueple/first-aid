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
  const snapshot = await db.collection('audit-results').get();
  
  let withTags = 0;
  let withoutTags = 0;
  const tagCounts = {};
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.tags && data.tags.length > 0) {
      withTags++;
      data.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    } else {
      withoutTags++;
    }
  });
  
  console.log('=== TAG COVERAGE SUMMARY ===\n');
  console.log(`Total records: ${snapshot.size}`);
  console.log(`With tags: ${withTags} (${(withTags/snapshot.size*100).toFixed(1)}%)`);
  console.log(`Without tags: ${withoutTags}`);
  
  console.log(`\n=== ALL TAGS (${Object.keys(tagCounts).length} unique) ===\n`);
  Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tag, count]) => console.log(`  ${tag}: ${count}`));
}

main().then(() => process.exit(0)).catch(console.error);
