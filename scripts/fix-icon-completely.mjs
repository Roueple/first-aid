#!/usr/bin/env node

/**
 * Complete icon fix - The RIGHT way
 * 
 * Problem: electron-builder caches icons and doesn't always pick up changes
 * Solution: 
 * 1. Delete ALL cached/old icons
 * 2. Create fresh icon with correct name
 * 3. Force electron-builder to use it
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

console.log('🔧 Complete Icon Fix - Starting Fresh\n');

// Step 1: Clean everything
console.log('[1/5] Cleaning old builds and caches...');
const dirsToClean = [
  path.join(rootDir, 'dist'),
  path.join(rootDir, 'release'),
  path.join(rootDir, 'node_modules', '.cache')
];

for (const dir of dirsToClean) {
  if (fs.existsSync(dir)) {
    console.log(`  Removing: ${path.basename(dir)}`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Step 2: Delete old icon backups
console.log('\n[2/5] Cleaning old icon backups...');
const buildDir = path.join(rootDir, 'build');
if (fs.existsSync(buildDir)) {
  const files = fs.readdirSync(buildDir);
  for (const file of files) {
    if (file.includes('backup') || file.includes('.ico.')) {
      const filePath = path.join(buildDir, file);
      fs.unlinkSync(filePath);
      console.log(`  Deleted: ${file}`);
    }
  }
}

// Step 3: Create fresh icon
console.log('\n[3/5] Creating fresh icon from logoBernard.png...');
try {
  execSync('node scripts/create-icons-from-logo.mjs', {
    stdio: 'inherit',
    cwd: rootDir
  });
} catch (error) {
  console.error('❌ Failed to create icon');
  process.exit(1);
}

// Step 4: Verify icon
console.log('\n[4/5] Verifying icon...');
const iconPath = path.join(buildDir, 'icon.ico');
if (!fs.existsSync(iconPath)) {
  console.error('❌ Icon file not created!');
  process.exit(1);
}

const stats = fs.statSync(iconPath);
console.log(`  ✅ Icon exists: ${stats.size} bytes`);

if (stats.size < 100000) {
  console.warn(`  ⚠️  Icon seems small (${stats.size} bytes)`);
  console.warn('     Expected: ~360,000 bytes for Bernard logo');
}

// Step 5: Instructions
console.log('\n[5/5] Next steps:');
console.log('  ✅ Icon is ready');
console.log('  ✅ Old builds cleaned');
console.log('\n  Now run:');
console.log('    npm run build');
console.log('    npx electron-builder --win');
console.log('\n  The new build will have the correct icon embedded!');
