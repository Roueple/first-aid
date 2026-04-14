#!/usr/bin/env node

/**
 * Migration Script: Remove deprecated batchId field
 * 
 * This script:
 * 1. Removes batchId field from all existing mappings in Firestore
 * 2. Verifies all mappings have sessionId
 * 3. Creates backup before migration
 * 
 * Usage: node scripts/migrate-remove-batchid.mjs
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

/**
 * Create backup of mappings collection
 */
async function createBackup() {
  console.log('📦 Creating backup of mappings collection...');
  
  const mappingsSnapshot = await db.collection('mappings').get();
  const backupData = [];
  
  mappingsSnapshot.forEach(doc => {
    backupData.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  // Store backup in a separate collection
  const backupRef = db.collection('mappings_backup').doc(`backup_${Date.now()}`);
  await backupRef.set({
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    count: backupData.length,
    data: backupData
  });
  
  console.log(`✅ Backup created with ${backupData.length} mappings`);
  return backupData.length;
}

/**
 * Migrate mappings: remove batchId field
 */
async function migrateMappings() {
  console.log('\n🔄 Starting migration: removing batchId field...');
  
  const mappingsSnapshot = await db.collection('mappings').get();
  
  if (mappingsSnapshot.empty) {
    console.log('ℹ️  No mappings found to migrate');
    return { updated: 0, errors: 0 };
  }
  
  console.log(`📊 Found ${mappingsSnapshot.size} mappings to process`);
  
  let updated = 0;
  let errors = 0;
  let skipped = 0;
  const batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500;
  
  for (const doc of mappingsSnapshot.docs) {
    const data = doc.data();
    
    // Verify sessionId exists
    if (!data.sessionId) {
      console.warn(`⚠️  Warning: Mapping ${doc.id} has no sessionId, skipping`);
      errors++;
      continue;
    }
    
    // Check if batchId exists
    if (!data.batchId) {
      skipped++;
      continue;
    }
    
    // Remove batchId field
    batch.update(doc.ref, {
      batchId: admin.firestore.FieldValue.delete()
    });
    
    updated++;
    batchCount++;
    
    // Commit batch when it reaches the size limit
    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`  ✓ Committed batch of ${batchCount} updates`);
      batchCount = 0;
    }
  }
  
  // Commit remaining updates
  if (batchCount > 0) {
    await batch.commit();
    console.log(`  ✓ Committed final batch of ${batchCount} updates`);
  }
  
  console.log(`\n✅ Migration complete:`);
  console.log(`   - Updated: ${updated} mappings`);
  console.log(`   - Skipped (no batchId): ${skipped} mappings`);
  console.log(`   - Errors: ${errors} mappings`);
  
  return { updated, errors, skipped };
}

/**
 * Verify migration results
 */
async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  const mappingsSnapshot = await db.collection('mappings').get();
  
  let withBatchId = 0;
  let withoutSessionId = 0;
  
  mappingsSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.batchId) {
      withBatchId++;
    }
    if (!data.sessionId) {
      withoutSessionId++;
    }
  });
  
  if (withBatchId === 0 && withoutSessionId === 0) {
    console.log('✅ Verification passed: All mappings migrated successfully');
    return true;
  } else {
    console.error(`❌ Verification failed:`);
    if (withBatchId > 0) {
      console.error(`   - ${withBatchId} mappings still have batchId field`);
    }
    if (withoutSessionId > 0) {
      console.error(`   - ${withoutSessionId} mappings missing sessionId field`);
    }
    return false;
  }
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 Starting batchId removal migration\n');
  console.log('This will:');
  console.log('1. Create a backup of all mappings');
  console.log('2. Remove batchId field from all mappings');
  console.log('3. Verify the migration\n');
  
  try {
    // Step 1: Create backup
    await createBackup();
    
    // Step 2: Migrate mappings
    const results = await migrateMappings();
    
    // Step 3: Verify migration
    const verified = await verifyMigration();
    
    if (verified) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Update code to remove batchId references');
      console.log('2. Deploy updated Cloud Functions');
      console.log('3. Test pseudonymization/depseudonymization');
    } else {
      console.error('\n❌ Migration completed with errors. Please review the logs.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await admin.app().delete();
  }
}

// Run migration
main();
