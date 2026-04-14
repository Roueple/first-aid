import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function resizeLogo() {
  try {
    console.log('Resizing bernardlogo.png...');
    
    const inputPath = join(rootDir, 'Bernardlogo.png');
    const outputPath = join(rootDir, 'public', 'bernardlogo.png');
    
    // Resize to 140x140 for welcome screen (will also work for 32x32 avatar)
    await sharp(inputPath)
      .resize(140, 140, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(outputPath);
    
    console.log('✓ Logo resized successfully to 140x140px');
    console.log(`✓ Saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error resizing logo:', error);
    process.exit(1);
  }
}

resizeLogo();
