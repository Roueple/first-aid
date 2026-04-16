import { onSnapshot, doc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export interface ConnectionMonitor {
  status: ConnectionStatus;
  lastChecked: Date | null;
  listeners: Set<(status: ConnectionStatus) => void>;
}

class FirebaseConnectionMonitor {
  private status: ConnectionStatus = 'connecting'; // Start in connecting state until auth is ready
  private lastChecked: Date | null = null;
  private listeners = new Set<(status: ConnectionStatus) => void>();
  private unsubscribe: (() => void) | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private authReady: boolean = false;

  constructor() {
    this.startMonitoring();
  }

  /**
   * Mark auth as ready - should be called after authentication is complete
   */
  setAuthReady(ready: boolean) {
    this.authReady = ready;
    if (ready) {
      // Force a connection check now that auth is ready
      this.performConnectionCheck();
    }
  }

  /**
   * Start monitoring Firebase connection status
   */
  private startMonitoring() {
    // Monitor Firestore connection using a special .info path
    // Since Firestore doesn't have a direct connection status API,
    // we'll use a combination of online/offline events and periodic checks
    
    // Listen to browser online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Perform periodic connection checks
    this.performConnectionCheck();
    this.checkInterval = setInterval(() => {
      this.performConnectionCheck();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Perform a connection check by attempting to read from Firestore
   */
  private async performConnectionCheck() {
    // Skip auth-required checks if user isn't logged in yet
    // This prevents false "disconnected" status before login
    if (!auth.currentUser) {
      console.log('🔌 Connection check skipped - waiting for auth');
      // Keep current status (connecting or previous state)
      return;
    }

    try {
      // Try to read a document to verify connection
      // We'll use a lightweight operation
      const testDocRef = doc(db, '_connection_test_', 'status');

      // Set a timeout for the check
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Connection check timeout')), 5000);
      });

      const checkPromise = new Promise<boolean>((resolve) => {
        const unsubscribe = onSnapshot(
          testDocRef,
          () => {
            unsubscribe();
            resolve(true);
          },
          (error) => {
            unsubscribe();
            // Permission denied means Firestore is reachable but auth might have issues
            // This shouldn't mark as disconnected for permission errors
            const isPermissionError = error?.code === 'permission-denied';
            resolve(isPermissionError ? true : false);
          }
        );
      });

      const result = await Promise.race([checkPromise, timeoutPromise]);
      this.updateStatus(result ? 'connected' : 'disconnected');
    } catch (error) {
      // Only mark as disconnected for actual network/timeout errors
      console.error('🔌 Connection check failed:', error);
      this.updateStatus('disconnected');
    }
  }

  /**
   * Handle browser online event
   */
  private handleOnline = () => {
    this.updateStatus('connecting');
    this.performConnectionCheck();
  };

  /**
   * Handle browser offline event
   */
  private handleOffline = () => {
    this.updateStatus('disconnected');
  };

  /**
   * Update connection status and notify listeners
   */
  private updateStatus(newStatus: ConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.lastChecked = new Date();
      this.notifyListeners();
    }
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.status);
      } catch (error) {
        console.error('Error in connection status listener:', error);
      }
    });
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Get last checked timestamp
   */
  getLastChecked(): Date | null {
    return this.lastChecked;
  }

  /**
   * Subscribe to connection status changes
   */
  subscribe(listener: (status: ConnectionStatus) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately notify with current status
    listener(this.status);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.status === 'connected';
  }

  /**
   * Manually trigger a connection check
   */
  async checkConnection(): Promise<ConnectionStatus> {
    await this.performConnectionCheck();
    return this.status;
  }

  /**
   * Clean up resources
   */
  destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.listeners.clear();
  }
}

// Export singleton instance
export const connectionMonitor = new FirebaseConnectionMonitor();

// Export hook for React components
export const useConnectionStatus = (
  callback: (status: ConnectionStatus) => void
): (() => void) => {
  return connectionMonitor.subscribe(callback);
};
