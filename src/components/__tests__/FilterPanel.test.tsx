import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPanel } from '../FilterPanel';
import { FindingFilters } from '../../types/filter.types';

describe('FilterPanel', () => {
  const mockOnFiltersChange = vi.fn();

  const defaultProps = {
    filters: {},
    onFiltersChange: mockOnFiltersChange,
    availableLocations: ['Data Center A', 'Data Center B', 'Office Building 1'],
    availableCategories: ['Security', 'Operations', 'Compliance', 'HR Compliance'],
  };

  beforeEach(() => {
    mockOnFiltersChange.mockClear();
  });

  it('renders filter panel with header', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('displays severity filter options', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('displays status filter options', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.getByText('Deferred')).toBeInTheDocument();
  });

  it('displays location filter options', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Data Center A')).toBeInTheDocument();
    expect(screen.getByText('Data Center B')).toBeInTheDocument();
    expect(screen.getByText('Office Building 1')).toBeInTheDocument();
  });

  it('displays category filter options', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText('Compliance')).toBeInTheDocument();
    expect(screen.getByText('HR Compliance')).toBeInTheDocument();
  });

  it('displays date range picker', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByText('Date Identified')).toBeInTheDocument();
    expect(screen.getByText('From')).toBeInTheDocument();
    expect(screen.getByText('To')).toBeInTheDocument();
  });

  it('calls onFiltersChange when severity is selected', () => {
    render(<FilterPanel {...defaultProps} />);
    const criticalCheckbox = screen.getByRole('checkbox', { name: /critical/i });
    fireEvent.click(criticalCheckbox);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      severity: ['Critical'],
    });
  });

  it('calls onFiltersChange when status is selected', () => {
    render(<FilterPanel {...defaultProps} />);
    const openCheckbox = screen.getByRole('checkbox', { name: /open/i });
    fireEvent.click(openCheckbox);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      status: ['Open'],
    });
  });

  it('calls onFiltersChange when location is selected', () => {
    render(<FilterPanel {...defaultProps} />);
    const locationCheckbox = screen.getByRole('checkbox', { name: /data center a/i });
    fireEvent.click(locationCheckbox);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      location: ['Data Center A'],
    });
  });

  it('calls onFiltersChange when category is selected', () => {
    render(<FilterPanel {...defaultProps} />);
    const categoryCheckbox = screen.getByRole('checkbox', { name: /security/i });
    fireEvent.click(categoryCheckbox);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      category: ['Security'],
    });
  });

  it('allows multiple selections in severity filter', () => {
    const propsWithOneSeverity = {
      ...defaultProps,
      filters: { severity: ['Critical'] } as FindingFilters,
    };
    
    render(<FilterPanel {...propsWithOneSeverity} />);
    
    const highCheckbox = screen.getByRole('checkbox', { name: /^high$/i });
    fireEvent.click(highCheckbox);
    
    expect(mockOnFiltersChange).toHaveBeenLastCalledWith({
      severity: ['Critical', 'High'],
    });
  });

  it('removes filter when unchecking a selected option', () => {
    const propsWithFilters = {
      ...defaultProps,
      filters: { severity: ['Critical'] } as FindingFilters,
    };
    
    render(<FilterPanel {...propsWithFilters} />);
    const criticalCheckbox = screen.getByRole('checkbox', { name: /critical/i });
    
    expect(criticalCheckbox).toBeChecked();
    fireEvent.click(criticalCheckbox);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({});
  });

  it('displays "Active" badge when filters are applied', () => {
    const propsWithFilters = {
      ...defaultProps,
      filters: { severity: ['Critical'] } as FindingFilters,
    };
    
    render(<FilterPanel {...propsWithFilters} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('displays "Clear All" button when filters are active', () => {
    const propsWithFilters = {
      ...defaultProps,
      filters: { severity: ['Critical'] } as FindingFilters,
    };
    
    render(<FilterPanel {...propsWithFilters} />);
    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('clears all filters when "Clear All" is clicked', () => {
    const propsWithFilters = {
      ...defaultProps,
      filters: {
        severity: ['Critical'],
        status: ['Open'],
        location: ['Data Center A'],
      } as FindingFilters,
    };
    
    render(<FilterPanel {...propsWithFilters} />);
    const clearAllButton = screen.getByText('Clear All');
    fireEvent.click(clearAllButton);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({});
  });

  it('toggles expansion when collapse/expand button is clicked', () => {
    render(<FilterPanel {...defaultProps} />);
    
    // Initially expanded
    expect(screen.getByText('Severity')).toBeInTheDocument();
    
    // Click collapse button
    const collapseButton = screen.getByLabelText(/collapse filters/i);
    fireEvent.click(collapseButton);
    
    // Content should be hidden
    expect(screen.queryByText('Severity')).not.toBeInTheDocument();
  });

  it('handles date range start selection', () => {
    render(<FilterPanel {...defaultProps} />);
    // Date inputs don't have role="textbox", they are just input elements
    const dateInputs = screen.getAllByDisplayValue('');
    const startDateInput = dateInputs.find((input) => 
      input.getAttribute('type') === 'date' && 
      input.previousElementSibling?.textContent === 'From'
    );
    
    fireEvent.change(startDateInput!, { target: { value: '2024-01-01' } });
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      dateIdentified: {
        start: expect.any(Date),
      },
    });
  });

  it('handles date range end selection', () => {
    render(<FilterPanel {...defaultProps} />);
    // Date inputs don't have role="textbox", they are just input elements
    const dateInputs = screen.getAllByDisplayValue('');
    const endDateInput = dateInputs.find((input) => 
      input.getAttribute('type') === 'date' && 
      input.previousElementSibling?.textContent === 'To'
    );
    
    fireEvent.change(endDateInput!, { target: { value: '2024-12-31' } });
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      dateIdentified: {
        end: expect.any(Date),
      },
    });
  });

  it('does not display location filter when no locations available', () => {
    const propsWithoutLocations = {
      ...defaultProps,
      availableLocations: [],
    };
    
    render(<FilterPanel {...propsWithoutLocations} />);
    expect(screen.queryByText('Location')).not.toBeInTheDocument();
  });

  it('does not display category filter when no categories available', () => {
    const propsWithoutCategories = {
      ...defaultProps,
      availableCategories: [],
    };
    
    render(<FilterPanel {...propsWithoutCategories} />);
    expect(screen.queryByText('Category')).not.toBeInTheDocument();
  });
});
