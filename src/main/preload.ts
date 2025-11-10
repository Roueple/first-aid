import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Platform information
  platform: process.platform,
  
  // Version information
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  
  // IPC communication (for future use)
  ipc: {
    send: (channel: string, ...args: unknown[]) => {
      // Whitelist channels for security
      const validChannels = ['toMain'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, ...args);
      }
    },
    on: (channel: string, func: (...args: unknown[]) => void) => {
      const validChannels = ['fromMain'];
      if (validChannels.includes(channel)) {
        const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => func(...args);
        ipcRenderer.on(channel, subscription);
        
        return () => {
          ipcRenderer.removeListener(channel, subscription);
        };
      }
      return () => {};
    },
    invoke: (channel: string, ...args: unknown[]) => {
      const validChannels = ['dialog:openFile', 'dialog:saveFile'];
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      }
      return Promise.reject(new Error(`Invalid channel: ${channel}`));
    },
  },
});

// Log that preload script has loaded
console.log('✅ Preload script loaded successfully');
console.log('📦 Electron version:', process.versions.electron);
console.log('🔧 Node version:', process.versions.node);
console.log('🌐 Chrome version:', process.versions.chrome);
