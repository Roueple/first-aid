#!/usr/bin/env node

/**
 * Export any Firestore collection to JSON
 * Usage: node scripts/export-table-to-json.mjs <collection-name>
 * Example: node scripts/export-table-to-json.mjs projects
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get collection name from command line
const collectionName = process.argv[2];

if (!collectionName) {
  console.error('❌ Please provide a collection name');
  console.log('Usage: node scripts/export-table-to-json.mjs <collection-name>');
  console.log('Example: node scripts/export-table-to-json.mjs projects');
  process.exit(1);
}

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceaccountKey.json'), 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function exportCollection() {
  try {
    console.log(`📥 Exporting collection: ${collectionName}\n`);

    const snapshot = await db.collection(collectionName).get();
    
    if (snapshot.empty) {
      console.log('⚠️  Collection is empty');
      return;
    }

    console.log(`📊 Found ${snapshot.size} documents\n`);

    // Convert to array of objects
    const data = [];
    snapshot.forEach(doc => {
      data.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Write to file
    const outputFile = join(__dirname, '..', `${collectionName}-export.json`);
    writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');

    console.log(`✅ Exported ${data.length} documents to: ${collectionName}-export.json`);
    console.log(`📁 File size: ${(Buffer.byteLength(JSON.stringify(data)) / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

exportCollection()
  .then(() => {
    console.log('\n✨ Export complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
