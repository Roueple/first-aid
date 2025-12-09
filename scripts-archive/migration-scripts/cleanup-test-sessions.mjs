#!/usr/bin/env node

/**
 * Cleanup Test Sessions
 * 
 * Removes all test/placeholder sessions from DocAI tables
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync('./serviceaccountKey.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://first-aid-101112.firebaseio.com'
});

const db = admin.firestore();

console.log('🧹 Cleaning up test sessions...\n');

async function cleanup() {
  let totalDeleted = 0;

  // Clean doc_sessions
  console.log('📋 Cleaning doc_sessions...');
  const sessions = await db.collection('doc_sessions').get();
  for (const doc of sessions.docs) {
    await doc.ref.delete();
    totalDeleted++;
  }
  console.log(`  ✅ Deleted ${sessions.size} session(s)`);

  // Clean doc_chat_history
  console.log('💬 Cleaning doc_chat_history...');
  const chats = await db.collection('doc_chat_history').get();
  for (const doc of chats.docs) {
    await doc.ref.delete();
    totalDeleted++;
  }
  console.log(`  ✅ Deleted ${chats.size} message(s)`);

  // Clean doc_query_logs
  console.log('📊 Cleaning doc_query_logs...');
  const logs = await db.collection('doc_query_logs').get();
  for (const doc of logs.docs) {
    await doc.ref.delete();
    totalDeleted++;
  }
  console.log(`  ✅ Deleted ${logs.size} log(s)`);

  console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} document(s)`);
  console.log('\n🎉 Collections are now empty and ready for your app to use.\n');

  process.exit(0);
}

cleanup();
