#!/usr/bin/env node

/**
 * Migration Script: Update Whitelist Structure
 * 
 * Migrates existing whitelist entries from old structure to new structure:
 * - Old: { email, displayName, addedAt, addedBy, active }
 * - New: { email, fullName, displayName, addedAt, addedBy, active }
 * 
 * For existing entries where only displayName exists:
 * - If displayName looks like a full name (has spaces), use it as fullName
 * - Otherwise, keep displayName as-is and prompt for fullName
 * 
 * Usage:
 *   node scripts/migrate-whitelist-to-fullname.mjs [--dry-run]
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const isDryRun = process.argv.includes('--dry-run');

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceaccountKey.json'), 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function migrateWhitelist() {
  try {
    console.log('🔄 Starting whitelist migration...');
    if (isDryRun) {
      console.log('📋 DRY RUN MODE - No changes will be made\n');
    }

    const snapshot = await db.collection('emailWhitelist').get();

    if (snapshot.empty) {
      console.log('📭 No entries found in whitelist');
      return;
    }

    console.log(`\n📊 Found ${snapshot.size} entries to process\n`);

    let updated = 0;
    let skipped = 0;
    let needsInput = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const email = data.email;

      // Skip if already has fullName
      if (data.fullName) {
        console.log(`✓ ${email} - Already has fullName, skipping`);
        skipped++;
        continue;
      }

      // If no displayName, needs manual input
      if (!data.displayName) {
        console.log(`⚠️  ${email} - No displayName, needs manual input`);
        needsInput.push({ email, data });
        continue;
      }

      // Check if displayName looks like a full name (has spaces)
      const displayName = data.displayName;
      const hasSpaces = displayName.includes(' ');

      if (hasSpaces) {
        // Use displayName as fullName, extract first name for displayName
        const firstName = displayName.split(' ')[0];
        
        console.log(`📝 ${email}:`);
        console.log(`   Old: displayName="${displayName}"`);
        console.log(`   New: fullName="${displayName}", displayName="${firstName}"`);

        if (!isDryRun) {
          await doc.ref.update({
            fullName: displayName,
            displayName: firstName
          });
        }
        updated++;
      } else {
        // displayName is just first name, needs full name
        console.log(`⚠️  ${email} - displayName="${displayName}" (first name only), needs full name`);
        needsInput.push({ email, data });
      }
    }

    // Handle entries that need manual input
    if (needsInput.length > 0 && !isDryRun) {
      console.log(`\n\n📝 ${needsInput.length} entries need manual input:\n`);

      for (const { email, data } of needsInput) {
        console.log(`\n📧 Email: ${email}`);
        if (data.displayName) {
          console.log(`   Current displayName: ${data.displayName}`);
        }

        const fullName = await question('   Enter full name (or press Enter to skip): ');
        
        if (fullName.trim()) {
          const displayName = data.displayName || fullName.split(' ')[0];
          
          console.log(`   Setting: fullName="${fullName}", displayName="${displayName}"`);
          
          const docRef = db.collection('emailWhitelist').doc(email);
          await docRef.update({
            fullName: fullName.trim(),
            displayName: displayName
          });
          updated++;
        } else {
          console.log('   Skipped');
          skipped++;
        }
      }
    }

    console.log('\n\n✅ Migration complete!');
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    if (needsInput.length > 0 && isDryRun) {
      console.log(`   Needs input: ${needsInput.length} (run without --dry-run to provide)`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

console.log('Whitelist Migration Tool');
console.log('========================\n');

migrateWhitelist()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
