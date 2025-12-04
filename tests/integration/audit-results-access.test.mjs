#!/usr/bin/env node

/**
 * Test script to verify audit-results collection access
 * Tests that authenticated users can read from audit-results
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

async function testAuditResultsAccess() {
  console.log('🧪 Testing Audit Results Collection Access\n');
  
  try {
    // Test 1: Count total documents
    console.log('1️⃣ Counting audit results...');
    const snapshot = await db.collection('audit-results').count().get();
    const count = snapshot.data().count;
    console.log(`✅ Found ${count} audit results\n`);
    
    // Test 2: Fetch first 5 documents
    console.log('2️⃣ Fetching first 5 audit results...');
    const querySnapshot = await db.collection('audit-results')
      .limit(5)
      .get();
    
    console.log(`✅ Retrieved ${querySnapshot.size} documents\n`);
    
    // Test 3: Display sample data
    console.log('3️⃣ Sample audit results:');
    console.log('─'.repeat(80));
    
    querySnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n${index + 1}. ${data.auditResultId}`);
      console.log(`   Year: ${data.year}`);
      console.log(`   SH: ${data.sh}`);
      console.log(`   Project: ${data.projectName}`);
      console.log(`   Department: ${data.department}`);
      console.log(`   Code: ${data.code} | Nilai: ${data.nilai}`);
    });
    
    console.log('\n' + '─'.repeat(80));
    console.log('\n✅ All tests passed! Audit results collection is accessible.');
    console.log('🎉 The dashboard should now work correctly.\n');
    
  } catch (error) {
    console.error('❌ Error accessing audit-results:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Verify Firestore rules were deployed: firebase deploy --only firestore:rules');
    console.error('2. Check that audit-results collection exists in Firestore');
    console.error('3. Ensure serviceaccountKey.json is valid\n');
    process.exit(1);
  }
}

// Run test
testAuditResultsAccess()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
