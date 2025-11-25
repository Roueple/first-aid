import { useQuery } from '@tanstack/react-query';
import findingsService from '../services/FindingsService';
import { Finding } from '../types/finding.types';

export interface RiskDistributionData {
  name: string;
  value: number;
  color: string;
}

export interface LocationSummaryData {
  location: string;
  count: number;
}

export interface DashboardStats {
  total: number;
  open: number;
  highRisk: number;
  overdue: number;
  trends: {
    total: { value: number; isPositive: boolean };
    open: { value: number; isPositive: boolean };
    highRisk: { value: number; isPositive: boolean };
    overdue: { value: number; isPositive: boolean };
  };
  riskDistribution: RiskDistributionData[];
  locationSummary: LocationSummaryData[];
}

const calculateTrends = (
  currentFindings: (Finding & { id: string })[],
  previousFindings: (Finding & { id: string })[]
) => {
  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, isPositive: false };
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.round(Math.abs(change)),
      isPositive: change >= 0,
    };
  };

  const currentOpen = currentFindings.filter(
    (f) => f.status === 'Open' || f.status === 'In Progress'
  ).length;
  const previousOpen = previousFindings.filter(
    (f) => f.status === 'Open' || f.status === 'In Progress'
  ).length;

  const currentHighRisk = currentFindings.filter(
    (f) => f.severity === 'Critical' || f.severity === 'High'
  ).length;
  const previousHighRisk = previousFindings.filter(
    (f) => f.severity === 'Critical' || f.severity === 'High'
  ).length;

  // Use the computed isOverdue field from FindingsService
  const currentOverdue = currentFindings.filter((f) => f.isOverdue).length;
  const previousOverdue = previousFindings.filter((f) => f.isOverdue).length;

  return {
    total: calculatePercentageChange(currentFindings.length, previousFindings.length),
    open: calculatePercentageChange(currentOpen, previousOpen),
    highRisk: calculatePercentageChange(currentHighRisk, previousHighRisk),
    overdue: calculatePercentageChange(currentOverdue, previousOverdue),
  };
};

const fetchDashboardStats = async (): Promise<DashboardStats> => {
  // Fetch all findings for current period
  const currentResult = await findingsService.getFindings(undefined, {
    page: 1,
    pageSize: 10000, // Get all findings
  });

  const currentFindings = currentResult.items;

  // Calculate date one month ago
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  // Fetch findings from one month ago for trend calculation
  const previousResult = await findingsService.getFindings(
    {
      dateIdentified: {
        end: oneMonthAgo,
      },
    },
    {
      page: 1,
      pageSize: 10000,
    }
  );

  const previousFindings = previousResult.items;

  // Calculate current stats
  const total = currentFindings.length;
  const open = currentFindings.filter(
    (f) => f.status === 'Open' || f.status === 'In Progress'
  ).length;
  const highRisk = currentFindings.filter(
    (f) => f.severity === 'Critical' || f.severity === 'High'
  ).length;

  // Use the computed isOverdue field from FindingsService
  const overdue = currentFindings.filter((f) => f.isOverdue).length;

  // Calculate trends
  const trends = calculateTrends(currentFindings, previousFindings);

  // Calculate risk distribution
  const severityCounts = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
  };

  currentFindings.forEach((f) => {
    if (f.severity in severityCounts) {
      severityCounts[f.severity as keyof typeof severityCounts]++;
    }
  });

  const riskDistribution: RiskDistributionData[] = [
    { name: 'Critical', value: severityCounts.Critical, color: '#DC2626' },
    { name: 'High', value: severityCounts.High, color: '#F59E0B' },
    { name: 'Medium', value: severityCounts.Medium, color: '#3B82F6' },
    { name: 'Low', value: severityCounts.Low, color: '#10B981' },
  ].filter((item) => item.value > 0);

  // Calculate location summary (top 10 locations)
  const locationCounts = new Map<string, number>();
  currentFindings.forEach((f) => {
    const location = f.location || 'Unknown';
    locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
  });

  const locationSummary: LocationSummaryData[] = Array.from(locationCounts.entries())
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total,
    open,
    highRisk,
    overdue,
    trends,
    riskDistribution,
    locationSummary,
  };
};

/**
 * Custom hook to fetch dashboard statistics with React Query
 * Implements Requirements 4.1, 4.2, 4.5, 11.3
 * 
 * Features:
 * - Automatic caching to reduce Firestore reads
 * - Automatic refresh every 5 minutes
 * - Manual refresh capability
 * - Stale-while-revalidate strategy
 */
export function useDashboardStats() {
  const {
    data: stats,
    isLoading: loading,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    refetchOnWindowFocus: true, // Refetch when window regains focus
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  const defaultStats: DashboardStats = {
    total: 0,
    open: 0,
    highRisk: 0,
    overdue: 0,
    trends: {
      total: { value: 0, isPositive: false },
      open: { value: 0, isPositive: false },
      highRisk: { value: 0, isPositive: false },
      overdue: { value: 0, isPositive: false },
    },
    riskDistribution: [],
    locationSummary: [],
  };

  return {
    stats: stats || defaultStats,
    loading,
    error: error as Error | null,
    refresh: refetch,
    lastRefresh: new Date(dataUpdatedAt),
  };
}
