#!/usr/bin/env node

/**
 * Reset and Add Users Script
 * 
 * Deletes all existing whitelist entries and adds new users with the updated structure:
 * - email (serves as username)
 * - fullName (full legal name)
 * - displayName (name shown in Felix chat)
 * 
 * Usage:
 *   node scripts/reset-and-add-users.mjs [--dry-run]
 * 
 * IMPORTANT: This script will DELETE ALL existing whitelist entries!
 * Use --dry-run first to preview changes.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
const auth = getAuth();

/**
 * Define your new users here
 * Format: { email, fullName, displayName (optional), role }
 * If displayName is not provided, first name from fullName will be used
 * 
 * Tiers:
 * - 'tier-0': Full access including downloads (highest privilege)
 * - 'tier-1': Can download Excel files
 * - 'tier-2': View only, no downloads (lowest privilege)
 */
const NEW_USERS = [
  {
    email: 'user1@example.com',
    fullName: 'John Doe Smith',
    displayName: 'John',
    role: 'tier-0', // Full access
  },
  {
    email: 'user2@example.com',
    fullName: 'Jane Marie Doe',
    displayName: 'Jane',
    role: 'tier-1', // Can download Excel
  },
  {
    email: 'admin@example.com',
    fullName: 'Admin User',
    role: 'tier-2', // View only
  },
  // Add more users here...
];

const ADDED_BY = 'system-reset'; // Who is adding these users

/**
 * Delete all existing whitelist entries
 */
async function deleteAllWhitelistEntries() {
  try {
    console.log('🗑️  Deleting all existing whitelist entries...');
    
    const snapshot = await db.collection('emailWhitelist').get();
    
    if (snapshot.empty) {
      console.log('   No existing entries found');
      return 0;
    }

    if (isDryRun) {
      console.log(`   [DRY RUN] Would delete ${snapshot.size} entries`);
      snapshot.forEach(doc => {
        console.log(`   - ${doc.id}`);
      });
      return snapshot.size;
    }

    // Delete in batches of 500 (Firestore limit)
    const batchSize = 500;
    let deletedCount = 0;

    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = db.batch();
      const batchDocs = snapshot.docs.slice(i, i + batchSize);
      
      batchDocs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deletedCount += batchDocs.length;
      console.log(`   Deleted ${deletedCount}/${snapshot.size} entries...`);
    }

    console.log(`✅ Deleted ${deletedCount} whitelist entries`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Error deleting whitelist entries:', error.message);
    throw error;
  }
}

/**
 * Delete all Firebase Auth users
 */
