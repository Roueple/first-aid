import { QueryClient } from '@tanstack/react-query';

/**
 * Cache utility functions for managing React Query cache
 * Implements Requirements 11.1, 11.3 - Performance and caching
 */

/**
 * Prefetch dashboard statistics
 * Useful for preloading data before navigation
 */
export async function prefetchDashboardStats(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: ['dashboardStats'],
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Prefetch findings with specific filters
 */
export async function prefetchFindings(
  queryClient: QueryClient,
  filters?: any,
  pagination?: any
) {
  await queryClient.prefetchQuery({
    queryKey: ['findings', filters, pagination],
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Invalidate all findings-related queries
 * Useful after bulk operations
 */
export function invalidateAllFindings(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['findings'] });
  queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
}

/**
 * Invalidate all audit log queries
 */
export function invalidateAllAuditLogs(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
}

/**
 * Clear all cached data
 * Useful for logout or data refresh
 */
export function clearAllCache(queryClient: QueryClient) {
  queryClient.clear();
}

/**
 * Get cache statistics
 * Useful for debugging and monitoring
 */
export function getCacheStats(queryClient: QueryClient) {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();

  const stats = {
    totalQueries: queries.length,
    activeQueries: queries.filter((q) => q.getObserversCount() > 0).length,
    staleQueries: queries.filter((q) => q.isStale()).length,
    fetchingQueries: queries.filter((q) => q.state.fetchStatus === 'fetching').length,
    cachedDataSize: queries.reduce((acc, q) => {
      const dataSize = JSON.stringify(q.state.data || {}).length;
      return acc + dataSize;
    }, 0),
  };

  return stats;
}

/**
 * Remove stale queries from cache
 * Useful for memory management
 */
export function removeStaleQueries(queryClient: QueryClient) {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();

  queries.forEach((query) => {
    if (query.isStale() && query.getObserversCount() === 0) {
      cache.remove(query);
    }
  });
}

/**
 * Set data in cache manually
 * Useful for optimistic updates
 */
export function setCachedData<T>(
  queryClient: QueryClient,
  queryKey: any[],
  data: T
) {
  queryClient.setQueryData(queryKey, data);
}

/**
 * Get data from cache
 */
export function getCachedData<T>(
  queryClient: QueryClient,
  queryKey: any[]
): T | undefined {
  return queryClient.getQueryData<T>(queryKey);
}

/**
 * Check if query is cached and fresh
 */
export function isCachedAndFresh(
  queryClient: QueryClient,
  queryKey: any[]
): boolean {
  const query = queryClient.getQueryState(queryKey);
  
  if (!query) {
    return false;
  }

  const now = Date.now();
  const dataUpdatedAt = query.dataUpdatedAt;
  const staleTime = 5 * 60 * 1000; // 5 minutes default

  return now - dataUpdatedAt < staleTime;
}

/**
 * Batch invalidate multiple query keys
 */
export function batchInvalidate(
  queryClient: QueryClient,
  queryKeys: any[][]
) {
  queryKeys.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: key });
  });
}

/**
 * Prefetch multiple queries in parallel
 */
export async function prefetchMultiple(
  queryClient: QueryClient,
  queries: Array<{
    queryKey: any[];
    queryFn: () => Promise<any>;
    staleTime?: number;
  }>
) {
  await Promise.all(
    queries.map((query) =>
      queryClient.prefetchQuery({
        queryKey: query.queryKey,
        queryFn: query.queryFn,
        staleTime: query.staleTime || 5 * 60 * 1000,
      })
    )
  );
}

/**
 * Get cache hit rate for monitoring
 */
export function getCacheHitRate(queryClient: QueryClient): number {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();

  if (queries.length === 0) {
    return 0;
  }

  const hits = queries.filter((q) => q.state.data !== undefined).length;
  return (hits / queries.length) * 100;
}

/**
 * Log cache statistics to console
 * Useful for debugging
 */
export function logCacheStats(queryClient: QueryClient) {
  const stats = getCacheStats(queryClient);
  const hitRate = getCacheHitRate(queryClient);

  console.group('React Query Cache Statistics');
  console.log('Total Queries:', stats.totalQueries);
  console.log('Active Queries:', stats.activeQueries);
  console.log('Stale Queries:', stats.staleQueries);
  console.log('Fetching Queries:', stats.fetchingQueries);
  console.log('Cached Data Size:', `${(stats.cachedDataSize / 1024).toFixed(2)} KB`);
  console.log('Cache Hit Rate:', `${hitRate.toFixed(2)}%`);
  console.groupEnd();
}
