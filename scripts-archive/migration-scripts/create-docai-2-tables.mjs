#!/usr/bin/env node

/**
 * Create DocAI 2-table structure from scratch
 * 
 * NEW STRUCTURE:
 * - doc_sessions: User sessions (one per user session)
 * - doc_chats: Chat messages with analytics (many per session)
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function createDocAITables() {
  console.log('🚀 Creating DocAI 2-table structure...\n');

  try {
    // Check if collections already exist
    const sessionsSnapshot = await db.collection('doc_sessions').limit(1).get();
    const chatsSnapshot = await db.collection('doc_chats').limit(1).get();

    if (!sessionsSnapshot.empty || !chatsSnapshot.empty) {
      console.log('⚠️  Collections already exist:');
      console.log(`  doc_sessions: ${sessionsSnapshot.size > 0 ? 'EXISTS' : 'EMPTY'}`);
      console.log(`  doc_chats: ${chatsSnapshot.size > 0 ? 'EXISTS' : 'EMPTY'}`);
      console.log('\nUse migrate-docai-to-2-tables.mjs if you need to migrate from old structure.');
      return;
    }

    // Create sample session
    console.log('📝 Creating sample session...');
    const sessionRef = db.collection('doc_sessions').doc();
    const now = admin.firestore.Timestamp.now();
    
    await sessionRef.set({
      userId: 'test-user',
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      anonymizationMap: {},
      isActive: true,
      messageCount: 2,
    });
    console.log(`✅ Created sample session: ${sessionRef.id}\n`);

    // Create sample chats
    console.log('📝 Creating sample chats...');
    
    // User message
    const userChatRef = db.collection('doc_chats').doc();
    await userChatRef.set({
      sessionId: sessionRef.id,
      userId: 'test-user',
      role: 'user',
      message: 'What projects are in Jakarta?',
      timestamp: now,
    });
    console.log(`✅ Created user chat: ${userChatRef.id}`);

    // Assistant response
    const assistantChatRef = db.collection('doc_chats').doc();
    await assistantChatRef.set({
      sessionId: sessionRef.id,
      userId: 'test-user',
      role: 'assistant',
      message: 'I found 5 projects in Jakarta...',
      timestamp: admin.firestore.Timestamp.fromMillis(now.toMillis() + 2000),
      thinkingMode: 'low',
      responseTime: 1500,
      modelVersion: 'gemini-2.0-flash-thinking-exp',
      queryType: 'search',
      resultsCount: 5,
      dataSourcesQueried: ['projects'],
      success: true,
      contextUsed: {
        projectsCount: 5,
      },
    });
    console.log(`✅ Created assistant chat: ${assistantChatRef.id}\n`);

    console.log('📊 Structure created:');
    console.log('  ✅ doc_sessions (1 session)');
    console.log('  ✅ doc_chats (2 chats)');
    console.log('\n✅ DocAI 2-table structure created successfully!');
    console.log('\n⚠️  NEXT STEPS:');
    console.log('  1. Deploy Firestore indexes: firebase deploy --only firestore:indexes');
    console.log('  2. Test with your application');
    console.log('  3. Delete sample data if needed');

  } catch (error) {
    console.error('❌ Creation failed:', error);
    throw error;
  }
}

// Run creation
createDocAITables()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
