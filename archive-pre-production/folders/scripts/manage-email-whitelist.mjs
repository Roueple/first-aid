#!/usr/bin/env node

/**
 * Email Whitelist Management Script
 * 
 * Manages the email whitelist for passwordless authentication
 * 
 * Usage:
 *   node scripts/manage-email-whitelist.mjs add <email> <added-by>
 *   node scripts/manage-email-whitelist.mjs remove <email>
 *   node scripts/manage-email-whitelist.mjs list
 *   node scripts/manage-email-whitelist.mjs check <email>
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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

async function addEmail(email, addedBy, displayName) {
  try {
    const normalizedEmail = email.toLowerCase();
    const whitelistRef = db.collection('emailWhitelist').doc(normalizedEmail);

    const entry = {
      email: normalizedEmail,
      addedAt: Date.now(),
      addedBy,
      active: true,
    };

    if (displayName) {
      entry.displayName = displayName;
    }

    await whitelistRef.set(entry);
    console.log(`✅ Added ${normalizedEmail} to whitelist`);
    if (displayName) {
      console.log(`   Display name: ${displayName}`);
    }
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
    console.log('Email'.padEnd(35), 'Display Name'.padEnd(20), 'Added By'.padEnd(15), 'Added At');
    console.log('-'.repeat(90));

    snapshot.forEach(doc => {
      const data = doc.data();
      const date = new Date(data.addedAt).toLocaleDateString();
      const displayName = data.displayName || '-';
      console.log(
        data.email.padEnd(35),
        displayName.padEnd(20),
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
      if (data.displayName) {
        console.log(`   Display name: ${data.displayName}`);
      }
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
      if (args.length < 2) {
        console.error('Usage: node manage-email-whitelist.mjs add <email> <added-by> [display-name]');
        process.exit(1);
      }
      await addEmail(args[0], args[1], args[2]);
      break;

    case 'remove':
      if (args.length < 1) {
        console.error('Usage: node manage-email-whitelist.mjs remove <email>');
        process.exit(1);
      }
      await removeEmail(args[0]);
      break;

    case 'list':
      await listEmails();
      break;

    case 'check':
      if (args.length < 1) {
        console.error('Usage: node manage-email-whitelist.mjs check <email>');
        process.exit(1);
      }
      await checkEmail(args[0]);
      break;

    default:
      console.log('Email Whitelist Management');
      console.log('');
      console.log('Usage:');
      console.log('  node scripts/manage-email-whitelist.mjs add <email> <added-by> [display-name]');
      console.log('  node scripts/manage-email-whitelist.mjs remove <email>');
      console.log('  node scripts/manage-email-whitelist.mjs list');
      console.log('  node scripts/manage-email-whitelist.mjs check <email>');
      console.log('');
      console.log('Examples:');
      console.log('  node scripts/manage-email-whitelist.mjs add user@example.com admin "John Doe"');
      console.log('  node scripts/manage-email-whitelist.mjs add user@example.com admin');
      console.log('  node scripts/manage-email-whitelist.mjs remove user@example.com');
      console.log('  node scripts/manage-email-whitelist.mjs list');
      console.log('  node scripts/manage-email-whitelist.mjs check user@example.com');
      process.exit(1);
  }

  process.exit(0);
}

main().catch(console.error);
