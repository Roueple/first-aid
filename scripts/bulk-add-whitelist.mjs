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
 *   CSV: username,name,email (with or without header)
 *   JSON: [{"username": "...", "name": "...", "email": "..."}]
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

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const users = [];
  
  // Check if first line is header
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('username') || firstLine.includes('name') || firstLine.includes('email');
  const startIndex = hasHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
    
    if (parts.length >= 3) {
      users.push({
        username: parts[0],
        name: parts[1],
        email: parts[2]
      });
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
    username: user.username || user.Username,
    name: user.name || user.Name || user.displayName,
    email: user.email || user.Email
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
      // Validate email
      if (!user.email || !user.email.includes('@')) {
        results.failed.push({ user, error: 'Invalid email format' });
        console.log(`❌ Skipped ${user.username || 'unknown'}: Invalid email`);
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

      // Add to whitelist
      const entry = {
        email: normalizedEmail,
        displayName: user.name || user.username,
        username: user.username,
        addedAt: Date.now(),
        addedBy,
        active: true,
      };

      await whitelistRef.set(entry);
      results.success.push(user);
      console.log(`✅ Added ${normalizedEmail} (${user.name || user.username})`);

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
      console.log(`  - ${user.email || user.username}: ${error}`);
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
    console.log('  node scripts/bulk-add-whitelist.mjs <file-path> <added-by>');
    console.log('');
    console.log('File formats:');
    console.log('  CSV: username,name,email');
    console.log('       john_doe,John Doe,john@example.com');
    console.log('       jane_smith,Jane Smith,jane@example.com');
    console.log('');
    console.log('  JSON: [{"username": "john_doe", "name": "John Doe", "email": "john@example.com"}]');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/bulk-add-whitelist.mjs users.csv admin');
    console.log('  node scripts/bulk-add-whitelist.mjs users.json admin');
    process.exit(1);
  }

  try {
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
