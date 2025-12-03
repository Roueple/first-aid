/**
 * ChatResultsTable Component
 * 
 * Compact table for displaying query results in chat interface.
 * Features:
 * - Displays max 10 rows
 * - Download to Excel button
 * - Responsive design
 * - Key columns only (ID, Title, Priority, Status, Department, Year)
 */

import React from 'react';
import { Finding } from '../types/finding.types';
import { exportToExcel } from '../utils/excelExport';

interface ChatResultsTableProps {
  findings: Finding[];
  totalCount: number;
  queryText: string;
}

export const ChatResultsTable: React.FC<ChatResultsTableProps> = ({
  findings,
  totalCount,
  queryText,
}) => {
  const displayFindings = findings.slice(0, 10);
  const hasMore = totalCount > 10;

  const handleDownloadExcel = () => {
    exportToExcel(findings, `findings-${Date.now()}.xlsx`, queryText);
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-purple-100 text-purple-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
      case 'Deferred': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (findings.length === 0) {
    return null;
  }

  return (
    <div className="my-4 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Header with download button */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            📊 Results: {totalCount} finding{totalCount !== 1 ? 's' : ''}
          </span>
          {hasMore && (
            <span className="text-xs text-gray-500">
              (showing first 10)
            </span>
          )}
        </div>
        <button
          onClick={handleDownloadExcel}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
          title="Download all results to Excel"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Excel
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                ID
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Title
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Department
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Project
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Year
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayFindings.map((finding) => (
              <tr key={finding.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2 text-xs font-mono text-gray-900 whitespace-nowrap">
                  {finding.id}
                </td>
                <td className="px-3 py-2 text-sm text-gray-900">
                  <div className="max-w-xs truncate" title={finding.findingTitle}>
                    {finding.findingTitle}
                  </div>
                </td>
                <td className="px-3 py-2 text-sm whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(finding.priorityLevel)}`}>
                    {finding.priorityLevel}
                  </span>
                </td>
                <td className="px-3 py-2 text-sm whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(finding.status)}`}>
                    {finding.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                  {finding.findingDepartment}
                </td>
                <td className="px-3 py-2 text-sm text-gray-900">
                  <div className="max-w-xs truncate" title={finding.projectName}>
                    {finding.projectName}
                  </div>
                </td>
                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                  {finding.auditYear}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with more info */}
      {hasMore && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            💡 Showing 10 of {totalCount} results. Download Excel to see all findings.
          </p>
        </div>
      )}
    </div>
  );
};
