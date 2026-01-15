#!/usr/bin/env node

/**
 * Migrate Year Field from String to Number
 * 
 * This script converts the 'year' field in audit-results collection
 * from string format ("2024") to number format (2024).
 * 
 * Usage: node scripts/migrate-year-to-number.mjs
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
const serviceAccountPath = join(__dirname, '..', 'serviceaccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

/**
 * Migrate year field from string to number
 */
async function migrateYearField() {
  console.log('🔄 Starting year field migration...\n');

  const auditResultsRef = db.collection('audit-results');
  const snapshot = await auditResultsRef.get();

  console.log(`📊 Found ${snapshot.size} audit results to check\n`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  const batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500; // Firestore batch limit

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      const currentYear = data.year;

      // Check if year is already a number
      if (typeof currentYear === 'number') {
        console.log(`⏭️  Skipping ${doc.id} - year already a number: ${currentYear}`);
        skipped++;
        continue;
      }

      // Convert string to number
      const yearNumber = parseInt(currentYear, 10);

      if (isNaN(yearNumber)) {
        console.error(`❌ Error: Invalid year value "${currentYear}" in doc ${doc.id}`);
        errors++;
        continue;
      }

      // Add to batch
      batch.update(doc.ref, { year: yearNumber });
      batchCount++;
      migrated++;

      console.log(`✅ Migrating ${doc.id}: "${currentYear}" → ${yearNumber}`);

      // Commit batch if we reach the limit
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`\n💾 Committed batch of ${batchCount} updates\n`);
        batchCount = 0;
      }

    } catch (error) {
      console.error(`❌ Error processing doc ${doc.id}:`, error.message);
      errors++;
    }
  }

  // Commit remaining updates
  if (batchCount > 0) {
    await batch.commit();
    console.log(`\n💾 Committed final batch of ${batchCount} updates\n`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ⏭️  Skipped (already number): ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📋 Total: ${snapshot.size}`);
  console.log('='.repeat(60));
}

// Run migration
migrateYearField()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
