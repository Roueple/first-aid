#!/usr/bin/env node
/**
 * Fix NF records that have descriptions - change code to F
 */
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceaccountKey.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fixNFWithDescription() {
  console.log('Finding NF records with descriptions...\n');
  
  const snapshot = await db.collection('audit-results')
    .where('code', '==', 'NF')
    .get();
  
  const toFix = [];
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.description && data.description.trim()) {
      toFix.push({
        id: doc.id,
        auditResultId: data.auditResultId,
        description: data.description.substring(0, 50) + '...'
      });
    }
  });
  
  console.log(`Found ${toFix.length} NF records with descriptions:\n`);
  toFix.forEach((r, i) => {
    console.log(`${i + 1}. ${r.auditResultId}: ${r.description}`);
  });
  
  if (toFix.length === 0) {
    console.log('Nothing to fix!');
    return;
  }
  
  console.log(`\nUpdating ${toFix.length} records to code "F"...`);
  
  const batch = db.batch();
  toFix.forEach(r => {
    const ref = db.collection('audit-results').doc(r.id);
    batch.update(ref, { 
      code: 'F',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'fix-nf-script'
    });
  });
  
  await batch.commit();
  console.log(`\n✅ Updated ${toFix.length} records from NF to F`);
}

fixNFWithDescription().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