async function deleteAllAuthUsers() {
  try {
    console.log('\n🗑️  Deleting all Firebase Auth users...');
    
    const listUsersResult = await auth.listUsers();
    const users = listUsersResult.users;

    if (users.length === 0) {
      console.log('   No existing auth users found');
      return 0;
    }

    if (isDryRun) {
      console.log(`   [DRY RUN] Would delete ${users.length} auth users`);
      users.forEach(user => {
        console.log(`   - ${user.email || user.uid}`);
      });
      return users.length;
    }

    // Delete users
    let deletedCount = 0;
    for (const user of users) {
      try {
        await auth.deleteUser(user.uid);
        deletedCount++;
        console.log(`   Deleted auth user: ${user.email || user.uid}`);
      } catch (error) {
        console.error(`   Failed to delete ${user.email || user.uid}:`, error.message);
      }
    }

    console.log(`✅ Deleted ${deletedCount}/${users.length} auth users`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Error deleting auth users:', error.message);
    throw error;
  }
}

/**
 * Delete all device sessions
 */
async function deleteAllDeviceSessions() {
  try {
    console.log('\n🗑️  Deleting all device sessions...');
    
    const snapshot = await db.collection('deviceSessions').get();
    
    if (snapshot.empty) {
      console.log('   No existing sessions found');
      return 0;
    }

    if (isDryRun) {
      console.log(`   [DRY RUN] Would delete ${snapshot.size} sessions`);
      return snapshot.size;
    }

    // Delete in batches
    const batchSize = 500;
    let deletedCount = 0;

    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = db.batch();
      const batchDocs = snapshot.docs.slice(i, i + batchSize);
      
      batchDocs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deletedCount += batchDocs.length;
    }

    console.log(`✅ Deleted ${deletedCount} device sessions`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Error deleting device sessions:', error.message);
    throw error;
  }
}

/**
 * Add new users to whitelist
 */
async function addNewUsers() {
  try {
    console.log('\n➕ Adding new users to whitelist...');
    
    if (NEW_USERS.length === 0) {
      console.log('   No users defined in NEW_USERS array');
      return 0;
    }

    let addedCount = 0;
    const errors = [];

    for (const user of NEW_USERS) {
      try {
        const { email, fullName, displayName, role } = user;
        
        // Validate required fields
        if (!email || !fullName) {
          errors.push({ email: email || 'unknown', error: 'Missing email or fullName' });
          continue;
        }

        if (!role || !['tier-0', 'tier-1', 'tier-2'].includes(role)) {
          errors.push({ email, error: 'Invalid tier. Must be tier-0, tier-1, or tier-2' });
          continue;
        }

        const normalizedEmail = email.toLowerCase();
        
        // Use first name from fullName if displayName not provided
        const finalDisplayName = displayName || fullName.split(' ')[0];

        const entry = {
          email: normalizedEmail,
          fullName,
          displayName: finalDisplayName,
          role,
          addedAt: Date.now(),
          addedBy: ADDED_BY,
          active: true,
        };

        if (isDryRun) {
          console.log(`   [DRY RUN] Would add: ${normalizedEmail}`);
          console.log(`      Full Name: ${fullName}`);
          console.log(`      Display Name: ${finalDisplayName}`);
          console.log(`      Role: ${role}`);
        } else {
          const whitelistRef = db.collection('emailWhitelist').doc(normalizedEmail);
          await whitelistRef.set(entry);
          console.log(`   ✓ Added: ${normalizedEmail} (${fullName} / ${finalDisplayName} / ${role})`);
        }

        addedCount++;
      } catch (error) {
        errors.push({ email: user.email, error: error.message });
      }
    }

    if (errors.length > 0) {
      console.log('\n⚠️  Errors occurred:');
      errors.forEach(({ email, error }) => {
        console.log(`   - ${email}: ${error}`);
      });
    }

    console.log(`\n✅ Added ${addedCount}/${NEW_USERS.length} users to whitelist`);
    return addedCount;
  } catch (error) {
    console.error('❌ Error adding new users:', error.message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Reset and Add Users Script');
  console.log('═══════════════════════════════════════════════════');
  
  if (isDryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  } else {
    console.log('\n⚠️  WARNING: This will DELETE ALL existing users!\n');
  }

  try {
    // Step 1: Delete all whitelist entries
    const deletedWhitelist = await deleteAllWhitelistEntries();

    // Step 2: Delete all Firebase Auth users
    const deletedAuth = await deleteAllAuthUsers();

    // Step 3: Delete all device sessions
    const deletedSessions = await deleteAllDeviceSessions();

    // Step 4: Add new users
    const addedUsers = await addNewUsers();

    // Summary
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  Summary');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Whitelist entries deleted: ${deletedWhitelist}`);
    console.log(`  Auth users deleted: ${deletedAuth}`);
    console.log(`  Device sessions deleted: ${deletedSessions}`);
    console.log(`  New users added: ${addedUsers}`);
    console.log('═══════════════════════════════════════════════════');

    if (isDryRun) {
      console.log('\n💡 Run without --dry-run to apply changes');
    } else {
      console.log('\n✅ Reset complete! Users can now sign in with passwordless auth.');
    }

  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
