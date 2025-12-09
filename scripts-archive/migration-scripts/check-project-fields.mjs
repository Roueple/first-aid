#!/usr/bin/env node

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

const snapshot = await db.collection('projects').limit(3).get();

console.log('Sample projects:');
snapshot.forEach(doc => {
  const data = doc.data();
  console.log('\n---');
  console.log('Project Name:', data.projectName);
  console.log('Has "initial" field:', 'initial' in data, data.initial);
  console.log('Has "initials" field:', 'initials' in data, data.initials);
  console.log('All fields:', Object.keys(data));
});

process.exit(0);
