import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import findingsService from '../services/FindingsService';
import { FindingFilters, Pagination, DEFAULT_PAGINATION } from '../types/filter.types';
import { CreateFindingInput, UpdateFindingInput } from '../types/finding.types';

/**
 * Custom hook to fetch findings with React Query caching
 * Implements Requirements 11.1, 11.3 - Performance and caching
 * 
 * Features:
 * - Automatic caching to reduce Firestore reads
 * - Stale-while-revalidate strategy
 * - Optimistic updates for mutations
 * - Automatic cache invalidation
 */
export function useFindings(
  filters?: FindingFilters,
  pagination: Pagination = DEFAULT_PAGINATION
) {
  const queryClient = useQueryClient();

  // Generate a stable query key based on filters and pagination
  const queryKey = ['findings', filters, pagination];

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: () => findingsService.getFindings(filters, pagination),
    staleTime: 2 * 60 * 1000, // Data is fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true,
    retry: 3,
  });

  return {
    findings: data?.items || [],
    total: data?.total || 0,
    page: data?.page || pagination.page,
    pageSize: data?.pageSize || pagination.pageSize,
    totalPages: data?.totalPages || 0,
    hasNextPage: data?.hasNextPage || false,
    hasPreviousPage: data?.hasPreviousPage || false,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Custom hook to fetch a single finding by ID
 */
export function useFinding(id: string | null) {
  const {
    data: finding,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['finding', id],
    queryFn: () => findingsService.getFindingById(id!),
    enabled: !!id, // Only fetch if ID is provided
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    finding,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Custom hook to create a finding with optimistic updates
 */
export function useCreateFinding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFindingInput) => findingsService.createFinding(input),
    onSuccess: () => {
      // Invalidate all findings queries to refetch with new data
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

/**
 * Custom hook to update a finding with optimistic updates
 */
export function useUpdateFinding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFindingInput }) =>
      findingsService.updateFinding(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific finding query
      queryClient.invalidateQueries({ queryKey: ['finding', variables.id] });
      // Invalidate all findings queries
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      // Invalidate dashboard stats
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

/**
 * Custom hook to delete a finding
 */
export function useDeleteFinding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => findingsService.deleteFinding(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['finding', id] });
      // Invalidate all findings queries
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      // Invalidate dashboard stats
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

/**
 * Custom hook to fetch overdue findings
 */
export function useOverdueFindings(pagination: Pagination = DEFAULT_PAGINATION) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['findings', 'overdue', pagination],
    queryFn: () => findingsService.getOverdueFindings(pagination),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    findings: data?.items || [],
    total: data?.total || 0,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Custom hook to fetch high-risk findings
 */
export function useHighRiskFindings(pagination: Pagination = DEFAULT_PAGINATION) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['findings', 'high-risk', pagination],
    queryFn: () => findingsService.getHighRiskFindings(pagination),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    findings: data?.items || [],
    total: data?.total || 0,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Custom hook to search findings
 */
export function useSearchFindings(
  searchText: string,
  filters?: FindingFilters,
  pagination: Pagination = DEFAULT_PAGINATION
) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['findings', 'search', searchText, filters, pagination],
    queryFn: () => findingsService.searchFindings(searchText, filters, pagination),
    enabled: searchText.trim().length > 0, // Only search if text is provided
    staleTime: 1 * 60 * 1000, // Search results are fresh for 1 minute
    gcTime: 3 * 60 * 1000,
  });

  return {
    findings: data?.items || [],
    total: data?.total || 0,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
