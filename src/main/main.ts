import { app, BrowserWindow, session, ipcMain, dialog, Menu } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
let deeplinkUrl: string | null = null;
let isWindowReady = false;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Configure auto-updater
autoUpdater.autoDownload = false; // Don't auto-download, ask user first
autoUpdater.autoInstallOnAppQuit = true; // Install when app quits

// Auto-updater logging
autoUpdater.logger = {
  info: (msg) => console.log('[AutoUpdater]', msg),
  warn: (msg) => console.warn('[AutoUpdater]', msg),
  error: (msg) => console.error('[AutoUpdater]', msg),
  debug: (msg) => console.debug('[AutoUpdater]', msg),
};

// Protocol for deep linking
const PROTOCOL = 'firstaid';

// Helper function to send deep link to renderer
function sendDeepLinkToRenderer(url: string) {
  console.log('📤 Attempting to send deep link to renderer:', url);
  if (mainWindow && isWindowReady) {
    console.log('✅ Window ready, sending deep-link event');
    mainWindow.webContents.send('deep-link', url);
  } else {
    console.log('⏳ Window not ready, storing deep link for later');
    deeplinkUrl = url;
  }
}

function createWindow() {
  // Note: Firebase auth links are handled via deep links (firstaid:// protocol)
  // No need to intercept http requests as we use HashRouter

  // Set up Content Security Policy
  // In dev mode, we need to allow localhost for Vite HMR
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' http://localhost:*; img-src 'self' data: https: http://localhost:*; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.google.com https://firestore.googleapis.com https://*.cloudfunctions.net wss://*.firebaseio.com http://localhost:* ws://localhost:*; font-src 'self' data: http://localhost:*;"
      : "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.google.com https://firestore.googleapis.com https://*.cloudfunctions.net wss://*.firebaseio.com;";
    
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: isDev,
    },
    title: 'FIRST-AID - Audit Findings Management',
    show: false,
    backgroundColor: '#f9fafb',
  });

  // Create application menu
  createMenu();

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch((err) => {
      console.error('Failed to load dev server:', err);
      console.log('Make sure Vite dev server is running on port 5173');
      console.log('Run: npm run dev:renderer');
    });
  } else {
    const indexPath = path.join(__dirname, '../renderer/index.html');
    console.log('Loading production build from:', indexPath);
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('Failed to load production build:', err);
      console.error('Expected path:', indexPath);
    });
  }

  // Debug logging
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // Single did-finish-load handler for all initialization
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('✅ Window loaded successfully');
    isWindowReady = true;
    
    // DevTools are disabled by default for cleaner UI
    // To enable: View menu > Developer > Toggle DevTools (in dev mode only)
    
    // Send any pending deep link
    if (deeplinkUrl) {
      console.log('📤 Sending pending deep link:', deeplinkUrl);
      mainWindow?.webContents.send('deep-link', deeplinkUrl);
      deeplinkUrl = null;
    }
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create application menu
function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates',
          click: async () => {
            if (isDev) {
              dialog.showMessageBox({
                type: 'info',
                title: 'Updates Disabled',
                message: 'Auto-updates are disabled in development mode.',
                buttons: ['OK']
              });
              return;
            }
            
            try {
              const result = await autoUpdater.checkForUpdates();
              if (!result) {
                dialog.showMessageBox({
                  type: 'info',
                  title: 'No Updates',
                  message: 'You are running the latest version.',
                  buttons: ['OK']
                });
              }
            } catch (error) {
              dialog.showMessageBox({
                type: 'error',
                title: 'Update Check Failed',
                message: `Failed to check for updates: ${(error as Error).message}`,
                buttons: ['OK']
              });
            }
          }
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About FIRST-AID',
              message: `FIRST-AID v${app.getVersion()}`,
              detail: 'Intelligent Audit Findings Management System\n\nPowered by Electron, React, and Firebase',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  // Add dev tools menu in development
  if (isDev) {
    template.push({
      label: 'Developer',
      submenu: [
        { role: 'toggleDevTools' },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.reload()
        }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Handle deep links on macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  console.log('🔗 [macOS] Deep link received:', url);
  
  sendDeepLinkToRenderer(url);
  
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Auto-updater setup
function setupAutoUpdater() {
  // Update available
  autoUpdater.on('update-available', (info) => {
    console.log('✨ Update available:', info.version);
    mainWindow?.webContents.send('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
  });

  // Update not available
  autoUpdater.on('update-not-available', (info) => {
    console.log('✅ App is up to date:', info.version);
  });

  // Download progress
  autoUpdater.on('download-progress', (progress) => {
    console.log(`📥 Download progress: ${progress.percent.toFixed(2)}%`);
    mainWindow?.webContents.send('update-download-progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  // Update downloaded
  autoUpdater.on('update-downloaded', (info) => {
    console.log('✅ Update downloaded:', info.version);
    mainWindow?.webContents.send('update-downloaded', {
      version: info.version,
    });
  });

  // Error
  autoUpdater.on('error', (error) => {
    console.error('❌ Update error:', error);
    mainWindow?.webContents.send('update-error', {
      message: error.message,
    });
  });

  // IPC handlers for renderer
  ipcMain.handle('check-for-updates', async () => {
    if (isDev) {
      return { available: false, message: 'Updates disabled in development' };
    }
    try {
      const result = await autoUpdater.checkForUpdates();
      return { 
        available: result !== null, 
        version: result?.updateInfo.version 
      };
    } catch (error) {
      console.error('Check for updates failed:', error);
      return { available: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('download-update', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      console.error('Download update failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });
}

// Handle deep links on Windows/Linux
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    console.log('🔗 [Windows] Second instance detected, commandLine:', commandLine);
    
    // Windows/Linux: commandLine contains the deep link
    const url = commandLine.find(arg => arg.startsWith(`${PROTOCOL}://`));
    
    if (url) {
      console.log('📱 Deep link found:', url);
      sendDeepLinkToRenderer(url);
    } else {
      console.log('⚠️ No deep link found in command line');
    }
    
    // Focus the window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Register custom protocol for deep linking
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
      }
    } else {
      app.setAsDefaultProtocolClient(PROTOCOL);
    }

    createWindow();
    
    // Set up auto-updater IPC handlers
    setupAutoUpdater();
    
    // Check for updates (only in production)
    if (!isDev) {
      // Check for updates 5 seconds after app starts
      setTimeout(() => {
        console.log('🔍 Checking for updates...');
        autoUpdater.checkForUpdates().catch(err => {
          console.error('Failed to check for updates:', err);
        });
      }, 5000);
    }
    
    // Check for deep link in command line args (Windows/Linux)
    const args = process.argv.slice(1);
    console.log('🔍 Checking command line args:', args);
    const deepLinkArg = args.find(arg => 
      arg.startsWith('http://localhost:5173/auth/verify') || 
      arg.startsWith(`${PROTOCOL}://`)
    );
    if (deepLinkArg) {
      console.log('📱 Deep link found in args:', deepLinkArg);
      deeplinkUrl = deepLinkArg;
    }

    // Deep link from args will be sent after window is ready (handled in did-finish-load)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
