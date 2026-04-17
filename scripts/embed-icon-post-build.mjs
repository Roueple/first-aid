#!/usr/bin/env node

/**
 * Post-build script to FORCE embed icon into the EXE
 * Uses rcedit (Resource Editor) to directly modify the EXE
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const EXE_PATH = path.join(rootDir, 'release', 'win-unpacked', 'FIRST-AID.exe');
const ICON_PATH = path.join(rootDir, 'build', 'icon.ico');

console.log('🔧 Post-Build: Embedding icon into EXE\n');

// Check if files exist
if (!fs.existsSync(EXE_PATH)) {
  console.error('❌ EXE not found:', EXE_PATH);
  console.error('Run: npm run build && npx electron-builder --win --dir');
  process.exit(1);
}

if (!fs.existsSync(ICON_PATH)) {
  console.error('❌ Icon not found:', ICON_PATH);
  console.error('Run: npm run icons:create');
  process.exit(1);
}

console.log('📦 EXE:', EXE_PATH);
console.log('🎨 Icon:', ICON_PATH);
console.log('');

try {
  // Install rcedit if not available
  console.log('📥 Installing rcedit...');
  execSync('npm install --no-save rcedit', {
    stdio: 'inherit',
    cwd: rootDir
  });

  console.log('\n🔨 Embedding icon into EXE...');
  
  // Use rcedit to set the icon
  execSync(`npx rcedit "${EXE_PATH}" --set-icon "${ICON_PATH}"`, {
    stdio: 'inherit',
    cwd: rootDir
  });

  console.log('\n✅ Icon embedded successfully!');
  console.log('\n📝 Next steps:');
  console.log('  1. Test: start "" "release\\win-unpacked\\FIRST-AID.exe"');
  console.log('  2. Check taskbar icon');
  console.log('  3. If correct, rebuild installer: npx electron-builder --win');

} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
