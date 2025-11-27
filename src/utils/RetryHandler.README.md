# RetryHandler - Retry Logic and Operation Queue

## Overview

The RetryHandler provides comprehensive retry logic with exponential backoff for failed operations, specifically designed to handle network errors, AI service failures, and offline scenarios. It includes an operation queue that stores operations when offline and executes them when connection is restored.

## Requirements

- **Requirement 12.2**: Implement retry mechanism for failed operations with exponential backoff
- **Requirement 12.5**: Queue operations when offline and sync when connection restored

## Features

### 1. Exponential Backoff Retry

- Automatically retries failed operations with increasing delays
- Configurable retry parameters (max retries, initial delay, max delay, backoff multiplier)
- Adds jitter (±20%) to prevent thundering herd problem
- Smart error detection to avoid retrying non-recoverable errors

### 2. Operation Queue

- Stores operations in memory when offline
- Automatically executes queued operations when connection is restored
- FIFO (First In, First Out) execution order
- Operation status tracking (pending, executing, completed, failed, cancelled)
- Maximum queue size limit (100 operations)

### 3. Error Detection

- Network error detection (connection failures, timeouts, unavailable)
- AI service error detection (rate limits, service unavailable, server errors)
- Non-retryable error detection (permission denied, not found, validation errors)

## Usage

### Basic Retry

```typescript
import { executeWithRetry } from '../utils/RetryHandler';

// Execute with default retry options
const result = await executeWithRetry(async () => {
  return await someAsyncOperation();
});
```

### Custom Retry Options

```typescript
import { executeWithRetry } from '../utils/RetryHandler';

const result = await executeWithRetry(
  async () => {
    return await someAsyncOperation();
  },
  {
    maxRetries: 5,
    initialDelayMs: 2000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    onRetry: (error, attempt, delay) => {
      console.log(`Retry attempt ${attempt} after ${delay}ms`);
    },
  }
);
```

### Network Operations

```typescript
import { executeWithRetry, NETWORK_RETRY_OPTIONS } from '../utils/RetryHandler';

const result = await executeWithRetry(
  async () => {
    return await fetchDataFromAPI();
  },
  NETWORK_RETRY_OPTIONS
);
```

### AI Service Operations

```typescript
import { executeWithRetry, AI_SERVICE_RETRY_OPTIONS } from '../utils/RetryHandler';

const result = await executeWithRetry(
  async () => {
    return await callAIService();
  },
  AI_SERVICE_RETRY_OPTIONS
);
```

### Operation Queue

```typescript
import { operationQueue } from '../utils/RetryHandler';

// Enqueue an operation
const operationId = operationQueue.enqueue(
  async () => {
    return await saveData();
  },
  {
    description: 'Save user data',
    userId: '123',
  }
);

// Check operation status
const status = operationQueue.getOperationStatus(operationId);
console.log(status?.status); // PENDING, EXECUTING, COMPLETED, FAILED

// Cancel a pending operation
operationQueue.cancel(operationId);

// Clear completed operations
operationQueue.clearCompleted();

// Subscribe to queue changes
const unsubscribe = operationQueue.subscribe((operations) => {
  console.log(`Queue has ${operations.length} operations`);
});
```

### React Hook

```typescript
import { useRetryHandler } from '../hooks/useRetryHandler';

function MyComponent() {
  const {
    retry,
    retryNetwork,
    retryAI,
    queueOperation,
    queuedOperations,
    pendingCount,
    isOnline,
  } = useRetryHandler();

  const handleSave = async () => {
    try {
      // Retry with default options
      await retry(async () => {
        return await saveData();
      });
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const handleNetworkRequest = async () => {
    try {
      // Retry with network-specific options
      await retryNetwork(async () => {
        return await fetchData();
      });
    } catch (error) {
      console.error('Network request failed:', error);
    }
  };

  const handleOfflineOperation = () => {
    // Queue operation if offline
    const operationId = queueOperation(
      async () => {
        return await saveData();
      },
      { description: 'Save data' }
    );
  };

  return (
    <div>
      <p>Online: {isOnline ? 'Yes' : 'No'}</p>
      <p>Pending operations: {pendingCount}</p>
      <button onClick={handleSave}>Save</button>
      <button onClick={handleNetworkRequest}>Fetch</button>
      <button onClick={handleOfflineOperation}>Queue Operation</button>
    </div>
  );
}
```

### UI Component

