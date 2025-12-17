import { app, BrowserWindow, session } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
let deeplinkUrl: string | null = null;
let isWindowReady = false;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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
    
    // Open DevTools in dev mode
    if (isDev) {
      mainWindow?.webContents.openDevTools();
    }
    
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
