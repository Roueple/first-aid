#!/usr/bin/env node
/**
 * Query Felix chat and session data from Firebase
 * Analyze Jacksen's interactions to understand why Felix failed
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync('./serviceaccountKey.json', 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function queryFelixData() {
  console.log('🔍 Querying Felix chat and session data from Firebase\n');
  console.log('=' .repeat(80));

  // Find Jacksen's user ID
  console.log('\n📋 Step 1: Finding Jacksen\'s user ID...\n');
  
  const usersSnapshot = await db.collection('users').get();
  let jacksenUserId = null;
  
  usersSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.email && data.email.toLowerCase().includes('jacksen')) {
      jacksenUserId = doc.id;
      console.log(`✅ Found Jacksen: ${data.email} (ID: ${jacksenUserId})`);
    }
  });

  if (!jacksenUserId) {
    console.log('❌ Jacksen user not found. Showing all Felix sessions...\n');
  }

  // Query Felix sessions
  console.log('\n' + '='.repeat(80));
  console.log('📋 Step 2: Querying Felix Sessions...\n');
  
  let sessionsQuery = db.collection('felix_sessions').orderBy('lastActivity', 'desc');
  
  if (jacksenUserId) {
    sessionsQuery = sessionsQuery.where('userId', '==', jacksenUserId);
  }
  
  const sessionsSnapshot = await sessionsQuery.limit(20).get();
  
  console.log(`Found ${sessionsSnapshot.size} Felix sessions\n`);
  
  const sessions = [];
  sessionsSnapshot.forEach(doc => {
    const data = doc.data();
    sessions.push({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      lastActivity: data.lastActivity?.toDate(),
    });
  });

  // Display sessions
  sessions.forEach((session, index) => {
    console.log(`\n📁 Session ${index + 1}: ${session.id}`);
    console.log(`   Title: ${session.title || '(No title)'}`);
    console.log(`   User ID: ${session.userId}`);
    console.log(`   Messages: ${session.messageCount || 0}`);
    console.log(`   Created: ${session.createdAt?.toLocaleString() || 'N/A'}`);
    console.log(`   Last Activity: ${session.lastActivity?.toLocaleString() || 'N/A'}`);
  });

  // Query chat messages for each session
  console.log('\n' + '='.repeat(80));
  console.log('📋 Step 3: Querying Chat Messages...\n');

  for (const session of sessions) {
    console.log('\n' + '-'.repeat(80));
    console.log(`\n💬 Session: ${session.title || session.id}`);
    console.log(`   Created: ${session.createdAt?.toLocaleString()}`);
    console.log(`   Messages: ${session.messageCount || 0}\n`);

    const chatsSnapshot = await db.collection('felix_chats')
      .where('sessionId', '==', session.id)
      .orderBy('timestamp', 'asc')
      .get();

    if (chatsSnapshot.empty) {
      console.log('   (No messages found)');
      continue;
    }

    chatsSnapshot.forEach((doc, index) => {
      const chat = doc.data();
      const timestamp = chat.timestamp?.toDate();
      const role = chat.role === 'user' ? '👤 USER' : '🤖 FELIX';
      
      console.log(`\n   ${index + 1}. ${role} [${timestamp?.toLocaleTimeString() || 'N/A'}]`);
      console.log(`      Message: ${chat.message.substring(0, 200)}${chat.message.length > 200 ? '...' : ''}`);
      
      if (chat.metadata) {
        if (chat.metadata.resultsCount !== undefined) {
          console.log(`      Results: ${chat.metadata.resultsCount}`);
        }
        if (chat.metadata.filters) {
          console.log(`      Filters: ${JSON.stringify(chat.metadata.filters)}`);
        }
        if (chat.metadata.compactContext) {
          console.log(`      Context: ${chat.metadata.compactContext}`);
        }
        if (chat.responseTime) {
          console.log(`      Response Time: ${chat.responseTime}ms`);
        }
      }
    });
  }

  // Analyze conversation patterns
  console.log('\n' + '='.repeat(80));
  console.log('📊 Step 4: Analysis of Conversation Patterns\n');

  for (const session of sessions) {
    const chatsSnapshot = await db.collection('felix_chats')
      .where('sessionId', '==', session.id)
      .orderBy('timestamp', 'asc')
      .get();

    if (chatsSnapshot.empty) continue;

    const messages = [];
    chatsSnapshot.forEach(doc => {
      messages.push(doc.data());
    });

    console.log(`\n📁 Session: ${session.title || session.id}`);
    console.log(`   Total messages: ${messages.length}`);
    
    // Check for follow-up queries
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    console.log(`   User messages: ${userMessages.length}`);
    console.log(`   Assistant responses: ${assistantMessages.length}`);

    // Analyze filter continuity
    if (assistantMessages.length > 1) {
      console.log('\n   🔍 Filter Continuity Analysis:');
      
      assistantMessages.forEach((msg, index) => {
        if (msg.metadata?.filters) {
          console.log(`\n      Response ${index + 1}:`);
          console.log(`      Filters: ${JSON.stringify(msg.metadata.filters, null, 2)}`);
          console.log(`      Results: ${msg.metadata.resultsCount || 0}`);
          
          if (index > 0 && userMessages[index]) {
            console.log(`      User query: "${userMessages[index].message}"`);
          }
        }
      });
    }

    // Look for specific patterns
    const followUpKeywords = ['khusus', 'hanya', 'only', 'just', 'filter', 'coba'];
    const hasFollowUp = userMessages.some((msg, index) => {
      if (index === 0) return false;
      return followUpKeywords.some(keyword => 
        msg.message.toLowerCase().includes(keyword)
      );
    });

    if (hasFollowUp) {
      console.log('\n   ⚠️ FOLLOW-UP DETECTED: This session contains follow-up queries');
      
      userMessages.forEach((msg, index) => {
        if (index > 0) {
          const hasKeyword = followUpKeywords.some(k => 
            msg.message.toLowerCase().includes(k)
          );
          if (hasKeyword) {
            console.log(`\n      Follow-up ${index}: "${msg.message}"`);
            
            // Check if previous filters were maintained
            if (assistantMessages[index]?.metadata?.filters && 
                assistantMessages[index - 1]?.metadata?.filters) {
              const prevFilters = assistantMessages[index - 1].metadata.filters;
              const currFilters = assistantMessages[index].metadata.filters;
              
              console.log(`      Previous filters: ${JSON.stringify(prevFilters)}`);
              console.log(`      Current filters: ${JSON.stringify(currFilters)}`);
              
              // Check if filters were maintained
              const prevFilterKeys = prevFilters.map(f => `${f.field}=${f.value}`);
              const currFilterKeys = currFilters.map(f => `${f.field}=${f.value}`);
              
              const maintained = prevFilterKeys.filter(k => currFilterKeys.includes(k));
              const lost = prevFilterKeys.filter(k => !currFilterKeys.includes(k));
              const added = currFilterKeys.filter(k => !prevFilterKeys.includes(k));
              
              if (lost.length > 0) {
                console.log(`      ❌ LOST FILTERS: ${lost.join(', ')}`);
              }
              if (maintained.length > 0) {
                console.log(`      ✅ MAINTAINED: ${maintained.join(', ')}`);
              }
              if (added.length > 0) {
                console.log(`      ➕ ADDED: ${added.join(', ')}`);
              }
            }
          }
        }
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Query complete\n');
}

queryFelixData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
