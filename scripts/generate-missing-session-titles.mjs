#!/usr/bin/env node

/**
 * Generate titles for existing sessions that don't have them
 * Uses the first user message in each session to generate a title
 */

import admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';

// Load environment variables
config();

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  await import('fs').then(fs => fs.promises.readFile('./serviceaccountKey.json', 'utf8'))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Initialize Gemini
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ VITE_GEMINI_API_KEY not found in environment');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

/**
 * Generate a session title from a message
 */
async function generateTitle(message) {
  try {
    const prompt = `Generate a concise, descriptive title (max 6 words) for a chat session that starts with this message: "${message}". 
    
Rules:
- Maximum 6 words
- No quotes or punctuation at the end
- Capture the main topic or intent
- Be specific but brief
- Use title case

Examples:
"Show me all high priority findings" → "High Priority Findings Review"
"Analyze project completion rates" → "Project Completion Analysis"
"What are the common issues?" → "Common Issues Overview"

Title:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let title = response.text().trim();
    
    // Clean up the title
    title = title.replace(/^["']|["']$/g, ''); // Remove quotes
    title = title.replace(/\.$/, ''); // Remove trailing period
    
    // Limit to 60 characters max
    if (title.length > 60) {
      title = title.substring(0, 57) + '...';
    }
    
    return title || 'New Chat';
  } catch (error) {
    console.error('Error generating title:', error.message);
    return 'New Chat';
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Finding sessions without titles...\n');
  
  // Get all sessions without titles
  const sessionsSnapshot = await db.collection('doc_sessions')
    .where('messageCount', '>', 0)
    .get();
  
  const sessionsWithoutTitles = [];
  sessionsSnapshot.forEach(doc => {
    const data = doc.data();
    if (!data.title) {
      sessionsWithoutTitles.push({ id: doc.id, ...data });
    }
  });
  
  console.log(`📊 Found ${sessionsWithoutTitles.length} sessions without titles\n`);
  
  if (sessionsWithoutTitles.length === 0) {
    console.log('✅ All sessions already have titles!');
    process.exit(0);
  }
  
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  
  for (const session of sessionsWithoutTitles) {
    processed++;
    console.log(`\n[${processed}/${sessionsWithoutTitles.length}] Processing session: ${session.id}`);
    console.log(`   User: ${session.userId}`);
    console.log(`   Messages: ${session.messageCount}`);
    
    try {
      // Get the first user message from this session
      const chatsSnapshot = await db.collection('doc_chats')
        .where('sessionId', '==', session.id)
        .where('role', '==', 'user')
        .orderBy('timestamp', 'asc')
        .limit(1)
        .get();
      
      if (chatsSnapshot.empty) {
        console.log('   ⚠️  No user messages found, skipping');
        failed++;
        continue;
      }
      
      const firstMessage = chatsSnapshot.docs[0].data().message;
      console.log(`   First message: "${firstMessage.substring(0, 50)}${firstMessage.length > 50 ? '...' : ''}"`);
      
      // Generate title
      console.log('   🤖 Generating title...');
      const title = await generateTitle(firstMessage);
      console.log(`   ✨ Generated: "${title}"`);
      
      // Update session
      await db.collection('doc_sessions').doc(session.id).update({
        title: title,
        updatedAt: admin.firestore.Timestamp.now()
      });
      
      console.log('   ✅ Title saved');
      succeeded++;
      
      // Rate limiting - wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   Total sessions: ${sessionsWithoutTitles.length}`);
  console.log(`   ✅ Succeeded: ${succeeded}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('='.repeat(60));
  
  process.exit(0);
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
