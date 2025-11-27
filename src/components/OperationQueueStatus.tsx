/**
 * OperationQueueStatus - Component to display queued operations status
 * 
 * Shows pending, executing, and failed operations with ability to cancel or retry.
 */

import React from 'react';
import { useRetryHandler } from '../hooks/useRetryHandler';
import { OperationStatus } from '../utils/RetryHandler';

/**
 * OperationQueueStatus component
 */
export const OperationQueueStatus: React.FC = () => {
  const {
    queuedOperations,
    pendingCount,
    isOnline,
    cancelOperation,
    clearCompleted,
  } = useRetryHandler();

  // Don't show if queue is empty
  if (queuedOperations.length === 0) {
    return null;
  }

  const pendingOps = queuedOperations.filter((op) => op.status === OperationStatus.PENDING);
  const executingOps = queuedOperations.filter((op) => op.status === OperationStatus.EXECUTING);
  const failedOps = queuedOperations.filter((op) => op.status === OperationStatus.FAILED);
  const completedOps = queuedOperations.filter((op) => op.status === OperationStatus.COMPLETED);

  const getStatusColor = (status: OperationStatus): string => {
    switch (status) {
      case OperationStatus.PENDING:
        return 'text-yellow-600 bg-yellow-50';
      case OperationStatus.EXECUTING:
        return 'text-blue-600 bg-blue-50';
      case OperationStatus.COMPLETED:
        return 'text-green-600 bg-green-50';
      case OperationStatus.FAILED:
        return 'text-red-600 bg-red-50';
      case OperationStatus.CANCELLED:
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: OperationStatus): string => {
    switch (status) {
      case OperationStatus.PENDING:
        return '⏳';
      case OperationStatus.EXECUTING:
        return '⚙️';
      case OperationStatus.COMPLETED:
        return '✅';
      case OperationStatus.FAILED:
        return '❌';
      case OperationStatus.CANCELLED:
        return '🚫';
      default:
        return '❓';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">Operation Queue</h3>
          {!isOnline && (
            <span className="px-2 py-1 text-xs font-medium text-orange-600 bg-orange-50 rounded">
              Offline
            </span>
          )}
        </div>
        {(completedOps.length > 0 || failedOps.length > 0) && (
          <button
            onClick={clearCompleted}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Clear
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {pendingCount > 0 && (
              <span className="font-medium text-yellow-600">
                {pendingCount} pending
              </span>
            )}
            {executingOps.length > 0 && (
              <span className="font-medium text-blue-600 ml-2">
                {executingOps.length} executing
              </span>
            )}
            {failedOps.length > 0 && (
              <span className="font-medium text-red-600 ml-2">
                {failedOps.length} failed
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Operations List */}
      <div className="max-h-96 overflow-y-auto">
        {queuedOperations.map((op) => (
          <div
            key={op.id}
            className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{getStatusIcon(op.status)}</span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(
                      op.status
                    )}`}
                  >
                    {op.status}
                  </span>
                </div>
                
                {op.metadata?.description && (
                  <p className="text-sm text-gray-900 mb-1">
                    {op.metadata.description}
                  </p>
                )}
                
                <div className="text-xs text-gray-500">
                  <span>Created: {new Date(op.createdAt).toLocaleTimeString()}</span>
                  {op.retryCount > 0 && (
                    <span className="ml-2">Retries: {op.retryCount}</span>
                  )}
                </div>
                
                {op.error && (
                  <p className="text-xs text-red-600 mt-1">
                    Error: {op.error.message}
                  </p>
                )}
              </div>

              {/* Actions */}
              {op.status === OperationStatus.PENDING && (
                <button
                  onClick={() => cancelOperation(op.id)}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {!isOnline && pendingCount > 0 && (
        <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200">
          <p className="text-xs text-yellow-800">
            Operations will be executed when connection is restored
          </p>
        </div>
      )}
    </div>
  );
};

export default OperationQueueStatus;
