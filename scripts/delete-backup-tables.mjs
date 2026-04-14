#!/usr/bin/env node

/**
 * Delete Backup Tables Script
 * 
 * This script deletes the following backup collections from Firestore:
 * - docChatSessions (old backup table)
 * - docSessions (old backup table)
 * 
 * Usage: node scripts/delete-backup-tables.mjs
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceaccountKey.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Collections to delete
const COLLECTIONS_TO_DELETE = [
  'docChatSessions',
  'docSessions'
];

/**
 * Prompt user for confirmation
 */
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Count documents in a collection
 */
async function countDocuments(collectionName) {
  try {
    const snapshot = await db.collection(collectionName).count().get();
    return snapshot.data().count;
  } catch (error) {
    console.error(`Error counting ${collectionName}:`, error.message);
    return 0;
  }
}

/**
 * Delete all documents in a collection
 */
async function deleteCollection(collectionName) {
  console.log(`\n🗑️  Deleting collection: ${collectionName}`);
  
  const collectionRef = db.collection(collectionName);
  const BATCH_SIZE = 500;
  let totalDeleted = 0;

  try {
    let snapshot = await collectionRef.limit(BATCH_SIZE).get();

    while (!snapshot.empty) {
      const batch = db.batch();
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      totalDeleted += snapshot.docs.length;
      
      console.log(`  ✓ Deleted ${snapshot.docs.length} documents (total: ${totalDeleted})`);

      // Get next batch
      snapshot = await collectionRef.limit(BATCH_SIZE).get();
    }

    console.log(`✅ Successfully deleted ${totalDeleted} documents from ${collectionName}`);
    return totalDeleted;
    
  } catch (error) {
    console.error(`❌ Error deleting ${collectionName}:`, error.message);
    throw error;
  }
}

/**
 * Main deletion function
 */
async function main() {
  console.log('🚀 Delete Backup Tables Script\n');
  console.log('This will permanently delete the following collections:');
  
  // Check and display document counts
  const counts = {};
  for (const collection of COLLECTIONS_TO_DELETE) {
    const count = await countDocuments(collection);
    counts[collection] = count;
    console.log(`  - ${collection}: ${count} documents`);
  }
  
  const totalDocs = Object.values(counts).reduce((sum, count) => sum + count, 0);
  
  if (totalDocs === 0) {
    console.log('\n✅ No documents found in backup tables. Nothing to delete.');
    await admin.app().delete();
    return;
  }
  
  console.log(`\nTotal documents to delete: ${totalDocs}`);
  console.log('\n⚠️  WARNING: This action cannot be undone!\n');
  
  // Ask for confirmation
  const confirmed = await askConfirmation('Are you sure you want to delete these collections? (yes/no): ');
  
  if (!confirmed) {
    console.log('\n❌ Deletion cancelled by user.');
    await admin.app().delete();
    return;
  }
  
  console.log('\n🔄 Starting deletion process...');
  
  try {
    let totalDeleted = 0;
    
    for (const collection of COLLECTIONS_TO_DELETE) {
      if (counts[collection] > 0) {
        const deleted = await deleteCollection(collection);
        totalDeleted += deleted;
      } else {
        console.log(`\nℹ️  Skipping ${collection} (empty)`);
      }
    }
    
    console.log(`\n🎉 Deletion completed successfully!`);
    console.log(`   Total documents deleted: ${totalDeleted}`);
    
  } catch (error) {
    console.error('\n❌ Deletion failed:', error);
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
}

// Run deletion
main();
