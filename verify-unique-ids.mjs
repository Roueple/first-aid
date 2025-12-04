#!/usr/bin/env node

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

console.log('🔍 Verifying unique IDs with year...\n');

// Get sample audit results
const snapshot = await db.collection('audit-results')
  .orderBy('auditResultId')
  .limit(20)
  .get();

console.log(`Found ${snapshot.size} sample audit results:\n`);

snapshot.forEach(doc => {
  const data = doc.data();
  console.log(`✅ ${data.auditResultId} | ${data.projectName} | ${data.department.substring(0, 30)} | ${data.code || 'NF'} | Year: ${data.year}`);
});

// Check for duplicates
const allSnapshot = await db.collection('audit-results').get();
const ids = new Map();
let duplicates = 0;

allSnapshot.forEach(doc => {
  const id = doc.data().auditResultId;
  if (ids.has(id)) {
    duplicates++;
    console.log(`\n⚠️  DUPLICATE: ${id}`);
  } else {
    ids.set(id, true);
  }
});

console.log(`\n📊 Total audit results: ${allSnapshot.size}`);
console.log(`📊 Unique IDs: ${ids.size}`);
console.log(`${duplicates === 0 ? '✅' : '❌'} Duplicates: ${duplicates}`);

process.exit(0);
