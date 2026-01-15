import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.join(__dirname, '..', 'build');

// Ensure build directory exists
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Create a simple 256x256 PNG icon
const canvas = createCanvas(256, 256);
const ctx = canvas.getContext('2d');

// Background - medical cross theme
const gradient = ctx.createLinearGradient(0, 0, 256, 256);
gradient.addColorStop(0, '#3b82f6'); // Blue
gradient.addColorStop(1, '#1e40af'); // Darker blue
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 256, 256);

// White cross (medical/first aid symbol)
ctx.fillStyle = '#ffffff';
// Vertical bar
ctx.fillRect(96, 48, 64, 160);
// Horizontal bar
ctx.fillRect(48, 96, 160, 64);

// Add "FA" text
ctx.fillStyle = '#1e40af';
ctx.font = 'bold 48px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('FA', 128, 128);

// Save as PNG
const pngPath = path.join(buildDir, 'icon.png');
const out = fs.createWriteStream(pngPath);
const stream = canvas.createPNGStream();
stream.pipe(out);

out.on('finish', () => {
  console.log('✓ Created icon.png');
  console.log('Note: You need to convert this to .ico format for Windows');
  console.log('Use an online converter like https://icoconvert.com/');
});
