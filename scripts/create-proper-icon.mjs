#!/usr/bin/env node

/**
 * Creates a proper multi-size ICO file for Windows
 * Requires: sharp (npm install sharp)
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Required icon sizes for Windows
const ICON_SIZES = [16, 32, 48, 64, 128, 256];

// Source PNG file (highest quality)
const SOURCE_PNG = path.join(rootDir, 'logoBernard-v3.png');
const OUTPUT_DIR = path.join(rootDir, 'build');
const OUTPUT_ICO = path.join(OUTPUT_DIR, 'icon.ico');

async function createMultiSizeIco() {
  console.log('🎨 Creating multi-size ICO file...\n');

  // Check if source exists
  if (!fs.existsSync(SOURCE_PNG)) {
    console.error(`❌ Source PNG not found: ${SOURCE_PNG}`);
    console.log('Please ensure assets/fdfds.png exists');
    process.exit(1);
  }

  // Create output directory if needed
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    // Read source image
    const sourceBuffer = fs.readFileSync(SOURCE_PNG);
    const metadata = await sharp(sourceBuffer).metadata();
    
    console.log(`📐 Source image: ${metadata.width}x${metadata.height}px`);
    
    if (metadata.width < 256 || metadata.height < 256) {
      console.warn('⚠️  Warning: Source image is smaller than 256x256px');
      console.warn('   Icon quality may be reduced');
    }

    // Generate PNG files for each size
    console.log('\n📦 Generating icon sizes:');
    const pngBuffers = [];
    
    // First, trim the image to remove excess transparent space
    const trimmedBuffer = await sharp(sourceBuffer)
      .trim({
        threshold: 10 // Remove pixels that are nearly transparent
      })
      .toBuffer();
    
    for (const size of ICON_SIZES) {
      // Add minimal padding (2% on each side) for maximum icon size
      const paddingPercent = 0.02;
      const contentSize = Math.floor(size * (1 - paddingPercent * 2));
      const padding = Math.floor(size * paddingPercent);
      
      const buffer = await sharp(trimmedBuffer)
        .resize(contentSize, contentSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();
      
      pngBuffers.push({ size, buffer });
      console.log(`  ✓ ${size}x${size}px (${contentSize}px content + ${padding}px padding)`);
    }

    // Create ICO file manually
    console.log('\n🔨 Building ICO file...');
    const icoBuffer = createIcoBuffer(pngBuffers);
    
    // Backup old icon if exists
    if (fs.existsSync(OUTPUT_ICO)) {
      const backupPath = OUTPUT_ICO + '.backup-' + Date.now();
      fs.copyFileSync(OUTPUT_ICO, backupPath);
      console.log(`📋 Backed up old icon to: ${path.basename(backupPath)}`);
    }

    // Write new ICO file
    fs.writeFileSync(OUTPUT_ICO, icoBuffer);
    
    console.log(`\n✅ Created: ${OUTPUT_ICO}`);
    console.log(`📊 File size: ${(icoBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`🎯 Contains ${ICON_SIZES.length} sizes: ${ICON_SIZES.join(', ')}px`);
    
    // Also update the PNG with trimming
    const outputPng = path.join(OUTPUT_DIR, 'icon.png');
    const trimmedForPng = await sharp(sourceBuffer)
      .trim({ threshold: 10 })
      .toBuffer();
    
    const paddingPercent = 0.02;
    const contentSize = Math.floor(512 * (1 - paddingPercent * 2));
    const padding = Math.floor(512 * paddingPercent);
    
    await sharp(trimmedForPng)
      .resize(contentSize, contentSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPng);
    
    console.log(`✅ Created: ${outputPng} (512x512px with 2% padding for maximum visibility)`);
    
    console.log('\n🎉 Icon creation complete!');
    console.log('\nNext steps:');
    console.log('  1. Run: npm run build');
    console.log('  2. Run: npm run dist:win');
    console.log('  3. Uninstall old version');
    console.log('  4. Install new version from release/');
    
  } catch (error) {
    console.error('❌ Error creating icon:', error.message);
    process.exit(1);
  }
}

/**
 * Creates an ICO buffer from PNG buffers
 * ICO format: https://en.wikipedia.org/wiki/ICO_(file_format)
 */
function createIcoBuffer(pngBuffers) {
  const numImages = pngBuffers.length;
  
  // ICO header (6 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // Reserved (must be 0)
  header.writeUInt16LE(1, 2);      // Type (1 = ICO)
  header.writeUInt16LE(numImages, 4); // Number of images
  
  // Calculate directory entries and offsets
  const directorySize = 6 + (numImages * 16); // Header + directory entries
  let currentOffset = directorySize;
  
  const directories = [];
  const imageData = [];
  
  for (const { size, buffer } of pngBuffers) {
    const directory = Buffer.alloc(16);
    
    // Width and height (0 means 256)
    directory.writeUInt8(size === 256 ? 0 : size, 0);
    directory.writeUInt8(size === 256 ? 0 : size, 1);
    directory.writeUInt8(0, 2);      // Color palette (0 = no palette)
    directory.writeUInt8(0, 3);      // Reserved
    directory.writeUInt16LE(1, 4);   // Color planes
    directory.writeUInt16LE(32, 6);  // Bits per pixel
    directory.writeUInt32LE(buffer.length, 8);  // Image size
    directory.writeUInt32LE(currentOffset, 12); // Image offset
    
    directories.push(directory);
    imageData.push(buffer);
    currentOffset += buffer.length;
  }
  
  // Combine all parts
  return Buffer.concat([
    header,
    ...directories,
    ...imageData
  ]);
}

// Check if sharp is installed
try {
  await import('sharp');
} catch (error) {
  console.error('❌ Error: sharp package not found');
  console.log('\nPlease install sharp:');
  console.log('  npm install --save-dev sharp');
  process.exit(1);
}

// Run
createMultiSizeIco().catch(console.error);
