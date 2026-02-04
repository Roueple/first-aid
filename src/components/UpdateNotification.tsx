import { useEffect, useState } from 'react';

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

type UpdateState = 
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export function UpdateNotification() {
  const [updateState, setUpdateState] = useState<UpdateState>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('');

  useEffect(() => {
    // Get current version
    if (window.electron?.getAppVersion) {
      window.electron.getAppVersion().then(setCurrentVersion);
    }

    // Listen for update events
    if (window.electron?.onUpdateAvailable) {
      window.electron.onUpdateAvailable((info: UpdateInfo) => {
        setUpdateState('available');
        setUpdateInfo(info);
      });
    }

    if (window.electron?.onUpdateDownloadProgress) {
      window.electron.onUpdateDownloadProgress((progress: DownloadProgress) => {
        setUpdateState('downloading');
        setDownloadProgress(progress);
      });
    }

    if (window.electron?.onUpdateDownloaded) {
      window.electron.onUpdateDownloaded((info: UpdateInfo) => {
        setUpdateState('downloaded');
        setUpdateInfo(info);
      });
    }

    if (window.electron?.onUpdateError) {
      window.electron.onUpdateError((err: { message: string }) => {
        setUpdateState('error');
        setError(err.message);
      });
    }
  }, []);

  const handleCheckForUpdates = async () => {
    setUpdateState('checking');
    setError(null);
    
    if (window.electron?.checkForUpdates) {
      const result = await window.electron.checkForUpdates();
      if (result.error) {
        setUpdateState('error');
        setError(result.error);
      } else if (!result.available) {
        setUpdateState('idle');
        // Show "up to date" message briefly
        setTimeout(() => setUpdateState('idle'), 3000);
      }
    }
  };

  const handleDownloadUpdate = async () => {
    if (window.electron?.downloadUpdate) {
      const result = await window.electron.downloadUpdate();
      if (!result.success) {
        setUpdateState('error');
        setError(result.error || 'Failed to download update');
      }
    }
  };

  const handleInstallUpdate = () => {
    if (window.electron?.installUpdate) {
      window.electron.installUpdate();
    }
  };

  const handleDismiss = () => {
    setUpdateState('idle');
    setError(null);
  };

  // Don't show anything if idle
  if (updateState === 'idle') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        {/* Checking */}
        {updateState === 'checking' && (
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-700">Checking for updates...</span>
          </div>
        )}

        {/* Update Available */}
        {updateState === 'available' && updateInfo && (
          <div>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">Update Available</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Version {updateInfo.version} is available
                  {currentVersion && ` (current: ${currentVersion})`}
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleDownloadUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Download Update
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
              >
                Later
              </button>
            </div>
          </div>
        )}

        {/* Downloading */}
        {updateState === 'downloading' && downloadProgress && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Downloading Update</h3>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress.percent}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              {downloadProgress.percent.toFixed(1)}% 
              {' '}({(downloadProgress.transferred / 1024 / 1024).toFixed(1)} MB / {(downloadProgress.total / 1024 / 1024).toFixed(1)} MB)
            </p>
          </div>
        )}

        {/* Downloaded */}
        {updateState === 'downloaded' && updateInfo && (
          <div>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">Update Ready</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Version {updateInfo.version} has been downloaded
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstallUpdate}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
              >
                Restart & Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
              >
                Install on Exit
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {updateState === 'error' && (
          <div>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-red-900">Update Error</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <button
              onClick={handleCheckForUpdates}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium mt-2"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
