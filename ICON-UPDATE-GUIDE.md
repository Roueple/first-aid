# Application Icon Update Guide

## Overview

All application icons have been updated to use `logoBernard-v2.png` as the source. This includes:

- **Window Icon** (taskbar)
- **Application Menu Icon**
- **Installer Icon**
- **Desktop Shortcut Icon**
- **In-App Logo** (Bernard chat interface)

## Icon Files Generated

### Windows Icons
- `build/icon.ico` - Multi-size ICO file (16, 32, 48, 64, 128, 256px)
- `build/icon.png` - General use PNG (256x256)

### Web/UI Icons
- `public/bernardlogo.png` - Used in Bernard chat interface (256x256)

### Additional Sizes (in `build/assets/`)
- `icon-512.png` - 512x512
- `icon-192.png` - 192x192
- `icon-128.png` - 128x128
- `icon-64.png` - 64x64
- `icon-32.png` - 32x32
- `icon-16.png` - 16x16

## How to Update Icons

If you need to change the application icon in the future:

1. Replace `logoBernard-v2.png` in the project root with your new logo
2. Run the conversion script:
   ```bash
   node scripts/convert-logo-to-icons.mjs
   ```
3. Rebuild the application:
   ```bash
   npm run build
   ```
4. Package for distribution:
   ```bash
   npm run package
   ```

Or use the all-in-one batch file:
```bash
scripts/update-all-icons.bat
```

## Icon Usage Locations

### Electron Main Process
- **File**: `src/main/main.ts`
- **Line**: ~96
- **Usage**: Window icon for taskbar and title bar
- **Path**: `build/icon.ico` (Windows)

### Electron Builder Configuration
- **File**: `electron-builder.json`
- **Usage**: 
  - Installer icon (`nsis.installerIcon`)
  - Uninstaller icon (`nsis.uninstallerIcon`)
  - Application icon (`win.icon`)
- **Path**: `build/icon.ico`

### Bernard Chat Interface
- **File**: `src/renderer/pages/BernardPage.tsx`
- **Lines**: 833, 863, 1033
- **Usage**: Bernard avatar in chat messages and welcome screen
- **Path**: `/bernardlogo.png` (served from `public/`)

## Technical Details

### Icon Conversion Process

The conversion script (`scripts/convert-logo-to-icons.mjs`) uses:
- **sharp** - For PNG resizing and optimization
- **to-ico** - For ICO file generation with multiple sizes

### ICO File Structure

The Windows ICO file contains 6 embedded PNG images:
- 16x16 - System tray, small icons
- 32x32 - Standard icons
- 48x48 - Large icons
- 64x64 - Extra large icons
- 128x128 - Jumbo icons
- 256x256 - Ultra-large icons (Windows 7+)

### Transparency

All icons maintain transparency from the source PNG, ensuring proper display on:
- Light backgrounds
- Dark backgrounds
- Colored taskbars
- Various Windows themes

## Testing

After updating icons, test in these scenarios:

1. **Development Mode**
   ```bash
   npm run dev
   ```
   - Check window icon in taskbar
   - Check Bernard avatar in chat

2. **Production Build**
   ```bash
   npm run build
   npm run package
   ```
   - Install the application
   - Check desktop shortcut icon
   - Check Start Menu icon
   - Check taskbar icon when running
   - Check installer/uninstaller icons

3. **Different Windows Versions**
   - Windows 10
   - Windows 11
   - Different DPI settings (100%, 125%, 150%, 200%)

## Troubleshooting

### Icon not updating in development
- Clear Electron cache: Delete `%APPDATA%/first-aid-system`
- Restart the development server

### Icon not updating in production
- Uninstall the old version completely
- Delete `%LOCALAPPDATA%/first-aid-system`
- Reinstall the new version

### Icon appears blurry
- Ensure source PNG is high resolution (minimum 512x512)
- Check DPI scaling settings in Windows
- Verify ICO file contains multiple sizes

### Icon has white background
- Ensure source PNG has transparency
- Check that conversion script preserves alpha channel
- Verify `background: { r: 0, g: 0, b: 0, alpha: 0 }` in conversion script

## Source Files

- **Source Logo**: `logoBernard-v2.png` (3000x3000)
- **Conversion Script**: `scripts/convert-logo-to-icons.mjs`
- **Batch Helper**: `scripts/update-all-icons.bat`

## Related Configuration

- `electron-builder.json` - Icon paths for packaging
- `src/main/main.ts` - Window icon configuration
- `src/renderer/pages/BernardPage.tsx` - UI logo usage
