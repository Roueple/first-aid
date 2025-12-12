#!/usr/bin/env node

/**
 * Fix "Citraland Pekanbaru" to "CitraLand Pekanbaru" in audit-results
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync('./serviceaccountKey.json', 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function fixCitralandPekanbaru() {
  console.log('🔧 Fixing Citraland Pekanbaru case...\n');

  // Get all audit results with "Citraland Pekanbaru"
  const auditResultsSnapshot = await db
    .collection('audit-results')
    .where('projectName', '==', 'Citraland Pekanbaru')
    .get();

  console.log(`📊 Found ${auditResultsSnapshot.size} records to fix\n`);

  if (auditResultsSnapshot.empty) {
    console.log('✅ No records to fix!');
    return;
  }

  // Update each record
  const batch = db.batch();
  let count = 0;

  auditResultsSnapshot.docs.forEach(doc => {
    batch.update(doc.ref, {
      projectName: 'CitraLand Pekanbaru',
      updatedAt: new Date()
    });
    count++;
  });

  console.log('💾 Updating records...');
  await batch.commit();

  console.log(`✅ Updated ${count} records from "Citraland Pekanbaru" to "CitraLand Pekanbaru"\n`);

  // Verify the fix
  const verifySnapshot = await db
    .collection('audit-results')
    .where('projectName', '==', 'Citraland Pekanbaru')
    .get();

  console.log(`✔️  Verification: ${verifySnapshot.size} records still have old name (should be 0)`);

  const newSnapshot = await db
    .collection('audit-results')
    .where('projectName', '==', 'CitraLand Pekanbaru')
    .get();

  console.log(`✔️  Verification: ${newSnapshot.size} records now have correct name`);
}

fixCitralandPekanbaru()
  .then(() => {
    console.log('\n✨ Fix complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
