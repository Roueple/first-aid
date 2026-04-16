# Icon Fix Guide

## Problem Summary

The application logo doesn't work correctly in the installed application:

1. **Browser tab icon (favicon)**: Works in dev mode but not in production
2. **Windows taskbar icon**: Shows default Electron icon instead of Bernard logo

## Root Causes

### Issue 1: Favicon Not Working in Production

**Cause**: The HTML file references `/logoBernard.png` which exists in the `public` directory. In dev mode, Vite serves this directly. However, in production:
- Vite copies `public` files to `dist/renderer` during build
- The reference works, but we need a proper `favicon.ico` file for better browser compatibility

**Solution**: 
- Add `favicon.ico` to the `public` directory
- Update HTML to reference both PNG and ICO formats
- Vite will automatically copy it to the build output

### Issue 2: Taskbar Icon Shows Default Electron

**Cause**: The `build/icon.ico` file is the default Electron icon, not your Bernard logo. The main process (`src/main/main.ts`) correctly references this file:

```typescript
const iconPath = isDev
  ? path.join(__dirname, '../../build/icon.ico')
  : path.join(process.resourcesPath, 'build/icon.ico');
```

But the icon file itself needs to be replaced with your actual logo.

**Solution**: 
- Convert `logoBernard.png` to proper `.ico` format
- Replace `build/icon.ico` with the new icon
- Rebuild and repackage the application

## How Icon Files Work

### Development Mode
- **Browser tab**: Served from `public/logoBernard.png` via Vite dev server
- **Window icon**: Loaded from `build/icon.ico` (relative to project root)

### Production Mode
- **Browser tab**: Copied from `public/favicon.ico` to `dist/renderer/favicon.ico`
- **Window icon**: Copied from `build/icon.ico` to `release/win-unpacked/resources/build/icon.ico`

## Solution Steps

### Quick Fix (Automated)

Run the automated fix script:

```bash
tools\FIX-ICONS.bat
```

This will:
1. Create proper icons from `logoBernard.png`
2. Rebuild the application
3. Package for distribution

### Manual Fix

If you prefer to do it manually:

1. **Create icons from your logo**:
   ```bash
   npm run icons:create
   ```

2. **Rebuild the application**:
   ```bash
   npm run build
   ```

3. **Package for distribution**:
   ```bash
   npm run dist:win
   ```

4. **Install and test**:
   - Find the installer in `release/` folder
   - Install the application
   - Verify both the browser tab icon and taskbar icon show your Bernard logo

## What Gets Created

The `icons:create` script generates:

1. **public/favicon.ico** - Browser tab icon (16x16, 32x32)
2. **build/icon.ico** - Windows taskbar/window icon (multi-size: 16-256)
3. **build/icon.png** - Linux icon (256x256)
4. **build/assets/icon-*.png** - Various sizes for different uses

## Verification

After installing the new build:

1. **Browser tab**: Should show Bernard logo in the tab
2. **Taskbar**: Should show Bernard logo in Windows taskbar
3. **Alt+Tab**: Should show Bernard logo in task switcher
4. **Start Menu**: Should show Bernard logo in shortcuts

## Technical Details

### Icon Formats

- **ICO format**: Required for Windows (taskbar, window icon)
  - Contains multiple sizes in one file (16, 32, 48, 64, 128, 256)
  - Better quality at different sizes
  
- **PNG format**: Used for web (favicon) and Linux
  - Single size per file
  - Better transparency support

### Electron Builder Configuration

The `electron-builder.json` file specifies icon paths:

```json
{
  "win": {
    "icon": "build/icon.ico"
  },
  "extraResources": [
    {
      "from": "build/icon.ico",
      "to": "build/icon.ico"
    }
  ]
}
```

This tells electron-builder to:
1. Use `build/icon.ico` as the application icon
2. Copy it to the resources folder in the packaged app

### Main Process Icon Loading

The `src/main/main.ts` file loads the icon:

```typescript
const iconPath = isDev
  ? path.join(__dirname, '../../build/icon.ico')
  : path.join(process.resourcesPath, 'build/icon.ico');

mainWindow = new BrowserWindow({
  icon: iconPath,
  // ...
});
```

In production, `process.resourcesPath` points to the `resources` folder in the installed app.

## Troubleshooting

### Icons still not showing after rebuild

1. **Clear Windows icon cache**:
   - Close all instances of the app
   - Delete icon cache: `%localappdata%\IconCache.db`
   - Restart Windows Explorer

2. **Verify icon files exist**:
   ```bash
   dir build\icon.ico
   dir public\favicon.ico
   ```

3. **Check build output**:
   - Look in `dist/renderer/` for favicon.ico
   - Look in `release/win-unpacked/resources/build/` for icon.ico

### Icon looks blurry or pixelated

- Ensure `logoBernard.png` is high resolution (at least 512x512)
- The script will resize it to multiple sizes for best quality

### Dev mode works but production doesn't

- Run `npm run build` to rebuild
- Check that files are copied to `dist/renderer/`
- Verify paths in `dist/renderer/index.html`

## Future Improvements

Consider creating a `logoBernardv4.png` with:
- Higher resolution (1024x1024)
- Transparent background
- Optimized for small sizes (clear at 16x16)

Then update the script to use this new file as the source.
