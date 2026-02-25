import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FelixResultsTableProps {
  results: any[];
  table: string;
  maxRows?: number;
}

/**
 * FelixResultsTable - Modern table display for Felix query results
 * 
 * Features:
 * - Paginated display (20 rows per page)
 * - Clickable rows with expandable detail view
 * - Responsive design
 * - Table-specific column rendering
 * - Clean, modern styling
 * - Auto-loads all data in background after first page
 */
export const FelixResultsTable: React.FC<FelixResultsTableProps> = ({
  results,
  table,
  maxRows = 20
}) => {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when results change
  useEffect(() => {
    setCurrentPage(1);
    setExpandedRow(null);
  }, [results]);

  if (!results || results.length === 0) {
    return null;
  }

  const totalPages = Math.ceil(results.length / maxRows);
  const startIndex = (currentPage - 1) * maxRows;
  const endIndex = Math.min(startIndex + maxRows, results.length);
  const displayResults = results.slice(startIndex, endIndex);

  const toggleRow = (index: number) => {
    setExpandedRow(expandedRow === index ? null : index);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setExpandedRow(null);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      setExpandedRow(null);
    }
  };

  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span>
            Showing {startIndex + 1}-{endIndex} of {results.length} results
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  // Render audit-results table
  if (table === 'audit-results') {
    return (
      <div className="felix-results-table w-full" data-tutorial="results-table">
        {/* Desktop/Tablet Table View - hidden on mobile */}
        <div className="hidden md:block border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">No</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">Year</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">Project</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">SH</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">Department</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">Risk Area</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayResults.map((result, index) => (
                  <React.Fragment key={result.id || index}>
                    <tr 
                      onClick={() => toggleRow(index)}
                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                      data-tutorial={index === 0 ? "table-row-first" : undefined}
                    >
                      <td className="px-2 py-2 text-gray-500 whitespace-nowrap align-top">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 text-xs">
                            {expandedRow === index ? '▼' : '▶'}
                          </span>
                          <span className="text-xs">{startIndex + index + 1}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-gray-900 whitespace-nowrap align-top text-xs">{result.year}</td>
                      <td className="px-2 py-2 text-gray-900 align-top max-w-[150px]">
                        <div className="break-words line-clamp-2 text-xs" title={result.projectName}>
                          {result.projectName}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-gray-900 whitespace-nowrap align-top text-xs">{result.sh || '-'}</td>
                      <td className="px-2 py-2 text-gray-900 align-top max-w-[120px]">
                        <div className="break-words line-clamp-2 text-xs">
                          {result.department}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-gray-900 align-top max-w-[150px]">
                        <div className="break-words line-clamp-2 text-xs" title={result.riskArea}>
                          {result.riskArea}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-gray-600 align-top max-w-[200px]">
                        <div className="break-words line-clamp-3 text-xs" title={result.description}>
                          {result.description}
                        </div>
                      </td>
                    </tr>
                    {expandedRow === index && (
                      <tr className="bg-blue-50">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <span className="font-semibold text-gray-700">Project Name:</span>
                                <p className="text-gray-900 mt-1">{result.projectName}</p>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-700">Year:</span>
                                <p className="text-gray-900 mt-1">{result.year}</p>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-700">Subholding:</span>
                                <p className="text-gray-900 mt-1">{result.sh || '-'}</p>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-700">Department:</span>
                                <p className="text-gray-900 mt-1">{result.department}</p>
                              </div>
                              <div className="md:col-span-2">
                                <span className="font-semibold text-gray-700">Risk Area:</span>
                                <p className="text-gray-900 mt-1">{result.riskArea}</p>
                              </div>
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700">Description:</span>
                              <p className="text-gray-900 mt-1 whitespace-pre-wrap">{result.description}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {displayResults.map((result, index) => (
            <div 
              key={result.id || index}
              onClick={() => toggleRow(index)}
              className="border border-gray-200 rounded-lg shadow-sm bg-white hover:bg-blue-50 cursor-pointer transition-colors"
            >
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">
                      {expandedRow === index ? '▼' : '▶'}
                    </span>
                    <span className="text-xs font-semibold text-gray-500">#{startIndex + index + 1}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                    {result.year}
                  </span>
                </div>
                
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Project</div>
                  <div className="text-sm text-gray-900 break-words">
                    {result.projectName}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">SH</div>
                    <div className="text-sm text-gray-900">{result.sh || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">Department</div>
                    <div className="text-sm text-gray-900 break-words">{result.department}</div>
                  </div>
                </div>

                {expandedRow !== index && (
                  <>
                    <div>
                      <div className="text-xs font-semibold text-gray-700 mb-1">Risk Area</div>
                      <div className="text-sm text-gray-900 break-words line-clamp-2">
                        {result.riskArea}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-700 mb-1">Description</div>
                      <div className="text-sm text-gray-600 break-words line-clamp-3">
                        {result.description}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {expandedRow === index && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-3 bg-blue-50">
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">Risk Area</div>
                    <div className="text-sm text-gray-900 break-words">
                      {result.riskArea}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">Description</div>
                    <div className="text-sm text-gray-900 break-words whitespace-pre-wrap">
                      {result.description}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <PaginationControls />
      </div>
    );
  }

  // Render projects table
  if (table === 'projects') {
    return (
      <div className="felix-results-table w-full">
        {/* Desktop/Tablet Table View - hidden on mobile */}
        <div className="hidden md:block border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">No</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">Project ID</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">Initials</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">Project Name</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">SH</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">Findings</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayResults.map((result, index) => (
                  <React.Fragment key={result.id || index}>
                    <tr 
                      onClick={() => toggleRow(index)}
                      className="hover:bg-green-50 cursor-pointer transition-colors"
                    >
                      <td className="px-2 py-2 text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 text-xs">
                            {expandedRow === index ? '▼' : '▶'}
                          </span>
                          <span className="text-xs">{startIndex + index + 1}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-gray-900 font-mono text-xs whitespace-nowrap">
                        {result.projectId}
                      </td>
                      <td className="px-2 py-2 text-gray-900 font-semibold text-xs whitespace-nowrap">
                        {result.initials}
                      </td>
                      <td className="px-2 py-2 text-gray-900 max-w-[200px]">
                        <div className="break-words line-clamp-2 text-xs" title={result.projectName}>
                          {result.projectName}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-gray-900 whitespace-nowrap text-xs">{result.sh}</td>
                      <td className="px-2 py-2 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {result.finding || 0}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {result.total || 0}
                        </span>
                      </td>
                    </tr>
                    {expandedRow === index && (
                      <tr className="bg-green-50">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="font-semibold text-gray-700">Project ID:</span>
                                <p className="text-gray-900 mt-1 font-mono">{result.projectId}</p>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-700">Initials:</span>
                                <p className="text-gray-900 mt-1 font-semibold">{result.initials}</p>
                              </div>
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700">Project Name:</span>
                              <p className="text-gray-900 mt-1">{result.projectName}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <span className="font-semibold text-gray-700">SH:</span>
                                <p className="text-gray-900 mt-1">{result.sh}</p>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-700">Findings:</span>
                                <p className="text-gray-900 mt-1">{result.finding || 0}</p>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-700">Total:</span>
                                <p className="text-gray-900 mt-1">{result.total || 0}</p>
                              </div>
                            </div>
                            {result.id && (
                              <div>
                                <span className="font-semibold text-gray-700">Document ID:</span>
                                <p className="text-gray-900 mt-1 font-mono text-xs">{result.id}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {displayResults.map((result, index) => (
            <div 
              key={result.id || index}
              onClick={() => toggleRow(index)}
              className="border border-gray-200 rounded-lg shadow-sm bg-white hover:bg-green-50 cursor-pointer transition-colors"
            >
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">
                      {expandedRow === index ? '▼' : '▶'}
                    </span>
                    <span className="text-xs font-semibold text-gray-500">#{startIndex + index + 1}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {result.finding || 0}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {result.total || 0}
                    </span>
                  </div>
                </div>
                
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Project ID</div>
                  <div className="text-sm text-gray-900 font-mono">{result.projectId}</div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Initials</div>
                  <div className="text-sm text-gray-900 font-semibold">{result.initials}</div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Project Name</div>
                  <div className="text-sm text-gray-900 break-words">
                    {expandedRow === index ? result.projectName : (
                      <div className="line-clamp-2">{result.projectName}</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">SH</div>
                  <div className="text-sm text-gray-900">{result.sh}</div>
                </div>
              </div>

              {expandedRow === index && result.id && (
                <div className="px-4 pb-4 border-t border-gray-200 pt-3 bg-green-50">
                  <div className="text-xs font-semibold text-gray-700 mb-1">Document ID</div>
                  <div className="text-xs text-gray-900 font-mono break-all">{result.id}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        <PaginationControls />
      </div>
    );
  }

  // Render departments table
  if (table === 'departments') {
    return (
      <div className="felix-results-table w-full">
        {/* Desktop/Tablet Table View - hidden on mobile */}
        <div className="hidden md:block border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">No</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">Category</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">Original Names</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayResults.map((result, index) => (
                  <React.Fragment key={result.id || index}>
                    <tr 
                      onClick={() => toggleRow(index)}
                      className="hover:bg-purple-50 cursor-pointer transition-colors"
                    >
                      <td className="px-2 py-2 text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 text-xs">
                            {expandedRow === index ? '▼' : '▶'}
                          </span>
                          <span className="text-xs">{startIndex + index + 1}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-gray-900 font-medium text-xs">{result.name}</td>
                      <td className="px-2 py-2 text-gray-900">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {result.category}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-gray-600 max-w-[250px]">
                        <div className="break-words line-clamp-2 text-xs" title={result.originalNames?.join(', ')}>
                          {result.originalNames?.join(', ')}
                        </div>
                      </td>
                    </tr>
                    {expandedRow === index && (
                      <tr className="bg-purple-50">
                        <td colSpan={4} className="px-4 py-4">
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="font-semibold text-gray-700">Department Name:</span>
                                <p className="text-gray-900 mt-1 font-medium">{result.name}</p>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-700">Category:</span>
                                <p className="text-gray-900 mt-1">{result.category}</p>
                              </div>
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700">Original Names:</span>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {result.originalNames?.map((name: string, i: number) => (
                                  <span 
                                    key={i}
                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-white border border-gray-300 text-gray-700"
                                  >
                                    {name}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {result.id && (
                              <div>
                                <span className="font-semibold text-gray-700">Document ID:</span>
                                <p className="text-gray-900 mt-1 font-mono text-xs">{result.id}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {displayResults.map((result, index) => (
            <div 
              key={result.id || index}
              onClick={() => toggleRow(index)}
              className="border border-gray-200 rounded-lg shadow-sm bg-white hover:bg-purple-50 cursor-pointer transition-colors"
            >
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">
                      {expandedRow === index ? '▼' : '▶'}
                    </span>
                    <span className="text-xs font-semibold text-gray-500">#{startIndex + index + 1}</span>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {result.category}
                  </span>
                </div>
                
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Department Name</div>
                  <div className="text-sm text-gray-900 font-medium break-words">{result.name}</div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Original Names</div>
                  {expandedRow === index ? (
                    <div className="flex flex-wrap gap-2">
                      {result.originalNames?.map((name: string, i: number) => (
                        <span 
                          key={i}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 border border-gray-300 text-gray-700"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 break-words line-clamp-2">
                      {result.originalNames?.join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {expandedRow === index && result.id && (
                <div className="px-4 pb-4 border-t border-gray-200 pt-3 bg-purple-50">
                  <div className="text-xs font-semibold text-gray-700 mb-1">Document ID</div>
                  <div className="text-xs text-gray-900 font-mono break-all">{result.id}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        <PaginationControls />
      </div>
    );
  }

  // Generic table for unknown types
  return (
    <div className="felix-results-table w-full">
      {/* Desktop/Tablet View */}
      <div className="hidden md:block border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">No</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">Data</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayResults.map((result, index) => (
                <React.Fragment key={result.id || index}>
                  <tr 
                    onClick={() => toggleRow(index)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-2 py-2 text-gray-500 whitespace-nowrap align-top">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400 text-xs">
                          {expandedRow === index ? '▼' : '▶'}
                        </span>
                        <span className="text-xs">{startIndex + index + 1}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-gray-900">
                      <pre className="text-xs overflow-x-auto max-w-full">{JSON.stringify(result, null, 2)}</pre>
                    </td>
                  </tr>
                  {expandedRow === index && (
                    <tr className="bg-gray-50">
                      <td colSpan={2} className="px-4 py-4">
                        <div className="space-y-2 text-sm">
                          <span className="font-semibold text-gray-700">Full Details:</span>
                          <pre className="text-xs bg-white p-3 rounded border border-gray-300 overflow-auto max-h-96">
                            {JSON.stringify(result, null, 2)}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {displayResults.map((result, index) => (
          <div 
            key={result.id || index}
            onClick={() => toggleRow(index)}
            className="border border-gray-200 rounded-lg shadow-sm bg-white hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gray-400 text-xs">
                  {expandedRow === index ? '▼' : '▶'}
                </span>
                <span className="text-xs font-semibold text-gray-500">#{startIndex + index + 1}</span>
              </div>
              
              <div className="text-xs text-gray-900 overflow-x-auto">
                <pre className="whitespace-pre-wrap break-words">
                  {expandedRow === index 
                    ? JSON.stringify(result, null, 2)
                    : JSON.stringify(result, null, 2).slice(0, 200) + '...'
                  }
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>

      <PaginationControls />
    </div>
  );
};

export default FelixResultsTable;
