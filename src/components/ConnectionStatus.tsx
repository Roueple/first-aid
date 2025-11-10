import { useFirebaseConnection } from '../hooks/useFirebaseConnection';

export const ConnectionStatus = () => {
  const { status, isConnected, isDisconnected, lastChecked } = useFirebaseConnection();

  if (isConnected) {
    return null; // Don't show anything when connected
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium ${
        isDisconnected
          ? 'bg-red-600 text-white'
          : 'bg-yellow-500 text-gray-900'
      }`}
    >
      {isDisconnected && (
        <span>
          ⚠️ No connection to Firebase. Some features may not work.
          {lastChecked && (
            <span className="ml-2 text-xs opacity-75">
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
        </span>
      )}
      {status === 'connecting' && <span>🔄 Connecting to Firebase...</span>}
    </div>
  );
};
