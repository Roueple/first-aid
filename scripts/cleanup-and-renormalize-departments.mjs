#!/usr/bin/env node

/**
 * Script to clean up duplicate departments and re-normalize with better categorization
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceaccountKey.json'), 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function cleanupDepartments() {
  console.log('🗑️  Deleting all existing departments...');
  
  const snapshot = await db.collection('departments').get();
  console.log(`   Found ${snapshot.size} departments to delete`);
  
  const batch = db.batch();
  let count = 0;
  
  snapshot.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
    
    if (count % 500 === 0) {
      console.log(`   Deleted ${count}...`);
    }
  });
  
  await batch.commit();
  console.log(`✅ Deleted ${count} departments\n`);
}

async function main() {
  await cleanupDepartments();
  
  console.log('🔄 Re-running normalization...\n');
  console.log('Please run: node scripts/normalize-departments.mjs');
}

main()
  .then(() => {
    console.log('\n✅ Cleanup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
