#!/usr/bin/env node

/**
 * Remove duplicate "type" field from projects collection
 * 
 * The "type" field is a duplicate of "projectType" and should be removed.
 * This script removes the "type" field from all project documents.
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceAccountKey.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});

const db = admin.firestore();

/**
 * Remove "type" field from all projects
 */
async function removeTypeField() {
  console.log('🔄 Removing duplicate "type" field from projects...\n');

  const projectsRef = db.collection('projects');
  const snapshot = await projectsRef.get();

  console.log(`📋 Found ${snapshot.size} projects\n`);

  let updated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    if (data.type !== undefined) {
      // Remove the "type" field
      await projectsRef.doc(doc.id).update({
        type: admin.firestore.FieldValue.delete()
      });
      
      console.log(`✅ Removed "type" from: ${data.projectName} (was: "${data.type}")`);
      updated++;
    } else {
      console.log(`⏭️  Skipped: ${data.projectName} (no "type" field)`);
      skipped++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📋 Total: ${snapshot.size}`);
  console.log('='.repeat(60));
}

// Run migration
removeTypeField()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
