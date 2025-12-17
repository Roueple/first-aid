#!/usr/bin/env node

/**
 * Bulk Email Whitelist Import Script
 * 
 * Imports multiple emails from a text file or JSON file
 * 
 * Usage:
 *   node scripts/bulk-add-emails.mjs emails.txt admin
 *   node scripts/bulk-add-emails.mjs emails.json
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

async function addEmailToWhitelist(email, addedBy, displayName) {
  const normalizedEmail = email.toLowerCase().trim();
  
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    console.log(`⚠️  Skipping invalid email: ${email}`);
    return { success: false, email: normalizedEmail };
  }

  try {
    const whitelistRef = db.collection('emailWhitelist').doc(normalizedEmail);
    
    // Check if already exists
    const existing = await whitelistRef.get();
    if (existing.exists && existing.data().active) {
      console.log(`ℹ️  ${normalizedEmail} already in whitelist`);
      return { success: true, email: normalizedEmail, existed: true };
    }

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
    const displayInfo = displayName ? ` (${displayName})` : '';
    console.log(`✅ Added ${normalizedEmail}${displayInfo}`);
    return { success: true, email: normalizedEmail, existed: false };
  } catch (error) {
    console.error(`❌ Error adding ${normalizedEmail}:`, error.message);
    return { success: false, email: normalizedEmail, error: error.message };
  }
}

async function importFromTextFile(filePath, addedBy) {
  console.log(`\n📄 Reading emails from: ${filePath}\n`);
  
  const content = readFileSync(filePath, 'utf8');
  const emails = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#')); // Skip empty lines and comments

  console.log(`Found ${emails.length} email(s) to process\n`);

  const results = {
    added: 0,
    existed: 0,
    failed: 0,
    total: emails.length,
  };

  for (const email of emails) {
    const result = await addEmailToWhitelist(email, addedBy);
    if (result.success) {
      if (result.existed) {
        results.existed++;
      } else {
        results.added++;
      }
    } else {
      results.failed++;
    }
  }

  return results;
}

async function importFromJsonFile(filePath) {
  console.log(`\n📄 Reading emails from: ${filePath}\n`);
  
  const content = readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);

  if (!Array.isArray(data)) {
    throw new Error('JSON file must contain an array of email objects');
  }

  console.log(`Found ${data.length} email(s) to process\n`);

  const results = {
    added: 0,
    existed: 0,
    failed: 0,
    total: data.length,
  };

  for (const item of data) {
    if (typeof item === 'string') {
      // Simple string array
      const result = await addEmailToWhitelist(item, 'bulk-import');
      if (result.success) {
        if (result.existed) {
          results.existed++;
        } else {
          results.added++;
        }
      } else {
        results.failed++;
      }
    } else if (typeof item === 'object' && item.email) {
      // Object with email, addedBy, and optional displayName
      const result = await addEmailToWhitelist(
        item.email, 
        item.addedBy || 'bulk-import',
        item.displayName
      );
      if (result.success) {
        if (result.existed) {
          results.existed++;
        } else {
          results.added++;
        }
      } else {
        results.failed++;
      }
    } else {
      console.log(`⚠️  Skipping invalid entry:`, item);
      results.failed++;
    }
  }

  return results;
}

function printSummary(results) {
  console.log('\n' + '='.repeat(50));
  console.log('📊 Import Summary');
  console.log('='.repeat(50));
  console.log(`Total processed: ${results.total}`);
  console.log(`✅ Successfully added: ${results.added}`);
  console.log(`ℹ️  Already existed: ${results.existed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log('='.repeat(50) + '\n');
}

// Parse command line arguments
const [,, filePath, addedBy] = process.argv;

async function main() {
  if (!filePath) {
    console.log('Bulk Email Whitelist Import');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/bulk-add-emails.mjs <file> [added-by]');
    console.log('');
    console.log('File Formats:');
    console.log('  .txt  - One email per line (requires added-by parameter)');
    console.log('  .json - JSON array of emails or objects');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/bulk-add-emails.mjs emails.txt admin');
    console.log('  node scripts/bulk-add-emails.mjs emails.json');
    console.log('');
    console.log('See email-whitelist-template.txt and email-whitelist-template.json for examples');
    process.exit(1);
  }

  try {
    let results;

    if (filePath.endsWith('.json')) {
      results = await importFromJsonFile(filePath);
    } else if (filePath.endsWith('.txt')) {
      if (!addedBy) {
        console.error('❌ Error: added-by parameter is required for .txt files');
        console.log('Usage: node scripts/bulk-add-emails.mjs emails.txt <added-by>');
        process.exit(1);
      }
      results = await importFromTextFile(filePath, addedBy);
    } else {
      console.error('❌ Error: File must be .txt or .json');
      process.exit(1);
    }

    printSummary(results);
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
