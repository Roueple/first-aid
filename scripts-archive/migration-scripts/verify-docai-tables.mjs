#!/usr/bin/env node

/**
 * Verify DocAI Tables Exist in Firestore
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync('./serviceaccountKey.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://first-aid-101112.firebaseio.com'
});

const db = admin.firestore();

console.log('🔍 Verifying DocAI Tables in Firestore...\n');

async function verify() {
  const results = {
    doc_sessions: { exists: false, count: 0 },
    doc_chat_history: { exists: false, count: 0 },
    doc_query_logs: { exists: false, count: 0 },
  };

  // Check doc_sessions
  try {
    const sessions = await db.collection('doc_sessions').limit(1).get();
    results.doc_sessions.exists = true;
    const allSessions = await db.collection('doc_sessions').get();
    results.doc_sessions.count = allSessions.size;
  } catch (error) {
    results.doc_sessions.exists = false;
  }

  // Check doc_chat_history
  try {
    const chats = await db.collection('doc_chat_history').limit(1).get();
    results.doc_chat_history.exists = true;
    const allChats = await db.collection('doc_chat_history').get();
    results.doc_chat_history.count = allChats.size;
  } catch (error) {
    results.doc_chat_history.exists = false;
  }

  // Check doc_query_logs
  try {
    const logs = await db.collection('doc_query_logs').limit(1).get();
    results.doc_query_logs.exists = true;
    const allLogs = await db.collection('doc_query_logs').get();
    results.doc_query_logs.count = allLogs.size;
  } catch (error) {
    results.doc_query_logs.exists = false;
  }

  // Display results
  console.log('📊 Verification Results:');
  console.log('─'.repeat(60));
  
  for (const [collection, data] of Object.entries(results)) {
    const status = data.exists ? '✅ EXISTS' : '❌ NOT FOUND';
    const count = data.exists ? `(${data.count} document${data.count !== 1 ? 's' : ''})` : '';
    console.log(`  ${collection.padEnd(20)} ${status} ${count}`);
  }
  
  console.log('─'.repeat(60));

  const allExist = Object.values(results).every(r => r.exists);
  const totalDocs = Object.values(results).reduce((sum, r) => sum + r.count, 0);

  console.log();
  if (allExist) {
    console.log('✅ ALL TABLES EXIST IN FIRESTORE!');
    console.log(`   Total documents: ${totalDocs}`);
    console.log();
    console.log('🎉 DocAI is ready to use!');
    console.log('   Open your app and start chatting.');
  } else {
    console.log('⚠️  SOME TABLES ARE MISSING');
    console.log('   Run: node create-docai-tables.mjs');
  }

  console.log();
  console.log('🔗 View in Firebase Console:');
  console.log('   https://console.firebase.google.com/project/first-aid-101112/firestore/data');
  console.log();

  process.exit(0);
}

verify();
