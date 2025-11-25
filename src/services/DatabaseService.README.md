# DatabaseService

## Overview

The `DatabaseService` is a generic base class that provides CRUD operations, query building with filters and sorting, error handling with retry logic, and connection status checking for Firestore collections.

## Features

- **CRUD Operations**: Create, Read, Update, Delete operations
- **Query Building**: Flexible query building with filters, sorting, and pagination
- **Error Handling**: Comprehensive error mapping and user-friendly error messages
- **Retry Logic**: Automatic retry with exponential backoff for transient errors
- **Connection Monitoring**: Real-time connection status checking
- **Type Safety**: Full TypeScript support with generics

## Usage

### Basic Usage

```typescript
import { DatabaseService } from './services';
import { Finding } from './types';

// Create a service for the findings collection
const findingsService = new DatabaseService<Finding>('findings');

// Create a document
const id = await findingsService.create({
  title: 'Security Issue',
  description: 'Found vulnerability',
  severity: 'High',
  status: 'Open',
  // ... other fields
});

// Get a document by ID
const finding = await findingsService.getById(id);

// Update a document
await findingsService.update(id, {
  status: 'In Progress',
});

// Delete a document
await findingsService.delete(id);
```

### Query Building

```typescript
// Get all documents with filters
const findings = await findingsService.getAll({
  filters: [
    { field: 'severity', operator: '==', value: 'High' },
    { field: 'status', operator: '==', value: 'Open' },
  ],
  sorts: [
    { field: 'dateCreated', direction: 'desc' },
  ],
  limit: 10,
});

// Count documents
const count = await findingsService.count({
  filters: [
    { field: 'severity', operator: '==', value: 'Critical' },
  ],
});

// Check if document exists
const exists = await findingsService.exists('some-id');
```

### Pagination

```typescript
import { Pagination } from './types';

const pagination: Pagination = {
  page: 1,
  pageSize: 20,
  sortBy: 'dateCreated',
  sortDirection: 'desc',
};

const result = await findingsService.getPaginated(pagination, {
  filters: [
    { field: 'status', operator: '==', value: 'Open' },
  ],
});

console.log(result.items); // Array of findings
console.log(result.total); // Total count
console.log(result.hasNextPage); // Boolean
console.log(result.hasPreviousPage); // Boolean
```

### Connection Status Monitoring

```typescript
// Get current connection status
const status = findingsService.getConnectionStatus();
console.log(status); // 'connected' | 'disconnected' | 'connecting'

// Check if connected
if (findingsService.isConnected()) {
  // Perform operations
}

// Subscribe to connection status changes
const unsubscribe = findingsService.onConnectionStatusChange((status) => {
  console.log('Connection status changed:', status);
});

// Later, unsubscribe
unsubscribe();
```

### Custom Retry Configuration

```typescript
const service = new DatabaseService<Finding>('findings', {
  maxRetries: 5,
  initialDelayMs: 2000,
  maxDelayMs: 30000,
  backoffMultiplier: 3,
});
```

### Error Handling

```typescript
import { DatabaseError, DatabaseErrorType } from './services';

try {
  await findingsService.getById('some-id');
} catch (error) {
  if (error instanceof DatabaseError) {
    switch (error.type) {
      case DatabaseErrorType.NOT_FOUND:
        console.log('Document not found');
        break;
      case DatabaseErrorType.PERMISSION_DENIED:
        console.log('Permission denied');
        break;
      case DatabaseErrorType.NETWORK_ERROR:
        console.log('Network error, please try again');
        break;
      case DatabaseErrorType.CONNECTION_ERROR:
        console.log('No connection available');
        break;
      default:
        console.log('Unknown error:', error.message);
    }
  }
}
```

## API Reference

### Constructor

```typescript
constructor(
  collectionName: string,
  retryConfig?: Partial<RetryConfig>
)
```

### Methods

#### CRUD Operations

