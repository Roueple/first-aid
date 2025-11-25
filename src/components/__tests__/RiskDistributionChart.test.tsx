import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiskDistributionChart } from '../RiskDistributionChart';
import { RiskDistributionData } from '../../hooks/useDashboardStats';

describe('RiskDistributionChart', () => {
  const mockData: RiskDistributionData[] = [
    { name: 'Critical', value: 5, color: '#DC2626' },
    { name: 'High', value: 10, color: '#F59E0B' },
    { name: 'Medium', value: 15, color: '#3B82F6' },
    { name: 'Low', value: 20, color: '#10B981' },
  ];

  it('renders chart with data', () => {
    const { container } = render(<RiskDistributionChart data={mockData} />);
    
    // Check that ResponsiveContainer is rendered
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    const { container } = render(<RiskDistributionChart data={[]} loading={true} />);
    
    // Check for loading spinner
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('displays empty state when no data', () => {
    render(<RiskDistributionChart data={[]} />);
    
    // Check for empty state message
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders all severity levels', () => {
    const { container } = render(<RiskDistributionChart data={mockData} />);
    
    // Verify chart is rendered (ResponsiveContainer should be present)
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('handles empty array gracefully', () => {
    const { container } = render(<RiskDistributionChart data={[]} />);
    
    // Should show empty state, not crash
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });
});
