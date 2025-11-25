import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FindingsTable } from '../FindingsTable';
import { Finding } from '../../types/finding.types';
import { Timestamp } from 'firebase/firestore';

// Helper function to create mock findings
const createMockFinding = (overrides?: Partial<Finding>): Finding => ({
  id: 'finding-1',
  title: 'Test Finding',
  description: 'Test description',
  severity: 'High',
  status: 'Open',
  category: 'Security',
  location: 'Building A',
  responsiblePerson: 'John Doe',
  dateIdentified: Timestamp.fromDate(new Date('2024-01-15')),
  dateCreated: Timestamp.fromDate(new Date('2024-01-15')),
  dateUpdated: Timestamp.fromDate(new Date('2024-01-15')),
  recommendation: 'Fix the issue',
  tags: ['urgent'],
  riskLevel: 8,
  originalSource: 'Manual Entry',
  importBatch: 'batch-1',
  ...overrides,
});

describe('FindingsTable', () => {
  it('renders table with findings data', () => {
    const findings = [
      createMockFinding({ id: 'f1', title: 'Finding 1' }),
      createMockFinding({ id: 'f2', title: 'Finding 2' }),
    ];

    render(<FindingsTable findings={findings} />);

    expect(screen.getByText('Finding 1')).toBeInTheDocument();
    expect(screen.getByText('Finding 2')).toBeInTheDocument();
  });

  it('displays all column headers', () => {
    const findings = [createMockFinding()];

    render(<FindingsTable findings={findings} />);

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Responsible Person')).toBeInTheDocument();
    expect(screen.getByText('Date Identified')).toBeInTheDocument();
    expect(screen.getByText('Date Due')).toBeInTheDocument();
    expect(screen.getByText('Risk Level')).toBeInTheDocument();
  });

  it('renders checkboxes for row selection', () => {
    const findings = [createMockFinding()];

    render(<FindingsTable findings={findings} />);

    const checkboxes = screen.getAllByRole('checkbox');
    // Should have header checkbox + 1 row checkbox
    expect(checkboxes).toHaveLength(2);
  });

  it('allows selecting individual rows', () => {
    const findings = [
      createMockFinding({ id: 'f1', title: 'Finding 1' }),
      createMockFinding({ id: 'f2', title: 'Finding 2' }),
    ];
    const onRowSelectionChange = vi.fn();

    render(
      <FindingsTable
        findings={findings}
        onRowSelectionChange={onRowSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // Click the first row checkbox (index 1, since 0 is header)
    fireEvent.click(checkboxes[1]);

    expect(onRowSelectionChange).toHaveBeenCalled();
    expect(screen.getByText('1 row(s) selected')).toBeInTheDocument();
  });

  it('allows selecting all rows', () => {
    const findings = [
      createMockFinding({ id: 'f1', title: 'Finding 1' }),
      createMockFinding({ id: 'f2', title: 'Finding 2' }),
    ];
    const onRowSelectionChange = vi.fn();

    render(
      <FindingsTable
        findings={findings}
        onRowSelectionChange={onRowSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // Click the header checkbox
    fireEvent.click(checkboxes[0]);

    expect(onRowSelectionChange).toHaveBeenCalled();
    expect(screen.getByText('2 row(s) selected')).toBeInTheDocument();
  });

  it('displays severity badges with correct styling', () => {
    const findings = [
      createMockFinding({ severity: 'Critical' }),
      createMockFinding({ id: 'f2', severity: 'High' }),
      createMockFinding({ id: 'f3', severity: 'Medium' }),
      createMockFinding({ id: 'f4', severity: 'Low' }),
    ];

    render(<FindingsTable findings={findings} />);

    expect(screen.getByText('Critical')).toHaveClass('bg-red-100', 'text-red-800');
    expect(screen.getByText('High')).toHaveClass('bg-orange-100', 'text-orange-800');
    expect(screen.getByText('Medium')).toHaveClass('bg-yellow-100', 'text-yellow-800');
    expect(screen.getByText('Low')).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('displays status badges with correct styling', () => {
    const findings = [
      createMockFinding({ status: 'Open' }),
      createMockFinding({ id: 'f2', status: 'In Progress' }),
      createMockFinding({ id: 'f3', status: 'Closed' }),
      createMockFinding({ id: 'f4', status: 'Deferred' }),
    ];

    render(<FindingsTable findings={findings} />);

    expect(screen.getByText('Open')).toHaveClass('bg-blue-100', 'text-blue-800');
    expect(screen.getByText('In Progress')).toHaveClass('bg-purple-100', 'text-purple-800');
    expect(screen.getByText('Closed')).toHaveClass('bg-gray-100', 'text-gray-800');
    expect(screen.getByText('Deferred')).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  it('formats dates correctly', () => {
    const findings = [
      createMockFinding({
        dateIdentified: Timestamp.fromDate(new Date('2024-01-15')),
      }),
    ];

    render(<FindingsTable findings={findings} />);

    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
  });

  it('displays risk level with /10 suffix', () => {
    const findings = [createMockFinding({ riskLevel: 7 })];

    render(<FindingsTable findings={findings} />);

    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('/10')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<FindingsTable findings={[]} isLoading={true} />);

    expect(screen.getByText('Loading findings...')).toBeInTheDocument();
  });

  it('shows empty state when no findings', () => {
    render(<FindingsTable findings={[]} />);

    expect(screen.getByText('No findings found')).toBeInTheDocument();
    expect(
      screen.getByText('Try adjusting your filters or search criteria')
    ).toBeInTheDocument();
  });

  it('enables sorting on column headers', () => {
    const findings = [
      createMockFinding({ id: 'f1', title: 'B Finding' }),
      createMockFinding({ id: 'f2', title: 'A Finding' }),
    ];

    render(<FindingsTable findings={findings} />);

    const titleHeader = screen.getByText('Title');
    expect(titleHeader).toBeInTheDocument();

    // Click to sort
    fireEvent.click(titleHeader);

    // After sorting, A Finding should come first
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('A Finding');
  });

  it('highlights selected rows', () => {
    const findings = [createMockFinding()];

    render(<FindingsTable findings={findings} />);

    const checkbox = screen.getAllByRole('checkbox')[1];
    fireEvent.click(checkbox);

    const row = checkbox.closest('tr');
    expect(row).toHaveClass('bg-blue-50');
  });

  it('handles missing optional fields gracefully', () => {
    const findings = [
      createMockFinding({
        dateDue: undefined,
        subcategory: undefined,
        branch: undefined,
      }),
    ];

    render(<FindingsTable findings={findings} />);

    // Should render without errors
    expect(screen.getByText('Test Finding')).toBeInTheDocument();
  });

  it('truncates long text with title attribute', () => {
    const longTitle = 'This is a very long finding title that should be truncated';
    const findings = [createMockFinding({ title: longTitle })];

    render(<FindingsTable findings={findings} />);

    const titleCell = screen.getByText(longTitle);
    expect(titleCell).toHaveClass('truncate');
    expect(titleCell).toHaveAttribute('title', longTitle);
  });

  describe('Pagination', () => {
    it('renders pagination controls when handlers are provided', () => {
      const findings = [createMockFinding()];
      const onPageChange = vi.fn();
      const onPageSizeChange = vi.fn();

      render(
        <FindingsTable
          findings={findings}
          currentPage={1}
          totalPages={5}
          pageSize={20}
          totalItems={100}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      );

      expect(screen.getByText(/Showing/)).toBeInTheDocument();
      expect(screen.getByLabelText('Items per page:')).toBeInTheDocument();
    });

    it('does not render pagination controls when handlers are not provided', () => {
      const findings = [createMockFinding()];

      render(<FindingsTable findings={findings} />);

      expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
    });

    it('calls onPageChange when page is changed', () => {
      const findings = [createMockFinding()];
      const onPageChange = vi.fn();
      const onPageSizeChange = vi.fn();

      render(
        <FindingsTable
          findings={findings}
          currentPage={1}
          totalPages={5}
          pageSize={20}
          totalItems={100}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      );

      const nextButton = screen.getByRole('button', { name: 'Next page' });
      fireEvent.click(nextButton);

      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('calls onPageSizeChange when page size is changed', () => {
      const findings = [createMockFinding()];
      const onPageChange = vi.fn();
      const onPageSizeChange = vi.fn();

      render(
        <FindingsTable
          findings={findings}
          currentPage={1}
          totalPages={5}
          pageSize={20}
          totalItems={100}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      );

      const select = screen.getByLabelText('Items per page:');
      fireEvent.change(select, { target: { value: '50' } });

      expect(onPageSizeChange).toHaveBeenCalledWith(50);
    });

    it('uses totalItems prop when provided', () => {
      const findings = [createMockFinding()];
      const onPageChange = vi.fn();
      const onPageSizeChange = vi.fn();

      render(
        <FindingsTable
          findings={findings}
          currentPage={1}
          totalPages={10}
          pageSize={20}
          totalItems={200}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      );

      expect(screen.getByText('200')).toBeInTheDocument();
    });

    it('calculates totalItems from findings length when not provided', () => {
      const findings = [
        createMockFinding({ id: 'f1' }),
        createMockFinding({ id: 'f2' }),
        createMockFinding({ id: 'f3' }),
      ];
      const onPageChange = vi.fn();
      const onPageSizeChange = vi.fn();

      render(
        <FindingsTable
          findings={findings}
          currentPage={1}
          totalPages={1}
          pageSize={20}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      );

      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Showing 1 to 3 of 3 results';
      })).toBeInTheDocument();
    });
  });
});
