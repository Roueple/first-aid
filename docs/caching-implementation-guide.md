# Data Caching Implementation Guide

## Overview

This guide explains how to use the React Query caching system implemented in Task 17.1 to optimize data fetching and improve application performance.

## Core Concepts

### Stale-While-Revalidate Strategy

The caching system uses a "stale-while-revalidate" strategy:

1. **Fresh Data (0-5 min)**: Served immediately from cache, no network request
2. **Stale Data (5-10 min)**: Served from cache, refetched in background
3. **Expired Data (>10 min)**: Removed from cache, fresh fetch required

### Cache Configuration

```typescript
// Global defaults in App.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      gcTime: 10 * 60 * 1000,         // 10 minutes (garbage collection)
      refetchOnWindowFocus: true,     // Refetch when window gains focus
      refetchOnReconnect: true,       // Refetch when network reconnects
      retry: 3,                       // Retry failed requests 3 times
    },
  },
});
```

## Using Caching Hooks

### 1. Dashboard Statistics

**Hook**: `useDashboardStats()`

```typescript
import { useDashboardStats } from '../hooks/useDashboardStats';

function DashboardPage() {
  const { stats, loading, error, refresh, lastRefresh } = useDashboardStats();

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Last updated: {lastRefresh.toLocaleTimeString()}</p>
      
      <StatisticsCard title="Total Findings" value={stats.total} />
      <StatisticsCard title="Open Findings" value={stats.open} />
      
      <button onClick={() => refresh()}>Refresh Now</button>
    </div>
  );
}
```

**Features**:
- Cached for 5 minutes
- Auto-refreshes every 5 minutes
- Manual refresh available
- Includes trend calculations

### 2. Findings List

**Hook**: `useFindings(filters, pagination)`

```typescript
import { useFindings } from '../hooks/useFindings';

function FindingsPage() {
  const [filters, setFilters] = useState({ status: ['Open'] });
  const [page, setPage] = useState(1);

  const {
    findings,
    total,
    totalPages,
    isLoading,
    isFetching,
    refetch,
  } = useFindings(filters, { page, pageSize: 20 });

  return (
    <div>
      {/* isFetching shows background refetch */}
      {isFetching && <div className="loading-indicator">Updating...</div>}
      
      {isLoading ? (
        <Spinner />
      ) : (
        <FindingsTable data={findings} />
      )}
      
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
```

**Features**:
- Cached for 2 minutes
- Separate cache per filter/pagination combination
- Background refetch indicator
- Automatic cache invalidation on mutations

### 3. Single Finding

**Hook**: `useFinding(id)`

```typescript
import { useFinding } from '../hooks/useFindings';

function FindingDetailsPanel({ findingId }) {
  const { finding, isLoading, error, refetch } = useFinding(findingId);

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  if (!finding) return <NotFound />;

  return (
    <div>
      <h2>{finding.findingTitle}</h2>
      <p>{finding.findingDescription}</p>
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```

**Features**:
- Only fetches when ID is provided
- Cached individually
- Automatically invalidated on update

### 4. Creating Findings

**Hook**: `useCreateFinding()`

```typescript
import { useCreateFinding } from '../hooks/useFindings';

function CreateFindingForm() {
  const createFinding = useCreateFinding();

  const handleSubmit = async (data) => {
    try {
      const findingId = await createFinding.mutateAsync(data);
      console.log('Created finding:', findingId);
      // Cache automatically invalidated
      // Findings list and dashboard will refetch
    } catch (error) {
      console.error('Failed to create:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button
        type="submit"
        disabled={createFinding.isPending}
      >
        {createFinding.isPending ? 'Creating...' : 'Create Finding'}
      </button>
    </form>
  );
}
```

**Features**:
- Automatic cache invalidation
- Loading state management
- Error handling
- Optimistic updates support

### 5. Updating Findings

**Hook**: `useUpdateFinding()`

```typescript
import { useUpdateFinding } from '../hooks/useFindings';

function EditFindingDialog({ finding }) {
  const updateFinding = useUpdateFinding();

  const handleSave = async (data) => {
    try {
      await updateFinding.mutateAsync({
        id: finding.id,
        data,
      });
      // Specific finding cache invalidated
      // Findings list and dashboard refetch
      onClose();
    } catch (error) {
      console.error('Failed to update:', error);
    }
  };

  return (
    <Dialog>
      <form onSubmit={handleSave}>
        {/* form fields */}
        <button
          type="submit"
          disabled={updateFinding.isPending}
        >
          Save Changes
        </button>
      </form>
    </Dialog>
  );
}
```

