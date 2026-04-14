#!/usr/bin/env node
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function fixDepartmentTypo() {
  console.log('🔍 Finding documents with typo "Departmen Teknologi Informasi"...\n');
  
  const snapshot = await db.collection('audit_results')
    .where('department', '==', 'Departmen Teknologi Informasi')
    .get();
  
  console.log(`Found ${snapshot.size} documents with the typo\n`);
  
  if (snapshot.size === 0) {
    console.log('✅ No documents to fix!');
    return;
  }
  
  const batch = db.batch();
  let count = 0;
  
  snapshot.forEach(doc => {
    batch.update(doc.ref, {
      department: 'Departemen Teknologi Informasi'
    });
    count++;
    
    if (count % 100 === 0) {
      console.log(`Prepared ${count} updates...`);
    }
  });
  
  console.log(`\n📝 Committing ${count} updates...`);
  await batch.commit();
  console.log('✅ All documents updated successfully!');
  
  // Verify
  const verifySnapshot = await db.collection('audit_results')
    .where('department', '==', 'Departmen Teknologi Informasi')
    .get();
  
  console.log(`\n🔍 Verification: ${verifySnapshot.size} documents still have the typo`);
  
  const correctSnapshot = await db.collection('audit_results')
    .where('department', '==', 'Departemen Teknologi Informasi')
    .get();
  
  console.log(`✅ ${correctSnapshot.size} documents now have correct spelling`);
}

fixDepartmentTypo().catch(console.error);
