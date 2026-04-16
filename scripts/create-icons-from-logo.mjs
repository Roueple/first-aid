#!/usr/bin/env node

/**
 * Create proper icon files from logoBernard.png
 * Generates:
 * - favicon.ico (for browser tab)
 * - icon.ico (for Windows taskbar/window)
 * - icon.png (for Linux)
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pngToIco from 'png-to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const SOURCE_LOGO = path.join(rootDir, 'public', 'logoBernard.png');
const BUILD_DIR = path.join(rootDir, 'build');
const BUILD_ASSETS_DIR = path.join(BUILD_DIR, 'assets');
const PUBLIC_DIR = path.join(rootDir, 'public');

// Ensure directories exist
if (!fs.existsSync(BUILD_ASSETS_DIR)) {
  fs.mkdirSync(BUILD_ASSETS_DIR, { recursive: true });
}

async function createIcons() {
  console.log('🎨 Creating icons from logoBernard.png...\n');

  if (!fs.existsSync(SOURCE_LOGO)) {
    console.error('❌ Source logo not found:', SOURCE_LOGO);
    console.error('Please ensure public/logoBernard.png exists');
    process.exit(1);
  }

  try {
    // Read source image
    const sourceImage = sharp(SOURCE_LOGO);
    const metadata = await sourceImage.metadata();
    console.log(`📐 Source image: ${metadata.width}x${metadata.height}`);

    // Create PNG icons for different sizes
    const sizes = [16, 32, 64, 128, 256, 512];
    console.log('\n📦 Creating PNG icons...');
    
    const tempPngPaths = [];
    for (const size of sizes) {
      const outputPath = path.join(BUILD_ASSETS_DIR, `icon-${size}.png`);
      await sharp(SOURCE_LOGO)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      console.log(`  ✅ Created ${size}x${size} PNG`);
      
      // Store paths for ICO conversion
      if ([16, 32, 48, 64, 128, 256].includes(size)) {
        tempPngPaths.push(outputPath);
      }
    }

    // Create main icon.png (256x256 for Linux)
    const iconPngPath = path.join(BUILD_DIR, 'icon.png');
    await sharp(SOURCE_LOGO)
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(iconPngPath);
    console.log(`  ✅ Created icon.png (256x256)`);

    // Create favicon.ico for browser
    console.log('\n🌐 Creating favicon.ico...');
    const faviconPath = path.join(PUBLIC_DIR, 'favicon.ico');
    
    // Use 16, 32, 48 for favicon
    const faviconSources = [
      path.join(BUILD_ASSETS_DIR, 'icon-16.png'),
      path.join(BUILD_ASSETS_DIR, 'icon-32.png')
    ];
    
    const faviconBuffer = await pngToIco(faviconSources);
    fs.writeFileSync(faviconPath, faviconBuffer);
    console.log(`  ✅ Created favicon.ico (16x16, 32x32)`);

    // Create Windows icon.ico (for taskbar/window)
    console.log('\n🪟 Creating Windows icon.ico...');
    const windowsIconPath = path.join(BUILD_DIR, 'icon.ico');
    
    // Backup existing icon if it exists
    if (fs.existsSync(windowsIconPath)) {
      const backupPath = `${windowsIconPath}.backup-${Date.now()}`;
      fs.copyFileSync(windowsIconPath, backupPath);
      console.log(`  📦 Backed up existing icon to: ${path.basename(backupPath)}`);
    }

    // Use multiple sizes for Windows icon (16, 32, 48, 64, 128, 256)
    const windowsIconBuffer = await pngToIco(tempPngPaths);
    fs.writeFileSync(windowsIconPath, windowsIconBuffer);
    console.log(`  ✅ Created icon.ico (multi-size: 16-256)`);

    console.log('\n✨ All icons created successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Run: npm run build');
    console.log('  2. Run: npm run dist:win');
    console.log('  3. Install and test the application');

  } catch (error) {
    console.error('❌ Error creating icons:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

createIcons();
