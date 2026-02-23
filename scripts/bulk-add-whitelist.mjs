#!/usr/bin/env node

/**
 * Bulk Email Whitelist Upload Script
 * 
 * Uploads multiple users to the email whitelist from CSV or JSON file
 * 
 * Usage:
 *   node scripts/bulk-add-whitelist.mjs <file-path> <added-by>
 * 
 * File formats:
 *   CSV: email,fullName,displayName,tier (with or without header)
 *        displayName is optional - will use first name from fullName if omitted
 *        tier must be: tier-0, tier-1, or tier-2
 *   JSON: [{"email": "...", "fullName": "...", "displayName": "...", "tier": "..."}]
 * 
 * Tiers:
 *   - tier-0: Full access including downloads (highest privilege)
 *   - tier-1: Can download Excel files
 *   - tier-2: View only, no downloads (lowest privilege)
 * 
 * Note: username field is deprecated - email serves as username
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
 * Delete all existing whitelist entries
 */
async function deleteAllWhitelistEntries() {
  try {
    console.log('\n🗑️  Deleting all existing whitelist entries...');
    
    const snapshot = await db.collection('emailWhitelist').get();
    
    if (snapshot.empty) {
      console.log('   No existing entries found');
      return 0;
    }

    console.log(`   Found ${snapshot.size} entries to delete`);

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

    console.log(`   Found ${users.length} auth users to delete`);

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

    console.log(`   Found ${snapshot.size} sessions to delete`);

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

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const users = [];
  
  // Check if first line is header
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('email') || firstLine.includes('fullname') || firstLine.includes('displayname') || firstLine.includes('tier');
  const startIndex = hasHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
    
    if (parts.length >= 2) {
      const user = {
        email: parts[0],
        fullName: parts[1],
      };
      
      // displayName is optional (column 3)
      if (parts.length >= 3 && parts[2]) {
        user.displayName = parts[2];
      }
      
      // tier is optional (column 4), defaults to 'tier-2'
      if (parts.length >= 4 && parts[3]) {
        user.role = parts[3].toLowerCase();
      } else {
        user.role = 'tier-2';
      }
      
      users.push(user);
    }
  }

  return users;
}

function parseJSON(content) {
  const data = JSON.parse(content);
  
  if (!Array.isArray(data)) {
    throw new Error('JSON file must contain an array of user objects');
  }

  return data.map(user => ({
    email: user.email || user.Email,
    fullName: user.fullName || user.FullName || user.name || user.Name,
    displayName: user.displayName || user.DisplayName,
    role: (user.tier || user.Tier || user.role || user.Role || 'tier-2').toLowerCase()
  }));
}

async function bulkAddUsers(users, addedBy) {
  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  console.log(`\n📤 Starting bulk upload of ${users.length} users...\n`);

  for (const user of users) {
    try {
      // Validate required fields
      if (!user.email || !user.email.includes('@')) {
        results.failed.push({ user, error: 'Invalid email format' });
        console.log(`❌ Skipped ${user.email || 'unknown'}: Invalid email`);
        continue;
      }

      if (!user.fullName) {
        results.failed.push({ user, error: 'Missing fullName' });
        console.log(`❌ Skipped ${user.email}: Missing fullName`);
        continue;
      }

      // Validate tier
      const validTiers = ['tier-0', 'tier-1', 'tier-2'];
      const tier = user.role || 'tier-2';
      if (!validTiers.includes(tier)) {
        results.failed.push({ user, error: `Invalid tier: ${tier}. Must be tier-0, tier-1, or tier-2` });
        console.log(`❌ Skipped ${user.email}: Invalid tier`);
        continue;
      }

      const normalizedEmail = user.email.toLowerCase();
      const whitelistRef = db.collection('emailWhitelist').doc(normalizedEmail);

      // Check if already exists
      const existing = await whitelistRef.get();
      if (existing.exists && existing.data().active) {
        results.skipped.push(user);
        console.log(`⏭️  Skipped ${normalizedEmail}: Already in whitelist`);
        continue;
      }

      // Use first name from fullName if displayName not provided
      const finalDisplayName = user.displayName || user.fullName.split(' ')[0];

      // Add to whitelist
      const entry = {
        email: normalizedEmail,
        fullName: user.fullName,
        displayName: finalDisplayName,
        role: tier,
        addedAt: Date.now(),
        addedBy,
        active: true,
      };

      await whitelistRef.set(entry);
      results.success.push(user);
      console.log(`✅ Added ${normalizedEmail} (${user.fullName} / ${finalDisplayName} / ${tier})`);

    } catch (error) {
      results.failed.push({ user, error: error.message });
      console.log(`❌ Failed ${user.email}: ${error.message}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Bulk Upload Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successfully added: ${results.success.length}`);
  console.log(`⏭️  Skipped (already exists): ${results.skipped.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log('='.repeat(60) + '\n');

  if (results.failed.length > 0) {
    console.log('Failed entries:');
    results.failed.forEach(({ user, error }) => {
      console.log(`  - ${user.email}: ${error}`);
    });
  }

  return results;
}

async function main() {
  const [,, filePath, addedBy] = process.argv;

  if (!filePath || !addedBy) {
    console.log('Bulk Email Whitelist Upload');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/bulk-add-whitelist.mjs <file-path> <added-by> [--drop-all]');
    console.log('');
    console.log('Options:');
    console.log('  --drop-all   Delete all existing whitelist entries and auth users before adding new ones');
    console.log('');
    console.log('File formats:');
    console.log('  CSV: email,fullName,displayName,tier');
    console.log('       john@example.com,John Doe Smith,John,tier-0');
    console.log('       jane@example.com,Jane Marie Doe,Jane,tier-1');
    console.log('       admin@example.com,Admin User,,tier-2');
    console.log('');
    console.log('  Note: displayName is optional - will use first name from fullName if omitted');
    console.log('  Note: tier is optional - defaults to tier-2. Valid: tier-0, tier-1, tier-2');
    console.log('');
    console.log('  JSON: [{"email": "john@example.com", "fullName": "John Doe", "displayName": "John", "tier": "tier-0"}]');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/bulk-add-whitelist.mjs users.csv admin');
    console.log('  node scripts/bulk-add-whitelist.mjs users.csv admin --drop-all');
    console.log('  node scripts/bulk-add-whitelist.mjs users.json admin');
    process.exit(1);
  }

  try {
    // Check if --drop-all flag is present
    const shouldDropAll = process.argv.includes('--drop-all');

    if (shouldDropAll) {
      console.log('⚠️  WARNING: --drop-all flag detected. This will DELETE ALL existing users!\n');
      
      // Delete all existing data
      await deleteAllWhitelistEntries();
      await deleteAllAuthUsers();
      await deleteAllDeviceSessions();
      
      console.log('\n✅ All existing users have been deleted\n');
    }

    // Read file
    const content = readFileSync(filePath, 'utf8');
    
    // Parse based on file extension
    let users;
    if (filePath.endsWith('.json')) {
      users = parseJSON(content);
    } else if (filePath.endsWith('.csv')) {
      users = parseCSV(content);
    } else {
      // Try to detect format
      try {
        users = parseJSON(content);
      } catch {
        users = parseCSV(content);
      }
    }

    if (users.length === 0) {
      console.error('❌ No valid users found in file');
      process.exit(1);
    }

    console.log(`📁 Loaded ${users.length} users from ${filePath}`);
    
    // Upload users
    await bulkAddUsers(users, addedBy);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(console.error);
