export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

export interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export interface UpdateCheckResult {
  available: boolean;
  version?: string;
  message?: string;
  error?: string;
}

export interface UpdateDownloadResult {
  success: boolean;
  error?: string;
}

declare global {
  interface Window {
    electron?: {
      platform: string;
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
      // Auto-updater functions
      checkForUpdates: () => Promise<UpdateCheckResult>;
      downloadUpdate: () => Promise<UpdateDownloadResult>;
      installUpdate: () => void;
      getAppVersion: () => Promise<string>;
      // Auto-updater event listeners
      onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
      onUpdateDownloadProgress: (callback: (progress: DownloadProgress) => void) => void;
      onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void;
      onUpdateError: (callback: (error: { message: string }) => void) => void;
    };
  }
}

export {};
