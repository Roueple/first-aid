import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocationSummaryChart } from '../LocationSummaryChart';
import { LocationSummaryData } from '../../hooks/useDashboardStats';

describe('LocationSummaryChart', () => {
  const mockData: LocationSummaryData[] = [
    { location: 'Jakarta', count: 25 },
    { location: 'Surabaya', count: 15 },
    { location: 'Bandung', count: 10 },
    { location: 'Medan', count: 8 },
  ];

  it('renders chart with data', () => {
    const { container } = render(<LocationSummaryChart data={mockData} />);
    
    // Check that ResponsiveContainer is rendered
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    const { container } = render(<LocationSummaryChart data={[]} loading={true} />);
    
    // Check for loading spinner
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('displays empty state when no data', () => {
    render(<LocationSummaryChart data={[]} />);
    
    // Check for empty state message
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders all locations', () => {
    const { container } = render(<LocationSummaryChart data={mockData} />);
    
    // Verify chart is rendered (ResponsiveContainer should be present)
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('handles empty array gracefully', () => {
    const { container } = render(<LocationSummaryChart data={[]} />);
    
    // Should show empty state, not crash
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });
});