- `create(data: Partial<T>): Promise<string>` - Create a new document
- `getById(id: string): Promise<(T & { id: string }) | null>` - Get document by ID
- `update(id: string, data: Partial<T>): Promise<void>` - Update document
- `delete(id: string): Promise<void>` - Delete document
- `exists(id: string): Promise<boolean>` - Check if document exists

#### Query Operations

- `getAll(options?: QueryOptions): Promise<(T & { id: string })[]>` - Get all documents
- `getPaginated(pagination: Pagination, options?: QueryOptions): Promise<PaginatedResult<T & { id: string }>>` - Get paginated documents
- `count(options?: QueryOptions): Promise<number>` - Count documents

#### Connection Status

- `getConnectionStatus(): ConnectionStatus` - Get current connection status
- `isConnected(): boolean` - Check if connected
- `onConnectionStatusChange(callback: (status: ConnectionStatus) => void): () => void` - Subscribe to status changes

## Types

### QueryOptions

```typescript
interface QueryOptions {
  filters?: QueryFilter[];
  sorts?: QuerySort[];
  limit?: number;
  startAfterDoc?: DocumentSnapshot;
}
```

### QueryFilter

```typescript
interface QueryFilter {
  field: string;
  operator: WhereFilterOp; // '==', '!=', '<', '<=', '>', '>=', 'in', 'not-in', etc.
  value: any;
}
```

### QuerySort

```typescript
interface QuerySort {
  field: string;
  direction: 'asc' | 'desc';
}
```

### RetryConfig

```typescript
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}
```

Default values:
- `maxRetries`: 3
- `initialDelayMs`: 1000
- `maxDelayMs`: 10000
- `backoffMultiplier`: 2

## Error Types

- `NOT_FOUND` - Document not found
- `PERMISSION_DENIED` - Permission denied
- `NETWORK_ERROR` - Network or connectivity error
- `VALIDATION_ERROR` - Validation error
- `CONNECTION_ERROR` - No database connection
- `UNKNOWN_ERROR` - Unknown error

## Retry Behavior

The service automatically retries operations that fail due to transient errors (network issues, timeouts). It uses exponential backoff to avoid overwhelming the server.

**Errors that trigger retry:**
- Network errors (`unavailable`, `deadline-exceeded`)
- Timeout errors

**Errors that do NOT trigger retry:**
- Permission denied
- Not found
- Validation errors
- Invalid arguments

## Best Practices

1. **Use specific types**: Always provide a type parameter for type safety
   ```typescript
   const service = new DatabaseService<Finding>('findings');
   ```

2. **Handle errors appropriately**: Catch and handle `DatabaseError` instances
   ```typescript
   try {
     await service.create(data);
   } catch (error) {
     if (error instanceof DatabaseError) {
       // Handle specific error types
     }
   }
   ```

3. **Monitor connection status**: Subscribe to connection changes for better UX
   ```typescript
   service.onConnectionStatusChange((status) => {
     if (status === 'disconnected') {
       showOfflineMessage();
     }
   });
   ```

4. **Use pagination for large datasets**: Always paginate when displaying lists
   ```typescript
   const result = await service.getPaginated(pagination);
   ```

5. **Optimize queries**: Use filters and limits to reduce data transfer
   ```typescript
   const findings = await service.getAll({
     filters: [{ field: 'status', operator: '==', value: 'Open' }],
     limit: 100,
   });
   ```

## Requirements Validation

This implementation satisfies the following requirements:

- **3.1**: Paginated display of findings
- **3.2**: Filtering by severity, status, location, category
- **3.3**: Text search functionality
- **3.4**: Edit and save changes with validation
- **3.5**: Sorting by various fields
- **12.1**: Error handling with user-friendly messages
- **12.2**: Retry logic for failed operations
- **12.5**: Network connectivity handling

## Testing

The service includes comprehensive unit tests covering:
- Connection status monitoring
- Error handling and mapping
- CRUD operations
- Query building with filters, sorts, and limits
- Pagination
- Retry logic with exponential backoff

Run tests with:
```bash
npm test src/services/__tests__/DatabaseService.test.ts
```
