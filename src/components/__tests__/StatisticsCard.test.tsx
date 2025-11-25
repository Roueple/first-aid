import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatisticsCard } from '../StatisticsCard';

describe('StatisticsCard', () => {
  const mockIcon = (
    <svg data-testid="test-icon">
      <path d="M0 0" />
    </svg>
  );

  it('renders card with title and value', () => {
    render(
      <StatisticsCard
        title="Test Metric"
        value={42}
        icon={mockIcon}
        iconBgColor="bg-blue-100"
        iconColor="text-blue-600"
      />
    );

    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(
      <StatisticsCard
        title="Test Metric"
        value={42}
        icon={mockIcon}
        iconBgColor="bg-blue-100"
        iconColor="text-blue-600"
        loading={true}
      />
    );

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders positive trend indicator', () => {
    render(
      <StatisticsCard
        title="Test Metric"
        value={42}
        trend={{ value: 10, isPositive: true }}
        icon={mockIcon}
        iconBgColor="bg-blue-100"
        iconColor="text-blue-600"
      />
    );

    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('from last month')).toBeInTheDocument();
  });

  it('renders negative trend indicator', () => {
    render(
      <StatisticsCard
        title="Test Metric"
        value={42}
        trend={{ value: 5, isPositive: false }}
        icon={mockIcon}
        iconBgColor="bg-blue-100"
        iconColor="text-blue-600"
      />
    );

    expect(screen.getByText('5%')).toBeInTheDocument();
  });

  it('renders no change message when trend is zero', () => {
    render(
      <StatisticsCard
        title="Test Metric"
        value={42}
        trend={{ value: 0, isPositive: false }}
        icon={mockIcon}
        iconBgColor="bg-blue-100"
        iconColor="text-blue-600"
      />
    );

    expect(screen.getByText('No change from last month')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();

    render(
      <StatisticsCard
        title="Test Metric"
        value={42}
        icon={mockIcon}
        iconBgColor="bg-blue-100"
        iconColor="text-blue-600"
        onClick={handleClick}
      />
    );

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('handles keyboard navigation', () => {
    const handleClick = vi.fn();

    render(
      <StatisticsCard
        title="Test Metric"
        value={42}
        icon={mockIcon}
        iconBgColor="bg-blue-100"
        iconColor="text-blue-600"
        onClick={handleClick}
      />
    );

    const card = screen.getByRole('button');
    
    // Test Enter key
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Test Space key
    fireEvent.keyDown(card, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('does not render as button when onClick is not provided', () => {
    render(
      <StatisticsCard
        title="Test Metric"
        value={42}
        icon={mockIcon}
        iconBgColor="bg-blue-100"
        iconColor="text-blue-600"
      />
    );

    const buttons = screen.queryAllByRole('button');
    expect(buttons.length).toBe(0);
  });

  it('formats large numbers with locale string', () => {
    render(
      <StatisticsCard
        title="Test Metric"
        value={1234567}
        icon={mockIcon}
        iconBgColor="bg-blue-100"
        iconColor="text-blue-600"
      />
    );

    // Should format with commas
    expect(screen.getByText(/1,234,567/)).toBeInTheDocument();
  });
});
