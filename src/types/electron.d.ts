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
    };
  }
}

export {};
