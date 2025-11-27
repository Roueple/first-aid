/**
 * RetryHandler Usage Examples
 * 
 * This file demonstrates various ways to use the RetryHandler
 * in different scenarios throughout the FIRST-AID application.
 */

import React, { useState } from 'react';
import {
  executeWithRetry,
  operationQueue,
  NETWORK_RETRY_OPTIONS,
  AI_SERVICE_RETRY_OPTIONS,
} from './RetryHandler';
import { useRetryHandler } from '../hooks/useRetryHandler';
import { errorHandler } from './ErrorHandler';
import findingsService from '../services/FindingsService';

// ============================================================================
// Example 1: Basic Retry with Default Options
// ============================================================================

async function basicRetryExample() {
  try {
    const result = await executeWithRetry(async () => {
      // Any async operation
      const response = await fetch('/api/data');
      return response.json();
    });
    
    console.log('Success:', result);
  } catch (error) {
    console.error('Failed after retries:', error);
  }
}

// ============================================================================
// Example 2: Network Request with Custom Retry Options
// ============================================================================

async function networkRequestExample() {
  try {
    const data = await executeWithRetry(
      async () => {
        const response = await fetch('/api/findings');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      },
      {
        ...NETWORK_RETRY_OPTIONS,
        onRetry: (error, attempt, delay) => {
          console.log(`Network request failed. Retry ${attempt} in ${delay}ms`);
        },
      }
    );
    
    return data;
  } catch (error) {
    await errorHandler.handle(error, {
      operation: 'fetchFindings',
      metadata: { endpoint: '/api/findings' },
    });
    throw error;
  }
}

// ============================================================================
// Example 3: AI Service Call with Retry
// ============================================================================

async function aiServiceExample(query: string) {
  try {
    const response = await executeWithRetry(
      async () => {
        // Simulated AI service call
        const result = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        
        if (!result.ok) {
          const error: any = new Error('AI service error');
          error.status = result.status;
          throw error;
        }
        
        return result.json();
      },
      {
        ...AI_SERVICE_RETRY_OPTIONS,
        onRetry: (error, attempt, delay) => {
          console.log(`AI service retry ${attempt}/${AI_SERVICE_RETRY_OPTIONS.maxRetries}`);
          
          // Show user notification on retry
          errorHandler.info(
            `AI service is busy. Retrying (${attempt}/${AI_SERVICE_RETRY_OPTIONS.maxRetries})...`,
            3000
          );
        },
      }
    );
    
    return response;
  } catch (error) {
    // Fallback to basic search if AI fails
    errorHandler.warning(
      'AI service unavailable. Using basic search instead.',
      5000
    );
    
    // Implement fallback logic here
    return { fallback: true };
  }
}

// ============================================================================
// Example 4: Database Operation with Retry
// ============================================================================

async function databaseOperationExample(findingId: string) {
  try {
    // FindingsService already has retry logic built in
    const finding = await findingsService.getFindingById(findingId);
    
    if (!finding) {
      throw new Error('Finding not found');
    }
    
    return finding;
  } catch (error) {
    await errorHandler.handle(error, {
      operation: 'getFinding',
      resourceId: findingId,
    });
    throw error;
  }
}

// ============================================================================
// Example 5: Queue Operation When Offline
// ============================================================================

async function queueOperationExample(data: any) {
  // Check if online
  if (!navigator.onLine) {
    // Queue the operation
    const operationId = operationQueue.enqueue(
      async () => {
        return await findingsService.createFinding(data);
      },
      {
        description: 'Create finding',
        findingTitle: data.findingTitle,
      }
    );
    
    errorHandler.info(
      'You are offline. Operation will be executed when connection is restored.',
      5000
    );
    
    return { queued: true, operationId };
  }
  
  // If online, execute immediately with retry
  try {
    const findingId = await executeWithRetry(
      async () => {
        return await findingsService.createFinding(data);
      },
      NETWORK_RETRY_OPTIONS
    );
    
    errorHandler.success('Finding created successfully', 3000);
    return { queued: false, findingId };
  } catch (error) {
    await errorHandler.handle(error, {
      operation: 'createFinding',
      metadata: { title: data.findingTitle },
    });
    throw error;
  }
}

// ============================================================================
// Example 6: React Component with Retry Handler Hook
// ============================================================================

