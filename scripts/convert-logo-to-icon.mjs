import sharp from 'sharp';
import toIco from 'to-ico';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Windows ICO requires these sizes for proper taskbar/desktop display
// 256x256 is CRITICAL for Windows 10/11 taskbar
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

async function convertLogoToIcon() {
  try {
    console.log('🔄 Converting logoFull.png to icon.ico with all required sizes...');
    console.log(`📏 Generating sizes: ${ICO_SIZES.join(', ')}px`);

    const inputPath = join(rootDir, 'logoFull.png');
    const outputPath = join(rootDir, 'build', 'icon.ico');
    const backupPath = join(rootDir, 'build', `icon.ico.backup-${Date.now()}`);

    // Ensure build directory exists
    const buildDir = join(rootDir, 'build');
    if (!existsSync(buildDir)) {
      mkdirSync(buildDir, { recursive: true });
    }

    // Check if input file exists
    if (!existsSync(inputPath)) {
      console.error('❌ Input file not found:', inputPath);
      console.log('💡 Make sure logoFull.png exists in the project root');
      process.exit(1);
    }

    // Backup existing icon
    try {
      if (existsSync(outputPath)) {
        const existingIcon = readFileSync(outputPath);
        writeFileSync(backupPath, existingIcon);
        console.log('✅ Backed up existing icon to:', backupPath);
      }
    } catch (err) {
      console.log('ℹ️  No existing icon to backup');
    }

    // Generate PNG buffers for each size using sharp
    console.log('🖼️  Generating PNG buffers for each size...');
    const pngBuffers = await Promise.all(
      ICO_SIZES.map(async (size) => {
        const buffer = await sharp(inputPath)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer();
        console.log(`   ✓ Generated ${size}x${size}px`);
        return buffer;
      })
    );

    // Convert PNG buffers to ICO format
    console.log('🔧 Converting to ICO format...');
    const icoBuffer = await toIco(pngBuffers);
    writeFileSync(outputPath, icoBuffer);

    console.log('✅ Successfully created icon.ico with', ICO_SIZES.length, 'sizes');
    console.log('   Including 256x256 for Windows 10/11 taskbar');

    // Copy PNG version too
    console.log('✅ Also updating build/icon.png...');
    const pngData = readFileSync(inputPath);
    writeFileSync(join(rootDir, 'build', 'icon.png'), pngData);

    // Also generate individual PNG sizes for extraResources
    const assetsDir = join(buildDir, 'assets');
    if (!existsSync(assetsDir)) {
      mkdirSync(assetsDir, { recursive: true });
    }

    console.log('📁 Generating individual PNG sizes in build/assets/...');
    for (const size of [16, 32, 64, 128, 192, 256, 512]) {
      await sharp(inputPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(join(assetsDir, `icon-${size}.png`));
      console.log(`   ✓ Generated icon-${size}.png`);
    }

    console.log('');
    console.log('✅ Icon conversion complete!');
    console.log('📦 You can now run: npm run dist:win');
    console.log('');
    console.log('💡 If taskbar icon still shows default on another machine:');
    console.log('   1. Uninstall the old version completely');
    console.log('   2. Clear Windows icon cache: ie4uinit.exe -show');
    console.log('   3. Install the new version');
  } catch (error) {
    console.error('❌ Error converting icon:', error);
    process.exit(1);
  }
}

convertLogoToIcon();
