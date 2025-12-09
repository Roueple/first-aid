import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DashboardPage, { DashboardLoading, ErrorBoundary } from '../DashboardPage';
import * as useDashboardStatsModule from '../../../hooks/useDashboardStats';

// Mock the useDashboardStats hook
vi.mock('../../../hooks/useDashboardStats');

describe('DashboardPage', () => {
  const mockStats = {
    total: 150,
    open: 45,
    highRisk: 12,
    overdue: 8,
    trends: {
      total: { value: 5, isPositive: true },
      open: { value: 10, isPositive: false },
      highRisk: { value: 0, isPositive: false },
      overdue: { value: 15, isPositive: false },
    },
    riskDistribution: [
      { name: 'Critical', value: 5, color: '#ef4444' },
      { name: 'High', value: 12, color: '#f97316' },
      { name: 'Medium', value: 28, color: '#eab308' },
      { name: 'Low', value: 105, color: '#22c55e' },
    ],
    locationSummary: [
      { location: 'Jakarta Head Office', count: 50 },
      { location: 'Surabaya Branch', count: 30 },
      { location: 'Bandung Branch', count: 25 },
      { location: 'Medan Branch', count: 20 },
      { location: 'Bali Branch', count: 25 },
    ],
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Default mock implementation
    vi.spyOn(useDashboardStatsModule, 'useDashboardStats').mockReturnValue({
      stats: mockStats,
      loading: false,
      error: null,
      refresh: vi.fn(),
      lastRefresh: new Date(),
    });
  });

  it('renders dashboard with header and main sections', async () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    // Check header is present
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Overview of audit findings and key metrics')).toBeInTheDocument();

    // Check statistics cards are present
    await waitFor(() => {
      expect(screen.getByText('Total Findings')).toBeInTheDocument();
      expect(screen.getByText('Open Findings')).toBeInTheDocument();
      expect(screen.getByText('High-Risk')).toBeInTheDocument();
      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });

    // Check chart sections are present
    expect(screen.getByText('Risk Distribution')).toBeInTheDocument();
    expect(screen.getByText('Location Summary')).toBeInTheDocument();

    // Check recent activity section is present
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('renders loading state when loading prop is true', () => {
    render(
      <BrowserRouter>
        <DashboardPage loading={true} />
      </BrowserRouter>
    );

    // Check for loading skeleton elements (they have animate-pulse class)
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders DashboardLoading component with skeleton elements', () => {
    render(<DashboardLoading />);

    // Check for multiple skeleton elements
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(5); // Should have multiple skeleton cards and charts
  });

  it('ErrorBoundary catches errors and displays fallback UI', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    // Suppress console.error for this test
    const originalError = console.error;
    console.error = () => {};

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Check error boundary fallback is displayed
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We encountered an error loading the dashboard/)).toBeInTheDocument();
    expect(screen.getByText('Refresh Page')).toBeInTheDocument();

    // Restore console.error
    console.error = originalError;
  });

  it('ErrorBoundary renders custom fallback when provided', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const customFallback = <div>Custom Error Message</div>;

    // Suppress console.error for this test
    const originalError = console.error;
    console.error = () => {};

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error Message')).toBeInTheDocument();

    // Restore console.error
    console.error = originalError;
  });

  it('displays empty state message when no findings exist', () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText('No findings yet')).toBeInTheDocument();
    expect(screen.getByText(/Import findings from Excel or create a new finding/)).toBeInTheDocument();
  });

  it('displays statistics values from hook', async () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    // Check that statistics values are displayed
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // Total
      expect(screen.getByText('45')).toBeInTheDocument(); // Open
      expect(screen.getByText('12')).toBeInTheDocument(); // High-Risk
      expect(screen.getByText('8')).toBeInTheDocument(); // Overdue
    });
  });

  it('displays loading state when statistics are loading', () => {
    vi.spyOn(useDashboardStatsModule, 'useDashboardStats').mockReturnValue({
      stats: mockStats,
      loading: true,
      error: null,
      refresh: vi.fn(),
      lastRefresh: new Date(),
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    // Check for loading skeleton elements in statistics cards
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays error message when statistics fail to load', async () => {
    vi.spyOn(useDashboardStatsModule, 'useDashboardStats').mockReturnValue({
      stats: mockStats,
      loading: false,
      error: new Error('Failed to fetch'),
      refresh: vi.fn(),
      lastRefresh: new Date(),
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load statistics/)).toBeInTheDocument();
    });
  });

  it('displays trend indicators correctly', async () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Check for trend percentages
      expect(screen.getByText('5%')).toBeInTheDocument(); // Total trend
      expect(screen.getByText('10%')).toBeInTheDocument(); // Open trend
      expect(screen.getByText('15%')).toBeInTheDocument(); // Overdue trend
    });
  });
});
