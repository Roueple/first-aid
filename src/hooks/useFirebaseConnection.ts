import { useState, useEffect } from 'react';
import { connectionMonitor, ConnectionStatus } from '../utils/connectionMonitor';

/**
 * React hook to monitor Firebase connection status
 * @returns Object containing connection status and utility functions
 */
export const useFirebaseConnection = () => {
  const [status, setStatus] = useState<ConnectionStatus>(
    connectionMonitor.getStatus()
  );
  const [lastChecked, setLastChecked] = useState<Date | null>(
    connectionMonitor.getLastChecked()
  );

  useEffect(() => {
    // Subscribe to connection status changes
    const unsubscribe = connectionMonitor.subscribe((newStatus) => {
      setStatus(newStatus);
      setLastChecked(connectionMonitor.getLastChecked());
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const checkConnection = async () => {
    const newStatus = await connectionMonitor.checkConnection();
    return newStatus;
  };

  return {
    status,
    lastChecked,
    isConnected: status === 'connected',
    isDisconnected: status === 'disconnected',
    isConnecting: status === 'connecting',
    checkConnection,
  };
};
