#!/usr/bin/env node

/**
 * Migrate DocAI from 3 tables to 2 tables
 * 
 * OLD STRUCTURE (3 tables):
 * - doc_sessions
 * - doc_chat_history
 * - doc_query_logs
 * 
 * NEW STRUCTURE (2 tables):
 * - doc_sessions (unchanged)
 * - doc_chats (consolidates chat_history + query_logs)
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migrateDocAI() {
  console.log('🚀 Starting DocAI migration from 3 tables to 2 tables...\n');

  try {
    // Step 1: Get all sessions (unchanged)
    console.log('📊 Step 1: Checking sessions...');
    const sessionsSnapshot = await db.collection('doc_sessions').get();
    console.log(`✅ Found ${sessionsSnapshot.size} sessions\n`);

    // Step 2: Migrate chat history to new doc_chats collection
    console.log('📊 Step 2: Migrating chat history to doc_chats...');
    const chatHistorySnapshot = await db.collection('doc_chat_history').get();
    console.log(`Found ${chatHistorySnapshot.size} chat history entries`);

    let migratedChats = 0;
    const batch = db.batch();
    let batchCount = 0;

    for (const doc of chatHistorySnapshot.docs) {
      const oldData = doc.data();
      
      // Transform to new structure
      const newChatData = {
        sessionId: oldData.sessionId,
        userId: oldData.userId,
        role: oldData.role,
        message: oldData.role === 'user' ? oldData.message : (oldData.response || oldData.message),
        timestamp: oldData.timestamp,
        
        // AI metadata (if assistant message)
        ...(oldData.role === 'assistant' && {
          thinkingMode: oldData.thinkingMode,
          responseTime: oldData.metadata?.responseTime,
          modelVersion: oldData.metadata?.modelVersion,
          tokensUsed: oldData.metadata?.tokensUsed,
        }),
      };

      // Create new doc in doc_chats
      const newDocRef = db.collection('doc_chats').doc(doc.id);
      batch.set(newDocRef, newChatData);
      
      batchCount++;
      migratedChats++;

      // Commit batch every 500 operations
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`  Migrated ${migratedChats} chats...`);
        batchCount = 0;
      }
    }

    // Commit remaining
    if (batchCount > 0) {
      await batch.commit();
    }
    console.log(`✅ Migrated ${migratedChats} chat entries to doc_chats\n`);

    // Step 3: Merge query logs into doc_chats
    console.log('📊 Step 3: Merging query logs into doc_chats...');
    const queryLogsSnapshot = await db.collection('doc_query_logs').get();
    console.log(`Found ${queryLogsSnapshot.size} query log entries`);

    let mergedLogs = 0;
    const updateBatch = db.batch();
    let updateBatchCount = 0;

    for (const logDoc of queryLogsSnapshot.docs) {
      const logData = logDoc.data();
      
      // Find corresponding chat entry by chatHistoryId or by sessionId + timestamp
      let chatDocRef = null;
      
      if (logData.chatHistoryId) {
        chatDocRef = db.collection('doc_chats').doc(logData.chatHistoryId);
      } else {
        // Find by sessionId and closest timestamp
        const chatsQuery = await db.collection('doc_chats')
          .where('sessionId', '==', logData.sessionId)
          .where('role', '==', 'assistant')
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get();
        
        if (!chatsQuery.empty) {
          chatDocRef = chatsQuery.docs[0].ref;
        }
      }

      if (chatDocRef) {
        // Merge query log data into chat
        const queryAnalytics = {
          intent: logData.intent,
          filtersUsed: logData.filtersUsed,
          queryType: logData.queryType,
          resultsCount: logData.resultsCount,
          dataSourcesQueried: logData.dataSourcesQueried,
          success: logData.success,
          errorMessage: logData.errorMessage,
          contextUsed: logData.contextUsed,
        };

        // Remove undefined fields
        Object.keys(queryAnalytics).forEach(key => {
          if (queryAnalytics[key] === undefined) {
            delete queryAnalytics[key];
          }
        });

        updateBatch.update(chatDocRef, queryAnalytics);
        updateBatchCount++;
        mergedLogs++;

        // Commit batch every 500 operations
        if (updateBatchCount >= 500) {
          await updateBatch.commit();
          console.log(`  Merged ${mergedLogs} query logs...`);
          updateBatchCount = 0;
        }
      }
    }

    // Commit remaining
    if (updateBatchCount > 0) {
      await updateBatch.commit();
    }
    console.log(`✅ Merged ${mergedLogs} query logs into doc_chats\n`);

    // Step 4: Summary
    console.log('📊 Migration Summary:');
    console.log(`  Sessions: ${sessionsSnapshot.size} (unchanged)`);
    console.log(`  Chats migrated: ${migratedChats}`);
    console.log(`  Query logs merged: ${mergedLogs}`);
    console.log('\n✅ Migration completed successfully!');
    console.log('\n⚠️  NEXT STEPS:');
    console.log('  1. Verify data in doc_chats collection');
    console.log('  2. Deploy new Firestore indexes: firebase deploy --only firestore:indexes');
    console.log('  3. After verification, delete old collections:');
    console.log('     - doc_chat_history');
    console.log('     - doc_query_logs');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateDocAI()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
