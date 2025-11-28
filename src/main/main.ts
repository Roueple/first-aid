import { app, BrowserWindow, session } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  // Set up Content Security Policy for Electron 39
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.google.com https://firestore.googleapis.com https://*.cloudfunctions.net wss://*.firebaseio.com http://localhost:* ws://localhost:*;"
            : "default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.google.com https://firestore.googleapis.com https://*.cloudfunctions.net wss://*.firebaseio.com;",
        ],
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

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch((err) => {
      console.error('Failed to load dev server:', err);
      console.log('Make sure Vite dev server is running on port 5173');
      console.log('Run: npm run dev:renderer');
    });

    // Open DevTools when ready
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.openDevTools();
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
