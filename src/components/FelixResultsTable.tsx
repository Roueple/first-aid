import React, { useState } from 'react';

interface FelixResultsTableProps {
  results: any[];
  table: string;
  maxRows?: number;
}

/**
 * FelixResultsTable - Modern table display for Felix query results
 * 
 * Features:
 * - Max 20 rows display
 * - Clickable rows with expandable detail view
 * - Responsive design
 * - Table-specific column rendering
 * - Clean, modern styling
 */
export const FelixResultsTable: React.FC<FelixResultsTableProps> = ({
  results,
  table,
  maxRows = 20
}) => {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  if (!results || results.length === 0) {
    return null;
  }

  const displayResults = results.slice(0, maxRows);
  const hasMore = results.length > maxRows;

  const toggleRow = (index: number) => {
    setExpandedRow(expandedRow === index ? null : index);
  };

  // Render audit-results table
  if (table === 'audit-results') {
    return (
      <div className="felix-results-table">
        <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">No</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Year</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Project</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Department</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Risk Area</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Code</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Bobot</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Kadar</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Nilai</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayResults.map((result, index) => (
                <React.Fragment key={result.id || index}>
                  <tr 
                    onClick={() => toggleRow(index)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">
                          {expandedRow === index ? '▼' : '▶'}
                        </span>
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-900 whitespace-nowrap">{result.year}</td>
                    <td className="px-3 py-2 text-gray-900 max-w-xs truncate" title={result.projectName}>
                      {result.projectName}
                    </td>
                    <td className="px-3 py-2 text-gray-900 whitespace-nowrap">{result.department}</td>
                    <td className="px-3 py-2 text-gray-900 max-w-[150px] truncate" title={result.riskArea}>
                      {result.riskArea}
                    </td>
                    <td className="px-3 py-2 text-gray-600 max-w-xs truncate" title={result.description}>
                      {result.description}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {result.code}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {result.bobot || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {result.kadar || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {result.nilai}
                      </span>
                    </td>
                  </tr>
                  {expandedRow === index && (
                    <tr className="bg-blue-50">
                      <td colSpan={10} className="px-6 py-4">
                        <div className="space-y-3 text-sm">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="font-semibold text-gray-700">Project Name:</span>
                              <p className="text-gray-900 mt-1">{result.projectName}</p>
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700">Year:</span>
                              <p className="text-gray-900 mt-1">{result.year}</p>
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700">Department:</span>
                              <p className="text-gray-900 mt-1">{result.department}</p>
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700">Risk Area:</span>
                              <p className="text-gray-900 mt-1">{result.riskArea}</p>
                            </div>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">Description:</span>
                            <p className="text-gray-900 mt-1 whitespace-pre-wrap">{result.description}</p>
                          </div>
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <span className="font-semibold text-gray-700">Code:</span>
                              <p className="text-gray-900 mt-1">{result.code}</p>
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700">Bobot:</span>
                              <p className="text-gray-900 mt-1">{result.bobot || '-'}</p>
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700">Kadar:</span>
                              <p className="text-gray-900 mt-1">{result.kadar || '-'}</p>
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700">Nilai:</span>
                              <p className="text-gray-900 mt-1">{result.nilai}</p>
                            </div>
                          </div>
                          {result.id && (
                            <div>
                              <span className="font-semibold text-gray-700">ID:</span>
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
        {hasMore && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            Showing {maxRows} of {results.length} results. Download Excel to see all.
          </div>
        )}
      </div>
    );
  }

  // Render projects table
  if (table === 'projects') {
    return (
      <div className="felix-results-table">
        <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">No</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Project ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Initials</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Project Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">SH</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Findings</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayResults.map((result, index) => (
                <React.Fragment key={result.id || index}>
                  <tr 
                    onClick={() => toggleRow(index)}
                    className="hover:bg-green-50 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">
                          {expandedRow === index ? '▼' : '▶'}
                        </span>
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-900 font-mono text-xs whitespace-nowrap">
                      {result.projectId}
                    </td>
                    <td className="px-3 py-2 text-gray-900 font-semibold whitespace-nowrap">
                      {result.initials}
                    </td>
                    <td className="px-3 py-2 text-gray-900 max-w-md truncate" title={result.projectName}>
                      {result.projectName}
                    </td>
                    <td className="px-3 py-2 text-gray-900 whitespace-nowrap">{result.sh}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {result.finding || 0}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {result.total || 0}
                      </span>
                    </td>
                  </tr>
                  {expandedRow === index && (
                    <tr className="bg-green-50">
                      <td colSpan={7} className="px-6 py-4">
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
        {hasMore && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            Showing {maxRows} of {results.length} results. Download Excel to see all.
          </div>
        )}
      </div>
    );
  }

  // Render departments table
  if (table === 'departments') {
    return (
      <div className="felix-results-table">
        <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">No</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Category</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Original Names</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayResults.map((result, index) => (
                <React.Fragment key={result.id || index}>
                  <tr 
                    onClick={() => toggleRow(index)}
                    className="hover:bg-purple-50 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">
                          {expandedRow === index ? '▼' : '▶'}
                        </span>
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-900 font-medium">{result.name}</td>
                    <td className="px-3 py-2 text-gray-900">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {result.category}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 max-w-md truncate" title={result.originalNames?.join(', ')}>
                      {result.originalNames?.join(', ')}
                    </td>
                  </tr>
                  {expandedRow === index && (
                    <tr className="bg-purple-50">
                      <td colSpan={4} className="px-6 py-4">
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
        {hasMore && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            Showing {maxRows} of {results.length} results. Download Excel to see all.
          </div>
        )}
      </div>
    );
  }

  // Generic table for unknown types
  return (
    <div className="felix-results-table">
      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">No</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Data</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayResults.map((result, index) => (
              <React.Fragment key={result.id || index}>
                <tr 
                  onClick={() => toggleRow(index)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">
                        {expandedRow === index ? '▼' : '▶'}
                      </span>
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-900">
                    <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>
                  </td>
                </tr>
                {expandedRow === index && (
                  <tr className="bg-gray-50">
                    <td colSpan={2} className="px-6 py-4">
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
      {hasMore && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Showing {maxRows} of {results.length} results. Download Excel to see all.
        </div>
      )}
    </div>
  );
};

export default FelixResultsTable;
