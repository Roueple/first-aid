#!/usr/bin/env node

/**
 * Check DocAI Status
 * 
 * Quick check to see if DocAI tables are ready to use
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

console.log('🔍 Checking DocAI Status...\n');

const TEST_USER_ID = 'XpDEMi1g1yegRWhgR5MdJTH4hyF3';

async function checkStatus() {
  const results = {
    doc_sessions: '⏳ Checking...',
    doc_chat_history: '⏳ Checking...',
    doc_query_logs: '⏳ Checking...',
  };

  // Test doc_sessions with composite index
  try {
    await db.collection('doc_sessions')
      .where('userId', '==', TEST_USER_ID)
      .where('isActive', '==', true)
      .orderBy('lastActivityAt', 'desc')
      .limit(1)
      .get();
    results.doc_sessions = '✅ Ready';
  } catch (error) {
    if (error.message.includes('currently building')) {
      results.doc_sessions = '⏳ Building...';
    } else {
      results.doc_sessions = `❌ Error: ${error.message.substring(0, 50)}...`;
    }
  }

  // Test doc_chat_history
  try {
    await db.collection('doc_chat_history')
      .where('userId', '==', TEST_USER_ID)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    results.doc_chat_history = '✅ Ready';
  } catch (error) {
    if (error.message.includes('currently building')) {
      results.doc_chat_history = '⏳ Building...';
    } else {
      results.doc_chat_history = `❌ Error: ${error.message.substring(0, 50)}...`;
    }
  }

  // Test doc_query_logs
  try {
    await db.collection('doc_query_logs')
      .where('userId', '==', TEST_USER_ID)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    results.doc_query_logs = '✅ Ready';
  } catch (error) {
    if (error.message.includes('currently building')) {
      results.doc_query_logs = '⏳ Building...';
    } else {
      results.doc_query_logs = `❌ Error: ${error.message.substring(0, 50)}...`;
    }
  }

  // Display results
  console.log('📊 Status Report:');
  console.log('─'.repeat(50));
  console.log(`  doc_sessions:      ${results.doc_sessions}`);
  console.log(`  doc_chat_history:  ${results.doc_chat_history}`);
  console.log(`  doc_query_logs:    ${results.doc_query_logs}`);
  console.log('─'.repeat(50));

  // Overall status
  const allReady = Object.values(results).every(r => r.includes('✅'));
  const anyBuilding = Object.values(results).some(r => r.includes('⏳'));
  const anyError = Object.values(results).some(r => r.includes('❌'));

  console.log();
  if (allReady) {
    console.log('🎉 ALL SYSTEMS READY! DocAI is fully operational.');
    console.log('   You can now use DocAI without any errors.');
  } else if (anyBuilding) {
    console.log('⏳ INDEXES STILL BUILDING...');
    console.log('   Please wait a few more minutes and try again.');
    console.log('   Run: node check-docai-status.mjs');
  } else if (anyError) {
    console.log('❌ ERRORS DETECTED');
    console.log('   Check the Firebase Console for more details.');
  }

  console.log();
  console.log('🔗 Firebase Console:');
  console.log('   https://console.firebase.google.com/project/first-aid-101112/firestore/indexes');
  console.log();

  process.exit(0);
}

checkStatus();
