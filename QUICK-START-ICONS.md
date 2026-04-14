# Quick Start: Application Icons

## ✅ Icons Updated Successfully!

All application icons now use **logoBernard-v2.png** as the source.

## 📍 Where Icons Appear

1. **Windows Taskbar** - When app is running
2. **Window Title Bar** - Top-left corner
3. **Desktop Shortcut** - After installation
4. **Start Menu** - Windows Start Menu entry
5. **Installer** - During installation process
6. **Bernard Chat Interface** - Avatar in chat messages

## 🚀 Test the New Icons

### Development Mode
```bash
npm run dev
```
Look for the icon in:
- Taskbar (bottom of screen)
- Window title bar (top-left)
- Bernard chat interface (avatar)

### Production Build
```bash
npm run build
npm run package
```
Then install the app from `release/` folder and check:
- Desktop shortcut icon
- Start Menu icon
- Taskbar icon when running

## 🔄 Update Icons in Future

If you need to change the logo:

1. Replace `logoBernard-v2.png` in project root
2. Run: `npm run icons:convert`
3. Rebuild: `npm run build`
4. Package: `npm run package`

Or use the all-in-one script:
```bash
scripts\update-all-icons.bat
```

## ✓ Verify Icons

Check all icon files exist:
```bash
npm run icons:verify
```

Or manually:
```bash
scripts\verify-icons.bat
```

## 📁 Icon Files Location

- `build/icon.ico` - Windows icon (multi-size)
- `build/icon.png` - General use (256x256)
- `public/bernardlogo.png` - Web/UI use
- `build/assets/icon-*.png` - Various sizes

## 🎨 Icon Specifications

- **Format**: PNG with transparency
- **Source Size**: 3000x3000 (logoBernard-v2.png)
- **ICO Sizes**: 16, 32, 48, 64, 128, 256px
- **Transparency**: Preserved from source

## 📖 Full Documentation

See `ICON-UPDATE-GUIDE.md` for complete technical details.

## ⚠️ Important Notes

- Icons update automatically when you rebuild the app
- Old backup files (*.backup, *.old) can be safely deleted
- Clear Electron cache if icons don't update in dev mode
- Uninstall old version before testing new installer icons

## 🐛 Troubleshooting

**Icon not updating?**
- Clear cache: Delete `%APPDATA%/first-aid-system`
- Restart dev server
- For production: Uninstall old version first

**Icon appears blurry?**
- Ensure source PNG is high resolution
- Check Windows DPI scaling settings

**Icon has white background?**
- Verify source PNG has transparency
- Re-run conversion script

## 📞 Need Help?

Check the full guide: `ICON-UPDATE-GUIDE.md`
