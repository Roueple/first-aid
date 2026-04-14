#!/usr/bin/env node

/**
 * Convert logoBernard.png to all required icon formats
 * - icon.ico (Windows taskbar, window icon, installer)
 * - icon.png (general use)
 * - icon.icns (macOS - if needed)
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import toIco from 'to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const SOURCE_LOGO = path.join(rootDir, 'logoBernard-v2.png');
const BUILD_DIR = path.join(rootDir, 'build');
const PUBLIC_DIR = path.join(rootDir, 'public');

async function main() {
  console.log('🎨 Converting logoBernard-v2.png to application icons...\n');

  // Check if source file exists
  if (!fs.existsSync(SOURCE_LOGO)) {
    console.error('❌ Error: logoBernard-v2.png not found in project root');
    console.error('   Expected location:', SOURCE_LOGO);
    process.exit(1);
  }

  // Ensure directories exist
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
  }

  try {
    // Read source image
    const sourceImage = sharp(SOURCE_LOGO);
    const metadata = await sourceImage.metadata();
    console.log(`📐 Source image: ${metadata.width}x${metadata.height} (${metadata.format})`);

    // 1. Create icon.png (256x256 for general use)
    console.log('\n📦 Creating icon.png (256x256)...');
    await sourceImage
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(BUILD_DIR, 'icon.png'));
    console.log('✅ Created build/icon.png');

    // Also copy to public directory for web use
    await sourceImage
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(PUBLIC_DIR, 'bernardlogo.png'));
    console.log('✅ Updated public/bernardlogo.png');

    // 2. Create icon.ico (Windows - multiple sizes)
    console.log('\n📦 Creating icon.ico (Windows)...');
    
    // ICO files should contain multiple sizes: 16, 32, 48, 64, 128, 256
    const icoSizes = [16, 32, 48, 64, 128, 256];
    const icoBuffers = [];

    for (const size of icoSizes) {
      const buffer = await sourceImage
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();
      icoBuffers.push(buffer);
    }

    // Convert to ICO format
    const icoBuffer = await toIco(icoBuffers);
    fs.writeFileSync(path.join(BUILD_DIR, 'icon.ico'), icoBuffer);
    console.log('✅ Created build/icon.ico (multi-size: 16, 32, 48, 64, 128, 256)');

    // 3. Create additional sizes for assets
    console.log('\n📦 Creating additional icon sizes...');
    
    const assetSizes = [
      { size: 512, name: 'icon-512.png' },
      { size: 192, name: 'icon-192.png' },
      { size: 128, name: 'icon-128.png' },
      { size: 64, name: 'icon-64.png' },
      { size: 32, name: 'icon-32.png' },
      { size: 16, name: 'icon-16.png' }
    ];

    const assetsDir = path.join(BUILD_DIR, 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    for (const { size, name } of assetSizes) {
      await sourceImage
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(path.join(assetsDir, name));
      console.log(`✅ Created build/assets/${name}`);
    }

    console.log('\n✨ Icon conversion complete!');
    console.log('\n📋 Summary:');
    console.log('   • build/icon.ico - Windows taskbar, window, installer');
    console.log('   • build/icon.png - General use (256x256)');
    console.log('   • build/assets/icon-*.png - Various sizes');
    console.log('   • public/bernardlogo.png - Web use');
    console.log('\n🔄 Next steps:');
    console.log('   1. Rebuild the app: npm run build');
    console.log('   2. Package the app: npm run package');
    console.log('   3. Test the new icons in the built application');

  } catch (error) {
    console.error('\n❌ Error during conversion:', error.message);
    process.exit(1);
  }
}

main();
