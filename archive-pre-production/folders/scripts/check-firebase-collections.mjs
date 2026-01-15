#!/usr/bin/env node
/**
 * Check what collections and data exist in Firebase
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync('./serviceaccountKey.json', 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function checkCollections() {
  console.log('🔍 Checking Firebase collections...\n');

  // List all collections
  const collections = await db.listCollections();
  console.log(`📚 Found ${collections.length} collections:\n`);
  
  for (const collection of collections) {
    console.log(`\n📁 Collection: ${collection.id}`);
    
    try {
      const snapshot = await collection.limit(5).get();
      console.log(`   Documents: ${snapshot.size} (showing first 5)`);
      
      if (!snapshot.empty) {
        snapshot.forEach((doc, index) => {
          const data = doc.data();
          console.log(`\n   ${index + 1}. Document ID: ${doc.id}`);
          
          // Show first few fields
          const fields = Object.keys(data).slice(0, 10);
          fields.forEach(field => {
            let value = data[field];
            if (value && typeof value === 'object' && value.toDate) {
              value = value.toDate().toISOString();
            } else if (typeof value === 'object') {
              value = JSON.stringify(value).substring(0, 100);
            } else if (typeof value === 'string' && value.length > 100) {
              value = value.substring(0, 100) + '...';
            }
            console.log(`      ${field}: ${value}`);
          });
        });
      }
    } catch (error) {
      console.log(`   ❌ Error reading collection: ${error.message}`);
    }
  }

  // Check for users with "jacksen" in email
  console.log('\n\n' + '='.repeat(80));
  console.log('\n🔍 Searching for users with "jacksen" in email...\n');
  
  try {
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} total users`);
    
    let found = false;
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.email && data.email.toLowerCase().includes('jacksen')) {
        found = true;
        console.log(`\n✅ Found: ${data.email}`);
        console.log(`   User ID: ${doc.id}`);
        console.log(`   Data:`, JSON.stringify(data, null, 2));
      }
    });
    
    if (!found) {
      console.log('\n❌ No users with "jacksen" in email found');
      console.log('\nShowing all users:');
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.email || 'No email'} (ID: ${doc.id})`);
      });
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log('\n✅ Check complete\n');
}

checkCollections()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