**Features**:
- Invalidates specific finding
- Updates related queries
- Automatic refetch of affected data

### 6. Deleting Findings

**Hook**: `useDeleteFinding()`

```typescript
import { useDeleteFinding } from '../hooks/useFindings';

function DeleteFindingButton({ findingId }) {
  const deleteFinding = useDeleteFinding();

  const handleDelete = async () => {
    if (!confirm('Are you sure?')) return;

    try {
      await deleteFinding.mutateAsync(findingId);
      // Finding removed from cache
      // Lists and dashboard refetch
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleteFinding.isPending}
    >
      {deleteFinding.isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
```

### 7. Search Findings

**Hook**: `useSearchFindings(searchText, filters, pagination)`

```typescript
import { useSearchFindings } from '../hooks/useFindings';
import { useState } from 'react';

function SearchPage() {
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const { findings, isLoading } = useSearchFindings(
    debouncedSearch,
    undefined,
    { page: 1, pageSize: 20 }
  );

  return (
    <div>
      <input
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder="Search findings..."
      />
      
      {isLoading ? (
        <Spinner />
      ) : (
        <SearchResults findings={findings} />
      )}
    </div>
  );
}
```

**Features**:
- Shorter cache time (1 minute)
- Only fetches when search text provided
- Separate cache from regular findings

### 8. Audit Logs

**Hook**: `useAuditLogs(filters, maxResults)`

```typescript
import { useAuditLogs } from '../hooks/useAuditLogs';

function AuditLogsPage() {
  const [filters, setFilters] = useState({});
  
  const {
    logs,
    isLoading,
    exportToCSV,
    invalidate,
  } = useAuditLogs(filters, 100);

  return (
    <div>
      <h1>Audit Logs</h1>
      
      <button onClick={() => exportToCSV()}>
        Export to CSV
      </button>
      
      <button onClick={() => invalidate()}>
        Refresh Logs
      </button>
      
      {isLoading ? (
        <Spinner />
      ) : (
        <AuditLogTable logs={logs} />
      )}
    </div>
  );
}
```

**Features**:
- Cached for 3 minutes
- CSV export helper
- Manual cache invalidation
- Longer cache time (historical data)

## Advanced Usage

### Prefetching Data

Prefetch data before navigation to improve perceived performance:

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { prefetchDashboardStats } from '../utils/cacheUtils';

function NavigationMenu() {
  const queryClient = useQueryClient();

  const handleDashboardHover = () => {
    // Prefetch dashboard data on hover
    prefetchDashboardStats(queryClient);
  };

  return (
    <nav>
      <Link
        to="/dashboard"
        onMouseEnter={handleDashboardHover}
      >
        Dashboard
      </Link>
    </nav>
  );
}
```

### Manual Cache Management

```typescript
import { useQueryClient } from '@tanstack/react-query';
import {
  invalidateAllFindings,
  clearAllCache,
  logCacheStats,
} from '../utils/cacheUtils';

function AdminPanel() {
  const queryClient = useQueryClient();

  const handleBulkImport = async () => {
    // Import findings...
    
    // Invalidate all findings caches
    invalidateAllFindings(queryClient);
  };

  const handleLogout = () => {
    // Clear all cached data
    clearAllCache(queryClient);
    // Redirect to login...
  };

  const handleDebug = () => {
    // Log cache statistics
    logCacheStats(queryClient);
  };

  return (
    <div>
      <button onClick={handleBulkImport}>Bulk Import</button>
      <button onClick={handleLogout}>Logout</button>
      <button onClick={handleDebug}>Debug Cache</button>
    </div>
  );
}
```

### Optimistic Updates

Update UI immediately before server confirms:

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateFinding } from '../hooks/useFindings';

function QuickEditButton({ finding }) {
  const queryClient = useQueryClient();
  const updateFinding = useUpdateFinding();

  const handleQuickUpdate = async (newStatus) => {
    // Optimistically update cache
    queryClient.setQueryData(
      ['finding', finding.id],
      { ...finding, status: newStatus }
    );

    try {
      await updateFinding.mutateAsync({
        id: finding.id,
        data: { status: newStatus },
      });
    } catch (error) {
      // Revert on error
      queryClient.setQueryData(
        ['finding', finding.id],
        finding
      );
    }
  };

  return (
    <button onClick={() => handleQuickUpdate('Closed')}>
      Mark as Closed
    </button>
  );
}
```

