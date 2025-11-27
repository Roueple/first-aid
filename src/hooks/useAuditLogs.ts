import { useQuery, useQueryClient } from '@tanstack/react-query';
import { auditService } from '../services/AuditService';
import { AuditLogFilters } from '../types/audit.types';

/**
 * Custom hook to fetch audit logs with React Query caching
 * Implements Requirements 11.1, 11.3 - Performance and caching
 * 
 * Features:
 * - Automatic caching to reduce Firestore reads
 * - Stale-while-revalidate strategy
 * - Configurable max results
 */
export function useAuditLogs(
  filters?: AuditLogFilters,
  maxResults: number = 100
) {
  const queryClient = useQueryClient();

  // Generate a stable query key based on filters and maxResults
  const queryKey = ['auditLogs', filters, maxResults];

  const {
    data: logs,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: () => auditService.getAuditLogs(filters, maxResults),
    staleTime: 3 * 60 * 1000, // Data is fresh for 3 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: true,
    retry: 3,
  });

  // Helper function to export logs to CSV
  const exportToCSV = (filename?: string) => {
    if (logs) {
      auditService.downloadCSV(logs, filename);
    }
  };

  // Helper function to manually invalidate cache
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
  };

  return {
    logs: logs || [],
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
    exportToCSV,
    invalidate,
  };
}

/**
 * Custom hook to fetch audit logs for a specific user
 */
export function useUserAuditLogs(userId: string, maxResults: number = 50) {
  const filters: AuditLogFilters = { userId };

  return useAuditLogs(filters, maxResults);
}

/**
 * Custom hook to fetch audit logs for a specific resource
 */
export function useResourceAuditLogs(
  resourceType: string,
  resourceId?: string,
  maxResults: number = 50
) {
  const filters: AuditLogFilters = {
    resourceType: [resourceType as any],
  };

  const {
    data: logs,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['auditLogs', 'resource', resourceType, resourceId, maxResults],
    queryFn: () => auditService.getAuditLogs(filters, maxResults),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Filter by resourceId on client side if provided
  const filteredLogs = resourceId
    ? (logs || []).filter((log) => log.resourceId === resourceId)
    : logs || [];

  return {
    logs: filteredLogs,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Custom hook to fetch recent audit logs (last 24 hours)
 */
export function useRecentAuditLogs(maxResults: number = 100) {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const filters: AuditLogFilters = {
    dateRange: {
      start: yesterday,
      end: now,
    },
  };

  return useAuditLogs(filters, maxResults);
}
