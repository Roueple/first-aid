#!/usr/bin/env node

/**
 * FORCE embed icon using @electron/rcedit (official tool)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const EXE_PATH = path.join(rootDir, 'release', 'win-unpacked', 'FIRST-AID.exe');
const ICON_PATH = path.join(rootDir, 'build', 'icon.ico');

console.log('🔧 FORCE Icon Embedding\n');

if (!fs.existsSync(EXE_PATH)) {
  console.error('❌ EXE not found');
  process.exit(1);
}

if (!fs.existsSync(ICON_PATH)) {
  console.error('❌ Icon not found');
  process.exit(1);
}

try {
  console.log('📥 Installing @electron/rcedit...');
  execSync('npm install --no-save @electron/rcedit', {
    stdio: 'inherit',
    cwd: rootDir
  });

  console.log('\n🔨 Embedding icon...');
  
  // Import and use rcedit
  const { default: rcedit } = await import('@electron/rcedit');
  
  await rcedit(EXE_PATH, {
    icon: ICON_PATH
  });

  console.log('\n✅ Icon embedded!');
  console.log('\nTest now:');
  console.log('  taskkill /F /IM FIRST-AID.exe');
  console.log('  start "" "release\\win-unpacked\\FIRST-AID.exe"');
  console.log('\nCheck the taskbar icon!');

} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