### Cache Monitoring

Monitor cache performance in development:

```typescript
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getCacheStats, getCacheHitRate } from '../utils/cacheUtils';

function CacheMonitor() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const interval = setInterval(() => {
      const stats = getCacheStats(queryClient);
      const hitRate = getCacheHitRate(queryClient);
      
      console.log('Cache Stats:', stats);
      console.log('Hit Rate:', `${hitRate.toFixed(2)}%`);
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [queryClient]);

  return null;
}
```

## Best Practices

### 1. Use Appropriate Cache Times

```typescript
// Fast-changing data (search results)
staleTime: 1 * 60 * 1000  // 1 minute

// Moderate data (findings list)
staleTime: 2 * 60 * 1000  // 2 minutes

// Slow-changing data (audit logs)
staleTime: 3 * 60 * 1000  // 3 minutes

// Aggregated data (dashboard)
staleTime: 5 * 60 * 1000  // 5 minutes
```

### 2. Invalidate Related Queries

When mutating data, invalidate all related queries:

```typescript
// After creating a finding
queryClient.invalidateQueries({ queryKey: ['findings'] });
queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
```

### 3. Use Separate Cache Keys

Different filters should have different cache keys:

```typescript
// Good: Separate cache per filter
['findings', { status: ['Open'] }, { page: 1 }]
['findings', { status: ['Closed'] }, { page: 1 }]

// Bad: Same cache key for different data
['findings']
```

### 4. Handle Loading States

Show different UI for initial load vs background refetch:

```typescript
const { data, isLoading, isFetching } = useFindings();

return (
  <div>
    {isFetching && <div className="refetch-indicator">Updating...</div>}
    {isLoading ? <Spinner /> : <Table data={data} />}
  </div>
);
```

### 5. Prefetch on User Intent

Prefetch data when user shows intent to navigate:

```typescript
// On hover
<Link onMouseEnter={() => prefetch()}>Dashboard</Link>

// On focus
<input onFocus={() => prefetch()} />

// On scroll near bottom
useEffect(() => {
  if (scrollNearBottom) prefetchNextPage();
}, [scrollPosition]);
```

## Performance Tips

### 1. Reduce Firestore Reads

- Use longer cache times for static data
- Prefetch common queries on app load
- Batch related queries together

### 2. Optimize Cache Size

- Set appropriate `gcTime` to remove old data
- Use `removeStaleQueries()` periodically
- Clear cache on logout

### 3. Improve Perceived Performance

- Show cached data immediately
- Use background refetch for updates
- Implement optimistic updates
- Prefetch on user intent

### 4. Monitor Cache Effectiveness

- Track cache hit rate (target >70%)
- Monitor cache size
- Log slow queries
- Analyze refetch patterns

## Troubleshooting

### Cache Not Updating

**Problem**: Data doesn't update after mutation

**Solution**: Ensure cache invalidation:
```typescript
await mutation.mutateAsync(data);
queryClient.invalidateQueries({ queryKey: ['findings'] });
```

### Stale Data Showing

**Problem**: Old data displayed despite changes

**Solution**: Reduce `staleTime` or force refetch:
```typescript
const { refetch } = useFindings();
await refetch();
```

### Memory Issues

**Problem**: Cache growing too large

**Solution**: Reduce `gcTime` or clean stale queries:
```typescript
removeStaleQueries(queryClient);
```

### Slow Initial Load

**Problem**: First load takes too long

**Solution**: Prefetch on app startup:
```typescript
useEffect(() => {
  prefetchDashboardStats(queryClient);
  prefetchFindings(queryClient);
}, []);
```

## Conclusion

The caching system provides:
- ✅ Automatic data caching
- ✅ Stale-while-revalidate strategy
- ✅ Smart cache invalidation
- ✅ Background refetching
- ✅ Optimistic updates support
- ✅ Performance monitoring tools

Follow this guide to leverage caching effectively and improve application performance.
