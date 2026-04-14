# Application Icon Update Guide

## Summary
All application icons have been updated from Felix logo to Bernard logo.

## What Was Changed

### 1. Icon Source File
- **Old**: `assets/felix_logov2.png` (265 KB)
- **New**: `public/bernardlogo.png` (7 KB)

### 2. Generated Icon Files
- `build/icon.ico` - Windows icon (285 KB) - Used for taskbar, menu bar, installer
- `build/icon.png` - PNG version (7 KB) - Used for macOS/Linux

### 3. Updated Scripts
- `scripts/convert-icon.mjs` - Now uses `public/bernardlogo.png` as source
- `scripts/manage-email-whitelist.mjs` - Updated "Felix chat" → "Bernard chat"
- `scripts/reset-and-add-users.mjs` - Updated "Felix chat" → "Bernard chat"
- `scripts/seed-department-tags.mjs` - Updated "Felix query" → "Bernard query"
- `scripts/publish-release.mjs` - Updated release notes reference

### 4. Icon Locations in Application

The Bernard logo now appears in:
- **Windows Taskbar** - When app is running
- **Application Menu Bar** - Top-left corner icon
- **Desktop Shortcut** - After installation
- **Start Menu Shortcut** - After installation
- **Installer Icon** - NSIS installer window
- **Uninstaller Icon** - When uninstalling
- **UI Welcome Screen** - 140x140px logo
- **Chat Messages** - 32x32px avatar

## Icon Sizes

### bernardlogo.png
- Original: 7 KB (optimized)
- Welcome screen: 140x140px
- Chat avatar: 32x32px

### icon.ico (Windows)
- Multi-resolution ICO file: 285 KB
- Contains: 256, 128, 96, 64, 48, 32, 16px sizes

## How to Update Icons in Future

1. Replace `public/bernardlogo.png` with new logo
2. Run: `node scripts/convert-icon.mjs`
3. Rebuild: `npm run build`
4. Package: `npm run package`

Or use the batch file:
```bash
tools\UPDATE-ICON.bat
```

## Configuration Files

### electron-builder.json
```json
{
  "win": {
    "icon": "build/icon.ico"
  },
  "nsis": {
    "installerIcon": "build/icon.ico",
    "uninstallerIcon": "build/icon.ico"
  }
}
```

### src/main/main.ts
```typescript
const iconPath = isDev
  ? path.join(__dirname, '../../build/icon.ico')
  : path.join(process.resourcesPath, 'build/icon.ico');
```

## Verification

All Felix logo references have been removed from active code (archive folder excluded).

To verify the new icon:
1. Build the app: `npm run build`
2. Run the app: `npm start`
3. Check taskbar and window icon
4. Package installer: `npm run package`
5. Install and verify desktop/start menu shortcuts

## Notes

- The bernardlogo.png is already optimized (7 KB)
- Icon conversion uses `png-to-ico` package (already in devDependencies)
- Old Felix logo remains in `assets/` folder for reference
- Backup icons are stored in `build/icon.ico.backup*`