```typescript
import { OperationQueueStatus } from '../components/OperationQueueStatus';

function App() {
  return (
    <div>
      {/* Your app content */}
      
      {/* Shows queued operations in bottom-right corner */}
      <OperationQueueStatus />
    </div>
  );
}
```

## Configuration

### Default Retry Options

```typescript
{
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
}
```

### Network Retry Options

```typescript
{
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  shouldRetry: (error) => isNetworkError(error),
}
```

### AI Service Retry Options

```typescript
{
  maxRetries: 3,
  initialDelayMs: 2000,
  maxDelayMs: 15000,
  backoffMultiplier: 2.5,
  shouldRetry: (error) => isAIServiceError(error),
}
```

## Exponential Backoff Calculation

The delay between retries is calculated using exponential backoff with jitter:

```
delay = min(initialDelay * (backoffMultiplier ^ attempt), maxDelay)
jitter = delay * 0.2 * (random - 0.5)
finalDelay = delay + jitter
```

Example with default options:
- Attempt 1: ~1000ms (±200ms jitter)
- Attempt 2: ~2000ms (±400ms jitter)
- Attempt 3: ~4000ms (±800ms jitter)

## Error Detection

### Network Errors (Retryable)

- Error codes: `network-request-failed`, `unavailable`, `deadline-exceeded`
- Messages containing: `network`, `connection`, `offline`, `timeout`

### AI Service Errors (Retryable)

- Error codes: `ai-service-unavailable`, `rate-limit-exceeded`
- HTTP status: 429, 500, 502, 503, 504
- Messages containing: `OpenAI`, `Gemini`, `AI service`, `rate limit`

### Non-Retryable Errors

- Error codes: `permission-denied`, `not-found`, `invalid-argument`, `failed-precondition`, `unauthenticated`
- HTTP status: 400, 401, 403, 404

## Operation Queue Behavior

### When Offline

1. Operations are added to the queue with PENDING status
2. User is notified that operation will be executed when online
3. Queue is persisted in memory (not localStorage)

### When Coming Online

1. Queue automatically starts processing pending operations
2. Operations are executed in FIFO order
3. Each operation is retried with network retry options
4. User is notified of queue processing progress

### Operation Lifecycle

```
PENDING → EXECUTING → COMPLETED (removed after 5s)
                   → FAILED (stays in queue)
                   → CANCELLED (removed immediately)
```

## Best Practices

1. **Use appropriate retry options**: Choose `NETWORK_RETRY_OPTIONS` for network operations and `AI_SERVICE_RETRY_OPTIONS` for AI service calls

2. **Provide operation metadata**: Include descriptive metadata when queuing operations for better user experience

3. **Handle errors gracefully**: Always wrap retry operations in try-catch blocks

4. **Monitor queue size**: Check `pendingCount` to inform users about queued operations

5. **Clear completed operations**: Periodically call `clearCompleted()` to prevent memory buildup

6. **Use the React hook**: Prefer `useRetryHandler` hook in React components for automatic setup

7. **Show queue status**: Include `OperationQueueStatus` component to give users visibility into queued operations

## Testing

The RetryHandler includes comprehensive tests covering:

- Successful operations on first attempt
- Retry on recoverable errors
- No retry on non-recoverable errors
- Exponential backoff timing
- Custom retry options
- Operation queue functionality
- Online/offline behavior
- Error detection functions

Run tests:
```bash
npm test src/utils/__tests__/RetryHandler.test.ts
```

## Integration with ErrorHandler

The RetryHandler works seamlessly with the ErrorHandler:

```typescript
import { errorHandler } from '../utils/ErrorHandler';
import { executeWithRetry } from '../utils/RetryHandler';

try {
  await executeWithRetry(async () => {
    return await someOperation();
  });
} catch (error) {
  // ErrorHandler will categorize and display user-friendly message
  await errorHandler.handle(error, {
    operation: 'someOperation',
    userId: currentUser.id,
  });
}
```

## Performance Considerations

- **Memory usage**: Queue stores operations in memory (max 100)
- **Retry delays**: Total retry time can be significant (up to 30s for network operations)
- **Concurrent operations**: Queue processes operations sequentially, not in parallel
- **Jitter**: Adds randomness to prevent thundering herd, but increases total time slightly

## Future Enhancements

- Persistent queue storage (localStorage/IndexedDB)
- Parallel operation execution
- Priority queue support
- Retry budget/circuit breaker pattern
- Telemetry and monitoring integration
