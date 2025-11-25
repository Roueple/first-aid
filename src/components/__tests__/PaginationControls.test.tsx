import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaginationControls } from '../PaginationControls';

describe('PaginationControls', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    pageSize: 20,
    totalItems: 100,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  };

  it('should render pagination controls with correct information', () => {
    render(<PaginationControls {...defaultProps} />);

    // Check if range display is correct
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.textContent === 'Showing 1 to 20 of 100 results';
    })).toBeInTheDocument();
  });

  it('should display correct page numbers', () => {
    render(<PaginationControls {...defaultProps} />);

    // Should show pages 1-5
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByRole('button', { name: `Page ${i}` })).toBeInTheDocument();
    }
  });

  it('should highlight current page', () => {
    render(<PaginationControls {...defaultProps} currentPage={3} />);

    const currentPageButton = screen.getByRole('button', { name: 'Page 3' });
    expect(currentPageButton).toHaveClass('bg-blue-600');
  });

  it('should disable first and previous buttons on first page', () => {
    render(<PaginationControls {...defaultProps} currentPage={1} />);

    const firstButton = screen.getByRole('button', { name: 'First page' });
    const prevButton = screen.getByRole('button', { name: 'Previous page' });

    expect(firstButton).toBeDisabled();
    expect(prevButton).toBeDisabled();
  });

  it('should disable next and last buttons on last page', () => {
    render(<PaginationControls {...defaultProps} currentPage={5} totalPages={5} />);

    const nextButton = screen.getByRole('button', { name: 'Next page' });
    const lastButton = screen.getByRole('button', { name: 'Last page' });

    expect(nextButton).toBeDisabled();
    expect(lastButton).toBeDisabled();
  });

  it('should call onPageChange when clicking page number', () => {
    const onPageChange = vi.fn();
    render(<PaginationControls {...defaultProps} onPageChange={onPageChange} />);

    const page3Button = screen.getByRole('button', { name: 'Page 3' });
    fireEvent.click(page3Button);

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('should call onPageChange when clicking next button', () => {
    const onPageChange = vi.fn();
    render(<PaginationControls {...defaultProps} currentPage={2} onPageChange={onPageChange} />);

    const nextButton = screen.getByRole('button', { name: 'Next page' });
    fireEvent.click(nextButton);

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('should call onPageChange when clicking previous button', () => {
    const onPageChange = vi.fn();
    render(<PaginationControls {...defaultProps} currentPage={2} onPageChange={onPageChange} />);

    const prevButton = screen.getByRole('button', { name: 'Previous page' });
    fireEvent.click(prevButton);

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('should call onPageChange when clicking first button', () => {
    const onPageChange = vi.fn();
    render(<PaginationControls {...defaultProps} currentPage={3} onPageChange={onPageChange} />);

    const firstButton = screen.getByRole('button', { name: 'First page' });
    fireEvent.click(firstButton);

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('should call onPageChange when clicking last button', () => {
    const onPageChange = vi.fn();
    render(<PaginationControls {...defaultProps} currentPage={2} onPageChange={onPageChange} />);

    const lastButton = screen.getByRole('button', { name: 'Last page' });
    fireEvent.click(lastButton);

    expect(onPageChange).toHaveBeenCalledWith(5);
  });

  it('should call onPageSizeChange when changing page size', () => {
    const onPageSizeChange = vi.fn();
    render(<PaginationControls {...defaultProps} onPageSizeChange={onPageSizeChange} />);

    const select = screen.getByLabelText('Items per page:');
    fireEvent.change(select, { target: { value: '50' } });

    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('should display ellipsis for large page counts', () => {
    render(<PaginationControls {...defaultProps} totalPages={20} currentPage={10} />);

    // Should show ellipsis
    const ellipses = screen.getAllByText('...');
    expect(ellipses.length).toBeGreaterThan(0);
  });

  it('should calculate correct range for middle page', () => {
    render(<PaginationControls {...defaultProps} currentPage={3} />);

    // Page 3 with pageSize 20 should show items 41-60
    expect(screen.getByText((content, element) => {
      return element?.textContent === 'Showing 41 to 60 of 100 results';
    })).toBeInTheDocument();
  });

  it('should calculate correct range for last page with partial items', () => {
    render(<PaginationControls {...defaultProps} currentPage={5} totalItems={95} />);

    // Last page should show items 81-95
    expect(screen.getByText((content, element) => {
      return element?.textContent === 'Showing 81 to 95 of 95 results';
    })).toBeInTheDocument();
  });

  it('should not render when totalItems is 0', () => {
    const { container } = render(<PaginationControls {...defaultProps} totalItems={0} />);

    expect(container.firstChild).toBeNull();
  });

  it('should render all page size options', () => {
    render(<PaginationControls {...defaultProps} pageSizeOptions={[10, 25, 50, 100]} />);

    const select = screen.getByLabelText('Items per page:');
    const options = select.querySelectorAll('option');

    expect(options).toHaveLength(4);
    expect(options[0]).toHaveValue('10');
    expect(options[1]).toHaveValue('25');
    expect(options[2]).toHaveValue('50');
    expect(options[3]).toHaveValue('100');
  });
});
