#!/usr/bin/env node

/**
 * Create a PROPER Windows ICO file from Bernard logo
 * This uses electron-icon-builder which is specifically designed for Electron apps
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const SOURCE = path.join(rootDir, 'public', 'logoBernard.png');
const OUTPUT_DIR = path.join(rootDir, 'build');

console.log('🎨 Creating Windows icon the PROPER way...\n');

// Check if source exists
if (!fs.existsSync(SOURCE)) {
  console.error('❌ Source logo not found:', SOURCE);
  process.exit(1);
}

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Backup existing icon
const existingIcon = path.join(OUTPUT_DIR, 'icon.ico');
if (fs.existsSync(existingIcon)) {
  const backup = `${existingIcon}.backup-${Date.now()}`;
  fs.copyFileSync(existingIcon, backup);
  console.log(`📦 Backed up existing icon to: ${path.basename(backup)}`);
}

try {
  // Method 1: Use electron-icon-builder if available
  console.log('\n📦 Installing electron-icon-builder...');
  execSync('npm install --no-save electron-icon-builder', { 
    stdio: 'inherit',
    cwd: rootDir 
  });

  console.log('\n🔨 Generating Windows icon...');
  execSync(`npx electron-icon-builder --input="${SOURCE}" --output="${OUTPUT_DIR}" --flatten`, {
    stdio: 'inherit',
    cwd: rootDir
  });

  console.log('\n✅ Icon created successfully!');
  
  // Verify the icon was created
  if (fs.existsSync(existingIcon)) {
    const stats = fs.statSync(existingIcon);
    console.log(`\n📊 Icon file: ${stats.size} bytes`);
    console.log(`📁 Location: ${existingIcon}`);
  }

} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.log('\n⚠️  Falling back to manual method...');
  
  // Fallback: Use our existing script
  try {
    execSync('node scripts/create-icons-from-logo.mjs', {
      stdio: 'inherit',
      cwd: rootDir
    });
  } catch (fallbackError) {
    console.error('❌ Fallback also failed:', fallbackError.message);
    process.exit(1);
  }
}

console.log('\n📝 Next steps:');
console.log('  1. Clean build: rmdir /s /q dist release');
console.log('  2. Rebuild: npm run build');
console.log('  3. Package: npx electron-builder --win');
console.log('  4. Test the new executable');