export function SaveFindingButton({ findingData }: { findingData: any }) {
  const [isSaving, setIsSaving] = useState(false);
  const { retryNetwork, queueOperation, isOnline, pendingCount } = useRetryHandler();

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      if (isOnline) {
        // Execute with retry if online
        await retryNetwork(async () => {
          return await findingsService.createFinding(findingData);
        });
        
        errorHandler.success('Finding saved successfully', 3000);
      } else {
        // Queue if offline
        queueOperation(
          async () => {
            return await findingsService.createFinding(findingData);
          },
          {
            description: 'Save finding',
            findingTitle: findingData.findingTitle,
          }
        );
      }
    } catch (error) {
      await errorHandler.handle(error as Error, {
        operation: 'saveFinding',
        metadata: { title: findingData.findingTitle },
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Save Finding'}
        {!isOnline && ' (Offline)'}
      </button>
      
      {pendingCount > 0 && (
        <p className="text-sm text-gray-600 mt-2">
          {pendingCount} operation{pendingCount > 1 ? 's' : ''} queued
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Example 7: Batch Operations with Retry
// ============================================================================

async function batchOperationsExample(items: any[]) {
  const results: Array<{ item: any; result: string; success: boolean }> = [];
  const errors: Array<{ item: any; error: any; success: boolean }> = [];
  
  for (const item of items) {
    try {
      const result = await executeWithRetry(
        async () => {
          return await findingsService.createFinding(item);
        },
        {
          ...NETWORK_RETRY_OPTIONS,
          onRetry: (error, attempt) => {
            console.log(`Retrying item ${item.findingTitle} (attempt ${attempt})`);
          },
        }
      );
      
      results.push({ item, result, success: true });
    } catch (error) {
      errors.push({ item, error, success: false });
      
      // Log error but continue with other items
      console.error(`Failed to process item ${item.findingTitle}:`, error);
    }
  }
  
  // Show summary
  errorHandler.info(
    `Processed ${results.length} items successfully, ${errors.length} failed`,
    5000
  );
  
  return { results, errors };
}

// ============================================================================
// Example 8: Conditional Retry Based on Error Type
// ============================================================================

async function conditionalRetryExample() {
  try {
    const result = await executeWithRetry(
      async () => {
        const response = await fetch('/api/data');
        
        if (response.status === 429) {
          // Rate limit - should retry
          const error: any = new Error('Rate limit exceeded');
          error.code = 'rate-limit-exceeded';
          throw error;
        }
        
        if (response.status === 403) {
          // Permission denied - should not retry
          const error: any = new Error('Permission denied');
          error.code = 'permission-denied';
          throw error;
        }
        
        return response.json();
      },
      {
        maxRetries: 5,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
        shouldRetry: (error: any, attempt: number) => {
          // Custom retry logic
          if (error.code === 'permission-denied') {
            return false; // Don't retry permission errors
          }
          
          if (error.code === 'rate-limit-exceeded') {
            return attempt < 5; // Retry up to 5 times for rate limits
          }
          
          // Default: retry network errors
          return error.code === 'unavailable' || error.message.includes('network');
        },
      }
    );
    
    return result;
  } catch (error) {
    await errorHandler.handle(error as Error, {
      operation: 'conditionalRetry',
    });
    throw error;
  }
}

// ============================================================================
// Example 9: Monitor Queue Status
// ============================================================================

export function QueueMonitor() {
  const { queuedOperations, clearCompleted, cancelOperation } = useRetryHandler();
  
  const pendingOps = queuedOperations.filter((op) => op.status === 'PENDING');
  const executingOps = queuedOperations.filter((op) => op.status === 'EXECUTING');
  const failedOps = queuedOperations.filter((op) => op.status === 'FAILED');
  
  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="font-semibold mb-2">Operation Queue Status</h3>
      
      <div className="space-y-2">
        <div>Pending: {pendingOps.length}</div>
        <div>Executing: {executingOps.length}</div>
        <div>Failed: {failedOps.length}</div>
      </div>
      
      {failedOps.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium text-red-600">Failed Operations:</h4>
          {failedOps.map((op) => (
            <div key={op.id} className="text-sm text-gray-600">
              {op.metadata?.description || 'Unknown operation'}
              <br />
              Error: {op.error?.message}
            </div>
          ))}
        </div>
      )}
      
      {queuedOperations.length > 0 && (
        <button
          onClick={clearCompleted}
          className="mt-4 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        >
          Clear Completed
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Example 10: Integration with Error Handler
// ============================================================================

async function integratedExample() {
  try {
    const result = await executeWithRetry(
      async () => {
        // Your operation here
        return await fetch('/api/data').then((r) => r.json());
      },
      {
        ...NETWORK_RETRY_OPTIONS,
        onRetry: (error, attempt, delay) => {
          // Show retry notification
          errorHandler.info(
            `Connection issue. Retrying (${attempt}/${NETWORK_RETRY_OPTIONS.maxRetries})...`,
            delay
          );
        },
      }
    );
    
    // Success notification
    errorHandler.success('Operation completed successfully', 3000);
    
    return result;
  } catch (error) {
    // Error handler will categorize and show appropriate message
    await errorHandler.handle(error as Error, {
      operation: 'integratedExample',
      metadata: { endpoint: '/api/data' },
    });
    
    throw error;
  }
}

// ============================================================================
// Export all examples
// ============================================================================

export const examples = {
  basicRetryExample,
  networkRequestExample,
  aiServiceExample,
  databaseOperationExample,
  queueOperationExample,
  batchOperationsExample,
  conditionalRetryExample,
  integratedExample,
};
