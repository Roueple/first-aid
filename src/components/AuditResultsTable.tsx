import React, { useState, useEffect } from 'react';
import { AuditResult } from '../services/AuditResultService';
import auditResultService from '../services/AuditResultService';
import { exportAuditResultsToExcel } from '../utils/auditResultExcelExport';

interface AuditResultsTableProps {
  onResultSelect?: (result: AuditResult) => void;
}

type ColumnFilters = {
  year: Set<number> | 'all';
  sh: Set<string> | 'all';
  projectName: Set<string> | 'all';
  department: Set<string> | 'all';
  riskArea: Set<string> | 'all';
  code: Set<string> | 'all';
  bobot: Set<number> | 'all';
  kadar: Set<number> | 'all';
  nilai: Set<number> | 'all';
};

export const AuditResultsTable: React.FC<AuditResultsTableProps> = ({ onResultSelect }) => {
  const [results, setResults] = useState<AuditResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof AuditResult>('year');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [openFilterColumn, setOpenFilterColumn] = useState<keyof ColumnFilters | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
    year: 'all',
    sh: 'all',
    projectName: 'all',
    department: 'all',
    riskArea: 'all',
    code: 'all',
    bobot: 'all',
    kadar: 'all',
    nilai: 'all',
  });
  const [totalCount] = useState(8840); // Approximate total

  // Load results when page, sort, or filters change
  useEffect(() => {
    loadResults();
  }, [currentPage, sortField, sortDirection, columnFilters, filterText]);

  const loadResults = async () => {
    try {
      setLoading(true);
      
      // Build query filters from column filters
      const filters: any[] = [];
      
      Object.entries(columnFilters).forEach(([column, selectedValues]) => {
        if (selectedValues !== 'all' && (selectedValues as Set<any>).size > 0) {
          const filterSet = selectedValues as Set<any>;
          const values = Array.from(filterSet);
          
          if (values.length === 1) {
            filters.push({
              field: column,
              operator: '==',
              value: values[0],
            });
          } else if (values.length <= 10) {
            filters.push({
              field: column,
              operator: 'in',
              value: values,
            });
          }
        }
      });

      // Fetch ONLY 50 records per page from Firebase
      const data = await auditResultService.getAll({
        filters: filters.length > 0 ? filters : undefined,
        sorts: [{ field: sortField, direction: sortDirection }],
        limit: itemsPerPage, // Only fetch 50 records
      });

      // Apply text filter client-side
      let filteredData = data;
      if (filterText) {
        const searchLower = filterText.toLowerCase();
        filteredData = data.filter(
          (r) =>
            r.projectName.toLowerCase().includes(searchLower) ||
            r.department.toLowerCase().includes(searchLower) ||
            r.riskArea.toLowerCase().includes(searchLower) ||
            r.description.toLowerCase().includes(searchLower) ||
            r.code.toLowerCase().includes(searchLower) ||
            r.sh.toLowerCase().includes(searchLower)
        );
      }

      setResults(filteredData);
      setError(null);
      
      console.log(`📊 Loaded page ${currentPage}: ${filteredData.length} records (Firebase READ: ${itemsPerPage})`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit results');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof AuditResult) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExport = () => {
    try {
      exportAuditResultsToExcel(filteredAndSortedResults);
    } catch (err) {
      alert('Failed to export: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Column Filter Dropdown Component
  const ColumnFilterDropdown: React.FC<{
    column: keyof ColumnFilters;
    values: any[];
    label: string;
  }> = ({ column, values, label }) => {
    const isOpen = openFilterColumn === column;
    const activeFilters = columnFilters[column];
    const hasFilters = activeFilters !== 'all';
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0 });

    React.useEffect(() => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
        });
      }
    }, [isOpen]);

    return (
      <div className="relative inline-block">
        <button
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation();
            setOpenFilterColumn(isOpen ? null : column);
          }}
          className={`ml-1 p-0.5 rounded hover:bg-gray-200 ${hasFilters ? 'text-blue-600' : 'text-gray-400'}`}
          title="Filter"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
          </svg>
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpenFilterColumn(null)}
            />
            <div 
              className="fixed w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-96 overflow-hidden flex flex-col"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
              }}
            >
              <div className="p-2 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">{label}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selectAllInColumn(column);
                      setOpenFilterColumn(null);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Clear Filter
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selectAllInColumn(column);
                    }}
                    className="flex-1 text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                  >
                    Select All
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deselectAllInColumn(column);
                    }}
                    className="flex-1 text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto max-h-80">
                {values.map((value) => {
                  // Excel-like behavior: 'all' means everything is selected
                  const isChecked = activeFilters === 'all' || (activeFilters as Set<any>).has(value);
                  
                  return (
                    <label
                      key={String(value)}
                      className="flex items-center px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleColumnFilter(column, value);
                        }}
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate">{String(value)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Get unique values from current results for filters
  const uniqueValues = React.useMemo(() => {
    return {
      year: Array.from(new Set(results.map(r => r.year))).sort((a, b) => String(b).localeCompare(String(a))),
      sh: Array.from(new Set(results.map(r => r.sh))).sort(),
      projectName: Array.from(new Set(results.map(r => r.projectName))).sort(),
      department: Array.from(new Set(results.map(r => r.department))).sort(),
      riskArea: Array.from(new Set(results.map(r => r.riskArea))).sort(),
      code: Array.from(new Set(results.map(r => r.code))).sort(),
      bobot: Array.from(new Set(results.map(r => r.bobot))).sort((a, b) => a - b),
      kadar: Array.from(new Set(results.map(r => r.kadar))).sort((a, b) => a - b),
      nilai: Array.from(new Set(results.map(r => r.nilai))).sort((a, b) => a - b),
    };
  }, [results]);

  // Results are already paginated from Firebase
  const filteredAndSortedResults = results;
  const paginatedResults = results;

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const toggleColumnFilter = (column: keyof ColumnFilters, value: any) => {
    setColumnFilters(prev => {
      const current = prev[column];
      let newSet: Set<any>;
      
      // If currently 'all', start with all values and remove the clicked one
      if (current === 'all') {
        const allValuesForColumn = uniqueValues[column] as any[];
        newSet = new Set(allValuesForColumn);
        newSet.delete(value);
      } else {
        // Otherwise, toggle the value in the existing set
        newSet = new Set(current as Set<any>);
        if (newSet.has(value)) {
          newSet.delete(value);
        } else {
          newSet.add(value);
        }
        
        // If all values are now selected, switch back to 'all'
        const allValuesForColumn = uniqueValues[column] as any[];
        if (newSet.size === allValuesForColumn.length) {
          return {
            ...prev,
            [column]: 'all',
          } as ColumnFilters;
        }
      }
      
      return {
        ...prev,
        [column]: newSet,
      } as ColumnFilters;
    });
  };

  const deselectAllInColumn = (column: keyof ColumnFilters) => {
    setColumnFilters(prev => {
      const emptySet = new Set() as any;
      return {
        ...prev,
        [column]: emptySet,
      } as ColumnFilters;
    });
  };

  const selectAllInColumn = (column: keyof ColumnFilters) => {
    setColumnFilters(prev => {
      return {
        ...prev,
        [column]: 'all',
      } as ColumnFilters;
    });
  };

  const hasActiveFilters = Object.values(columnFilters).some(filter => filter !== 'all') || filterText !== '';

  const clearAllFilters = () => {
    setColumnFilters({
      year: 'all',
      sh: 'all',
      projectName: 'all',
      department: 'all',
      riskArea: 'all',
      code: 'all',
      bobot: 'all',
      kadar: 'all',
      nilai: 'all',
    });
    setFilterText('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading audit results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error: {error}</p>
        <button
          onClick={loadResults}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 p-3 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Audit Results</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleExport}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2 text-sm"
          >
            📊 <span className="hidden sm:inline">Export to Excel</span><span className="sm:hidden">Export</span>
          </button>
          <button
            onClick={loadResults}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
        <input
          type="text"
          placeholder="Search audit results..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 text-sm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear All Filters
          </button>
        )}
      </div>

      <div className="text-xs sm:text-sm text-gray-600 px-1">
        Showing page {currentPage} of ~{totalPages} ({results.length} records loaded)
        {hasActiveFilters && ' - Filters active'}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm -mx-3 sm:mx-0">
        <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 sm:w-16">
                No.
              </th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                <div className="flex items-center" onClick={() => handleSort('year')}>
                  Year {sortField === 'year' && (sortDirection === 'asc' ? '↑' : '↓')}
                  <ColumnFilterDropdown column="year" values={uniqueValues.year} label="Year" />
                </div>
              </th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                <div className="flex items-center" onClick={() => handleSort('sh')}>
                  SH {sortField === 'sh' && (sortDirection === 'asc' ? '↑' : '↓')}
                  <ColumnFilterDropdown column="sh" values={uniqueValues.sh} label="SH" />
                </div>
              </th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                <div className="flex items-center" onClick={() => handleSort('projectName')}>
                  Project {sortField === 'projectName' && (sortDirection === 'asc' ? '↑' : '↓')}
                  <ColumnFilterDropdown column="projectName" values={uniqueValues.projectName} label="Project" />
                </div>
              </th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                <div className="flex items-center" onClick={() => handleSort('department')}>
                  Department {sortField === 'department' && (sortDirection === 'asc' ? '↑' : '↓')}
                  <ColumnFilterDropdown column="department" values={uniqueValues.department} label="Department" />
                </div>
              </th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-32">
                <div className="flex items-center" onClick={() => handleSort('riskArea')}>
                  Risk Area {sortField === 'riskArea' && (sortDirection === 'asc' ? '↑' : '↓')}
                  <ColumnFilterDropdown column="riskArea" values={uniqueValues.riskArea} label="Risk Area" />
                </div>
              </th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                Description
              </th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                <div className="flex items-center" onClick={() => handleSort('code')}>
                  Code {sortField === 'code' && (sortDirection === 'asc' ? '↑' : '↓')}
                  <ColumnFilterDropdown column="code" values={uniqueValues.code} label="Code" />
                </div>
              </th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                <div className="flex items-center" onClick={() => handleSort('bobot')}>
                  Bobot {sortField === 'bobot' && (sortDirection === 'asc' ? '↑' : '↓')}
                  <ColumnFilterDropdown column="bobot" values={uniqueValues.bobot} label="Bobot" />
                </div>
              </th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                <div className="flex items-center" onClick={() => handleSort('kadar')}>
                  Kadar {sortField === 'kadar' && (sortDirection === 'asc' ? '↑' : '↓')}
                  <ColumnFilterDropdown column="kadar" values={uniqueValues.kadar} label="Kadar" />
                </div>
              </th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                <div className="flex items-center" onClick={() => handleSort('nilai')}>
                  Nilai {sortField === 'nilai' && (sortDirection === 'asc' ? '↑' : '↓')}
                  <ColumnFilterDropdown column="nilai" values={uniqueValues.nilai} label="Nilai" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedResults.map((result, index) => (
              <tr
                key={result.id}
                onClick={() => onResultSelect?.(result)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-500 font-medium whitespace-nowrap">
                  {startIndex + index + 1}
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900 text-center whitespace-nowrap">
                  {result.year}
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900 whitespace-nowrap">
                  {result.sh}
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900 font-medium min-w-[150px] max-w-[250px] truncate">
                  {result.projectName}
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900 whitespace-nowrap">
                  {result.department}
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900 max-w-[150px] truncate" title={result.riskArea}>
                  {result.riskArea}
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600 max-w-[200px] sm:max-w-xs truncate" title={result.description}>
                  {result.description}
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center whitespace-nowrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {result.code}
                  </span>
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900 text-center whitespace-nowrap">
                  {result.bobot}
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900 text-center whitespace-nowrap">
                  {result.kadar}
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center whitespace-nowrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {result.nilai}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedResults.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No audit results found matching your filters.
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-lg">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Page <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {getPageNumbers().map((page, idx) => (
                  page === '...' ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => goToPage(page as number)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        currentPage === page
                          ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                      }`}
                    >
                      {page}
                    </button>
                  )
                ))}
                
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditResultsTable;
