#!/usr/bin/env node

/**
 * Email Whitelist Management Script
 * 
 * Manages the email whitelist for passwordless authentication
 * 
 * Usage:
 *   node scripts/manage-email-whitelist.mjs add <email> <added-by> <full-name> [display-name] [tier]
 *   node scripts/manage-email-whitelist.mjs remove <email>
 *   node scripts/manage-email-whitelist.mjs list
 *   node scripts/manage-email-whitelist.mjs check <email>
 * 
 * Fields:
 *   - email: User's email address (also serves as username)
 *   - full-name: Full legal name
 *   - display-name: Name shown in Felix chat (optional, defaults to first name from full-name)
 *   - tier: User tier - tier-0, tier-1, or tier-2 (optional, defaults to tier-2)
 * 
 * Tiers:
 *   - tier-0: Full access including downloads (highest privilege)
 *   - tier-1: Can download Excel files
 *   - tier-2: View only, no downloads (lowest privilege)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin - look for serviceaccountKey.json in project root
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceaccountKey.json'), 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function addEmail(email, addedBy, fullName, displayName, tier) {
  try {
    const normalizedEmail = email.toLowerCase();
    const whitelistRef = db.collection('emailWhitelist').doc(normalizedEmail);

    // Validate tier
    const validTiers = ['tier-0', 'tier-1', 'tier-2'];
    const finalTier = tier ? tier.toLowerCase() : 'tier-2';
    if (!validTiers.includes(finalTier)) {
      console.error(`❌ Invalid tier: ${tier}. Must be tier-0, tier-1, or tier-2`);
      process.exit(1);
    }

    // If no display name provided, use first name from full name
    const finalDisplayName = displayName || (fullName ? fullName.split(' ')[0] : undefined);

    const entry = {
      email: normalizedEmail,
      addedAt: Date.now(),
      addedBy,
      active: true,
    };

    if (fullName) {
      entry.fullName = fullName;
    }

    if (finalDisplayName) {
      entry.displayName = finalDisplayName;
    }

    entry.role = finalTier;

    await whitelistRef.set(entry);
    console.log(`✅ Added ${normalizedEmail} to whitelist`);
    if (fullName) {
      console.log(`   Full name: ${fullName}`);
    }
    if (finalDisplayName) {
      console.log(`   Display name: ${finalDisplayName}`);
    }
    console.log(`   Tier: ${finalTier}`);
    console.log(`   Added by: ${addedBy}`);
    console.log(`   Date: ${new Date().toISOString()}`);
  } catch (error) {
    console.error('❌ Error adding email:', error.message);
    process.exit(1);
  }
}

async function removeEmail(email) {
  try {
    const normalizedEmail = email.toLowerCase();
    const whitelistRef = db.collection('emailWhitelist').doc(normalizedEmail);

    // Soft delete - set active to false
    await whitelistRef.update({ active: false });
    console.log(`✅ Removed ${normalizedEmail} from whitelist`);
  } catch (error) {
    console.error('❌ Error removing email:', error.message);
    process.exit(1);
  }
}

async function listEmails() {
  try {
    const snapshot = await db.collection('emailWhitelist')
      .where('active', '==', true)
      .get();

    if (snapshot.empty) {
      console.log('📭 No emails in whitelist');
      return;
    }

    console.log(`\n📋 Whitelisted Emails (${snapshot.size} total):\n`);
    console.log('Email'.padEnd(35), 'Full Name'.padEnd(25), 'Display Name'.padEnd(15), 'Tier'.padEnd(10), 'Added By'.padEnd(15), 'Added At');
    console.log('-'.repeat(120));

    snapshot.forEach(doc => {
      const data = doc.data();
      const date = new Date(data.addedAt).toLocaleDateString();
      const fullName = data.fullName || '-';
      const displayName = data.displayName || '-';
      const tier = data.role || 'tier-2';
      console.log(
        data.email.padEnd(35),
        fullName.padEnd(25),
        displayName.padEnd(15),
        tier.padEnd(10),
        data.addedBy.padEnd(15),
        date
      );
    });
  } catch (error) {
    console.error('❌ Error listing emails:', error.message);
    process.exit(1);
  }
}

async function checkEmail(email) {
  try {
    const normalizedEmail = email.toLowerCase();
    const whitelistRef = db.collection('emailWhitelist').doc(normalizedEmail);
    const doc = await whitelistRef.get();

    if (!doc.exists) {
      console.log(`❌ ${normalizedEmail} is NOT in whitelist`);
      return;
    }

    const data = doc.data();
    if (data.active) {
      console.log(`✅ ${normalizedEmail} is in whitelist`);
      if (data.fullName) {
        console.log(`   Full name: ${data.fullName}`);
      }
      if (data.displayName) {
        console.log(`   Display name: ${data.displayName}`);
      }
      console.log(`   Tier: ${data.role || 'tier-2'}`);
      console.log(`   Added by: ${data.addedBy}`);
      console.log(`   Added at: ${new Date(data.addedAt).toISOString()}`);
    } else {
      console.log(`⚠️  ${normalizedEmail} was in whitelist but is now inactive`);
    }
  } catch (error) {
    console.error('❌ Error checking email:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const [,, command, ...args] = process.argv;

async function main() {
  switch (command) {
    case 'add':
      if (args.length < 3) {
        console.error('Usage: node scripts/manage-email-whitelist.mjs add <email> <added-by> <full-name> [display-name] [tier]');
        process.exit(1);
      }
      await addEmail(args[0], args[1], args[2], args[3], args[4]);
      break;

    case 'remove':
      if (args.length < 1) {
        console.error('Usage: node scripts/manage-email-whitelist.mjs remove <email>');
        process.exit(1);
      }
      await removeEmail(args[0]);
      break;

    case 'list':
      await listEmails();
      break;

    case 'check':
      if (args.length < 1) {
        console.error('Usage: node scripts/manage-email-whitelist.mjs check <email>');
        process.exit(1);
      }
      await checkEmail(args[0]);
      break;

    default:
      console.log('Email Whitelist Management');
      console.log('');
      console.log('Usage:');
      console.log('  node scripts/manage-email-whitelist.mjs add <email> <added-by> <full-name> [display-name] [tier]');
      console.log('  node scripts/manage-email-whitelist.mjs remove <email>');
      console.log('  node scripts/manage-email-whitelist.mjs list');
      console.log('  node scripts/manage-email-whitelist.mjs check <email>');
      console.log('');
      console.log('Fields:');
      console.log('  email        - User email address (also serves as username)');
      console.log('  full-name    - Full legal name');
      console.log('  display-name - Name shown in Felix chat (optional, defaults to first name)');
      console.log('  tier         - User tier: tier-0, tier-1, or tier-2 (optional, defaults to tier-2)');
      console.log('');
      console.log('Tiers:');
      console.log('  tier-0       - Full access including downloads (highest privilege)');
      console.log('  tier-1       - Can download Excel files');
      console.log('  tier-2       - View only, no downloads (lowest privilege)');
      console.log('');
      console.log('Examples:');
      console.log('  node scripts/manage-email-whitelist.mjs add user@example.com admin "John Doe Smith" "John" tier-0');
      console.log('  node scripts/manage-email-whitelist.mjs add user@example.com admin "Jane Doe" "" tier-1');
      console.log('  node scripts/manage-email-whitelist.mjs add user@example.com admin "Bob User"');
      console.log('  node scripts/manage-email-whitelist.mjs remove user@example.com');
      console.log('  node scripts/manage-email-whitelist.mjs list');
      console.log('  node scripts/manage-email-whitelist.mjs check user@example.com');
      process.exit(1);
  }

  process.exit(0);
}

main().catch(console.error);
