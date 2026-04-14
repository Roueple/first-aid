export interface ElectronAPI {
  platform: NodeJS.Platform;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
  ipc: {
    send: (channel: string, ...args: unknown[]) => void;
    on: (channel: string, func: (...args: unknown[]) => void) => () => void;
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  };
  checkForUpdates: () => Promise<unknown>;
  downloadUpdate: () => Promise<unknown>;
  installUpdate: () => void;
  getAppVersion: () => Promise<string>;
  onUpdateAvailable: (callback: (info: unknown) => void) => void;
  onUpdateDownloadProgress: (callback: (progress: unknown) => void) => void;
  onUpdateDownloaded: (callback: (info: unknown) => void) => void;
  onUpdateError: (callback: (error: unknown) => void) => void;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {};
