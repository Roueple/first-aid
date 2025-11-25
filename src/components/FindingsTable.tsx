import React, { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  RowSelectionState,
} from '@tanstack/react-table';
import { Finding } from '../types/finding.types';
import { Timestamp } from 'firebase/firestore';
import { PaginationControls } from './PaginationControls';

interface FindingsTableProps {
  findings: Finding[];
  onRowSelectionChange?: (selectedRows: Finding[]) => void;
  onRowClick?: (finding: Finding) => void;
  isLoading?: boolean;
  // Pagination props
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

/**
 * FindingsTable Component
 * 
 * A comprehensive table component for displaying audit findings with:
 * - Sortable columns
 * - Row selection with checkboxes
 * - All finding fields displayed
 * - Pagination controls
 * 
 * Requirements: 3.1, 3.5, 11.4
 */
export const FindingsTable: React.FC<FindingsTableProps> = ({
  findings,
  onRowSelectionChange,
  onRowClick,
  isLoading = false,
  currentPage = 1,
  totalPages = 1,
  pageSize = 20,
  totalItems,
  onPageChange,
  onPageSizeChange,
}) => {
  // Calculate total items if not provided
  const calculatedTotalItems = totalItems ?? findings.length;
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Helper function to format Timestamp to readable date
  const formatDate = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) return '-';
    try {
      return timestamp.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  // Helper function to get severity badge color
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-100 text-red-800';
      case 'High':
        return 'bg-orange-100 text-orange-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get status badge color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Open':
        return 'bg-blue-100 text-blue-800';
      case 'In Progress':
        return 'bg-purple-100 text-purple-800';
      case 'Closed':
        return 'bg-gray-100 text-gray-800';
      case 'Deferred':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Define columns for the table
  const columns = useMemo<ColumnDef<Finding>[]>(
    () => [
      // Selection column
      {
        id: 'select',
        header: ({ table }) => {
          const checkbox = React.useRef<HTMLInputElement>(null);
          React.useEffect(() => {
            if (checkbox.current) {
              checkbox.current.indeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected();
            }
          }, [table.getIsSomeRowsSelected(), table.getIsAllRowsSelected()]);
          
          return (
            <input
              ref={checkbox}
              type="checkbox"
              checked={table.getIsAllRowsSelected()}
              onChange={table.getToggleAllRowsSelectedHandler()}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              aria-label="Select all rows"
            />
          );
        },
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            aria-label={`Select row ${row.index + 1}`}
          />
        ),
        enableSorting: false,
        size: 50,
      },
      // Title column
      {
        accessorKey: 'title',
        header: 'Title',
        cell: (info) => (
          <div className="max-w-xs truncate" title={info.getValue() as string}>
            {info.getValue() as string}
          </div>
        ),
        size: 250,
      },
      // Severity column
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: (info) => {
          const severity = info.getValue() as string;
          return (
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(
                severity
              )}`}
            >
              {severity}
            </span>
          );
        },
        size: 100,
      },
      // Status column
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => {
          const status = info.getValue() as string;
          return (
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                status
              )}`}
            >
              {status}
            </span>
          );
        },
        size: 120,
      },
      // Location column
      {
        accessorKey: 'location',
        header: 'Location',
        cell: (info) => info.getValue() as string,
        size: 150,
      },
      // Category column
      {
        accessorKey: 'category',
        header: 'Category',
        cell: (info) => (
          <div className="max-w-xs truncate" title={info.getValue() as string}>
            {info.getValue() as string}
          </div>
        ),
        size: 150,
      },
      // Responsible Person column
      {
        accessorKey: 'responsiblePerson',
        header: 'Responsible Person',
        cell: (info) => info.getValue() as string,
        size: 180,
      },
      // Date Identified column
      {
        accessorKey: 'dateIdentified',
        header: 'Date Identified',
        cell: (info) => formatDate(info.getValue() as Timestamp),
        size: 130,
      },
      // Date Due column
      {
        accessorKey: 'dateDue',
        header: 'Date Due',
        cell: (info) => formatDate(info.getValue() as Timestamp),
        size: 130,
      },
      // Risk Level column
      {
        accessorKey: 'riskLevel',
        header: 'Risk Level',
        cell: (info) => {
          const riskLevel = info.getValue() as number;
          return (
            <div className="flex items-center">
              <span className="font-medium">{riskLevel}</span>
              <span className="text-gray-500 text-xs ml-1">/10</span>
            </div>
          );
        },
        size: 100,
      },
    ],
    []
  );

  // Create table instance
  const table = useReactTable({
    data: findings,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Track previous selection to avoid unnecessary callbacks
  const prevSelectionRef = React.useRef<string>('');

  // Notify parent component when row selection changes
  React.useEffect(() => {
    if (onRowSelectionChange) {
      const selectedRows = table
        .getSelectedRowModel()
        .rows.map((row) => row.original);
      
      // Only call callback if selection actually changed
      const currentSelection = JSON.stringify(Object.keys(rowSelection).sort());
      if (currentSelection !== prevSelectionRef.current) {
        prevSelectionRef.current = currentSelection;
        onRowSelectionChange(selectedRows);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading findings...</div>
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <p className="text-gray-500 text-lg">No findings found</p>
          <p className="text-gray-400 text-sm mt-2">
            Try adjusting your filters or search criteria
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full border border-gray-200 rounded-lg shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? 'cursor-pointer select-none flex items-center gap-2 hover:text-gray-900'
                            : ''
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <span className="text-gray-400">
                            {{
                              asc: '↑',
                              desc: '↓',
                            }[header.column.getIsSorted() as string] ?? '↕'}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick && onRowClick(row.original)}
                className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                  row.getIsSelected() ? 'bg-blue-50' : ''
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                    onClick={(e) => {
                      // Prevent row click when clicking checkbox
                      if (cell.column.id === 'select') {
                        e.stopPropagation();
                      }
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Selection summary */}
      {Object.keys(rowSelection).length > 0 && (
        <div className="px-4 py-3 bg-blue-50 border-t border-blue-200">
          <p className="text-sm text-blue-800">
            {Object.keys(rowSelection).length} row(s) selected
          </p>
        </div>
      )}

      {/* Pagination controls */}
      {onPageChange && onPageSizeChange && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={calculatedTotalItems}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
};
