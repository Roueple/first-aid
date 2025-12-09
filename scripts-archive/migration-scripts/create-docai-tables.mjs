#!/usr/bin/env node

/**
 * Create DocAI Tables in Firestore
 * 
 * This script creates the three DocAI collections in Firestore
 * by adding initial placeholder documents that will be deleted later.
 * 
 * Firestore collections are created automatically when you add the first document.
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

console.log('🚀 Creating DocAI Tables in Firestore\n');
console.log('=' .repeat(60));

async function createTables() {
  try {
    // Create doc_sessions collection
    console.log('\n📋 Creating doc_sessions collection...');
    const sessionRef = await db.collection('doc_sessions').add({
      userId: '_placeholder_',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      lastActivityAt: admin.firestore.Timestamp.now(),
      anonymizationMap: {},
      isActive: false,
      messageCount: 0,
      _placeholder: true,
    });
    console.log('  ✅ Created doc_sessions collection with placeholder doc:', sessionRef.id);

    // Create doc_chat_history collection
    console.log('\n💬 Creating doc_chat_history collection...');
    const chatRef = await db.collection('doc_chat_history').add({
      sessionId: sessionRef.id,
      userId: '_placeholder_',
      role: 'user',
      message: 'Placeholder message',
      timestamp: admin.firestore.Timestamp.now(),
      _placeholder: true,
    });
    console.log('  ✅ Created doc_chat_history collection with placeholder doc:', chatRef.id);

    // Create doc_query_logs collection
    console.log('\n📊 Creating doc_query_logs collection...');
    const logRef = await db.collection('doc_query_logs').add({
      sessionId: sessionRef.id,
      userId: '_placeholder_',
      timestamp: admin.firestore.Timestamp.now(),
      success: true,
      _placeholder: true,
    });
    console.log('  ✅ Created doc_query_logs collection with placeholder doc:', logRef.id);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TABLES CREATED SUCCESSFULLY!');
    console.log('='.repeat(60));

    console.log('\n📝 Collections created:');
    console.log('  • doc_sessions');
    console.log('  • doc_chat_history');
    console.log('  • doc_query_logs');

    console.log('\n🔗 View in Firebase Console:');
    console.log('  https://console.firebase.google.com/project/first-aid-101112/firestore/data');

    console.log('\n⚠️  Note: Placeholder documents will be automatically cleaned up');
    console.log('   when you start using DocAI normally.');

    console.log('\n🎉 You can now use DocAI in your app!');
    console.log('   The collections are ready and waiting for real data.\n');

    // Store placeholder IDs for cleanup
    console.log('📌 Placeholder document IDs (for reference):');
    console.log(`  Session: ${sessionRef.id}`);
    console.log(`  Chat: ${chatRef.id}`);
    console.log(`  Log: ${logRef.id}`);
    console.log();

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }

  process.exit(0);
}

// Run
createTables();
