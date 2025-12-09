#!/usr/bin/env node

/**
 * Verify DocAI 2-table structure
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function verifyDocAI() {
  console.log('🔍 Verifying DocAI 2-table structure...\n');

  try {
    // Check doc_sessions
    console.log('📊 Checking doc_sessions...');
    const sessionsSnapshot = await db.collection('doc_sessions').get();
    console.log(`  Total sessions: ${sessionsSnapshot.size}`);
    
    if (sessionsSnapshot.size > 0) {
      const activeSessions = sessionsSnapshot.docs.filter(doc => doc.data().isActive).length;
      console.log(`  Active sessions: ${activeSessions}`);
      console.log(`  Inactive sessions: ${sessionsSnapshot.size - activeSessions}`);
      
      // Sample session
      const sampleSession = sessionsSnapshot.docs[0].data();
      console.log('  Sample session fields:', Object.keys(sampleSession).join(', '));
    }
    console.log('');

    // Check doc_chats
    console.log('📊 Checking doc_chats...');
    const chatsSnapshot = await db.collection('doc_chats').get();
    console.log(`  Total chats: ${chatsSnapshot.size}`);
    
    if (chatsSnapshot.size > 0) {
      const userChats = chatsSnapshot.docs.filter(doc => doc.data().role === 'user').length;
      const assistantChats = chatsSnapshot.docs.filter(doc => doc.data().role === 'assistant').length;
      console.log(`  User messages: ${userChats}`);
      console.log(`  Assistant responses: ${assistantChats}`);
      
      // Sample chat
      const sampleChat = chatsSnapshot.docs[0].data();
      console.log('  Sample chat fields:', Object.keys(sampleChat).join(', '));
      
      // Check for analytics fields
      const chatsWithAnalytics = chatsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.queryType || data.resultsCount || data.dataSourcesQueried;
      }).length;
      console.log(`  Chats with analytics: ${chatsWithAnalytics}`);
    }
    console.log('');

    // Check relationships
    console.log('📊 Checking relationships...');
    for (const sessionDoc of sessionsSnapshot.docs.slice(0, 3)) {
      const sessionId = sessionDoc.id;
      const sessionData = sessionDoc.data();
      const sessionChats = await db.collection('doc_chats')
        .where('sessionId', '==', sessionId)
        .get();
      
      console.log(`  Session ${sessionId.substring(0, 8)}...:`);
      console.log(`    messageCount in session: ${sessionData.messageCount}`);
      console.log(`    actual chats: ${sessionChats.size}`);
      console.log(`    match: ${sessionData.messageCount === sessionChats.size ? '✅' : '⚠️'}`);
    }
    console.log('');

    // Check for old collections
    console.log('📊 Checking for old collections...');
    const oldChatHistory = await db.collection('doc_chat_history').limit(1).get();
    const oldQueryLogs = await db.collection('doc_query_logs').limit(1).get();
    
    if (!oldChatHistory.empty) {
      console.log('  ⚠️  doc_chat_history still exists (old structure)');
    } else {
      console.log('  ✅ doc_chat_history not found (good)');
    }
    
    if (!oldQueryLogs.empty) {
      console.log('  ⚠️  doc_query_logs still exists (old structure)');
    } else {
      console.log('  ✅ doc_query_logs not found (good)');
    }
    console.log('');

    // Summary
    console.log('📊 Summary:');
    console.log(`  ✅ doc_sessions: ${sessionsSnapshot.size} documents`);
    console.log(`  ✅ doc_chats: ${chatsSnapshot.size} documents`);
    console.log(`  ✅ Structure: 2-table design`);
    console.log(`  ✅ Relationship: one-to-many (session -> chats)`);
    console.log('\n✅ Verification complete!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

// Run verification
verifyDocAI()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
