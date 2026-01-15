import React from 'react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

/**
 * PaginationControls Component
 * 
 * Provides pagination UI with:
 * - Page numbers with ellipsis for large page counts
 * - Items-per-page selector (20, 50, 100)
 * - Navigation buttons (first, previous, next, last)
 * - Total count and current range display
 * 
 * Requirements: 3.1, 11.4
 */
export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100],
}) => {
  // Calculate current range
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers to display
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 7;

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const handleFirstPage = () => {
    if (currentPage > 1) {
      onPageChange(1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleLastPage = () => {
    if (currentPage < totalPages) {
      onPageChange(totalPages);
    }
  };

  const handlePageClick = (page: number | string) => {
    if (typeof page === 'number' && page !== currentPage) {
      onPageChange(page);
    }
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = parseInt(event.target.value, 10);
    onPageSizeChange(newPageSize);
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
      {/* Left side: Items per page selector and range display */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="pageSize" className="text-sm text-gray-700">
            Items per page:
          </label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={handlePageSizeChange}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{startItem}</span> to{' '}
          <span className="font-medium">{endItem}</span> of{' '}
          <span className="font-medium">{totalItems}</span> results
        </div>
      </div>

      {/* Right side: Navigation buttons and page numbers */}
      <div className="flex items-center gap-2">
        {/* First page button */}
        <button
          onClick={handleFirstPage}
          disabled={currentPage === 1}
          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          aria-label="First page"
          title="First page"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Previous page button */}
        <button
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          aria-label="Previous page"
          title="Previous page"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-3 py-1 text-sm text-gray-500"
                >
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            const isCurrentPage = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                onClick={() => handlePageClick(pageNum)}
                className={`px-3 py-1 text-sm border rounded transition-colors ${
                  isCurrentPage
                    ? 'bg-blue-600 text-white border-blue-600 font-medium'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
                aria-label={`Page ${pageNum}`}
                aria-current={isCurrentPage ? 'page' : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next page button */}
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          aria-label="Next page"
          title="Next page"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        {/* Last page button */}
        <button
          onClick={handleLastPage}
          disabled={currentPage === totalPages}
          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          aria-label="Last page"
          title="Last page"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
