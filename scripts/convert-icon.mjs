import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Try to use png-to-ico package if available, otherwise use simple conversion
async function convertPngToIco(pngPath, icoPath) {
  console.log('📸 Converting PNG to ICO...');
  console.log('  Input:', pngPath);
  console.log('  Output:', icoPath);

  try {
    // Try using png-to-ico package (already in devDependencies)
    const pngToIco = await import('png-to-ico');
    const buf = await pngToIco.default(pngPath);
    fs.writeFileSync(icoPath, buf);
    console.log('✅ ICO file created with png-to-ico!');
    console.log('  Size:', buf.length, 'bytes');
    return;
  } catch (error) {
    console.log('⚠️ png-to-ico not available, trying ImageMagick...');
  }

  try {
    // Try using ImageMagick if installed
    await execAsync(`magick convert "${pngPath}" -define icon:auto-resize=256,128,96,64,48,32,16 "${icoPath}"`);
    console.log('✅ ICO file created with ImageMagick!');
    return;
  } catch (error) {
    console.log('⚠️ ImageMagick not available, using simple conversion...');
  }

  // Fallback: Simple PNG embedding (may not work well for all cases)
  const pngBuffer = fs.readFileSync(pngPath);
  
  // ICO file format with PNG embedded
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved (must be 0)
  header.writeUInt16LE(1, 2); // Type (1 = ICO)
  header.writeUInt16LE(1, 4); // Number of images

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(0, 0);  // Width (0 = 256)
  dirEntry.writeUInt8(0, 1);  // Height (0 = 256)
  dirEntry.writeUInt8(0, 2);  // Color palette
  dirEntry.writeUInt8(0, 3);  // Reserved
  dirEntry.writeUInt16LE(1, 4);  // Color planes
  dirEntry.writeUInt16LE(32, 6); // Bits per pixel
  dirEntry.writeUInt32LE(pngBuffer.length, 8);  // Size of image data
  dirEntry.writeUInt32LE(22, 12); // Offset (6 + 16 = 22)

  const icoBuffer = Buffer.concat([header, dirEntry, pngBuffer]);
  fs.writeFileSync(icoPath, icoBuffer);
  
  console.log('✅ ICO file created with simple conversion!');
  console.log('  Size:', icoBuffer.length, 'bytes');
  console.log('⚠️ Note: For best results, install ImageMagick or use png-to-ico package');
}

async function main() {
  const pngPath = path.join(rootDir, 'felix_logov2.png');
  const buildDir = path.join(rootDir, 'build');
  const icoPath = path.join(buildDir, 'icon.ico');
  const pngOutputPath = path.join(buildDir, 'icon.png');

  // Check if source file exists
  if (!fs.existsSync(pngPath)) {
    console.error('❌ Error: felix_logov2.png not found!');
    process.exit(1);
  }

  // Create build directory if it doesn't exist
  if (!fs.existsSync(buildDir)) {
    console.log('📁 Creating build directory...');
    fs.mkdirSync(buildDir, { recursive: true });
  }

  // Backup existing icons
  if (fs.existsSync(icoPath)) {
    const backupPath = path.join(buildDir, 'icon.ico.backup');
    console.log('💾 Backing up existing icon.ico...');
    fs.copyFileSync(icoPath, backupPath);
  }

  // Convert PNG to ICO
  await convertPngToIco(pngPath, icoPath);

  // Also copy the PNG
  console.log('📋 Copying PNG to build directory...');
  fs.copyFileSync(pngPath, pngOutputPath);
  console.log('✅ PNG copied successfully!');

  console.log('\n🎉 Icon conversion complete!');
  console.log('\nNext steps:');
  console.log('1. Rebuild your app: npm run build');
  console.log('2. Package the installer: npm run dist:win');
  console.log('3. The new icon will appear in the taskbar and desktop shortcut');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
