/**
 * Audit Log Viewer Component
 * 
 * Displays audit logs in a filterable table with export functionality
 * for administrators to track user actions and system events.
 * 
 * Requirements: 10.5
 */

import { useState, useEffect } from 'react';
import { auditService } from '../services/AuditService';
import type { AuditLog, AuditAction, ResourceType, AuditLogFilters } from '../types/audit.types';
import { Timestamp } from 'firebase/firestore';

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  // Filter options
  const actionOptions: AuditAction[] = [
    'login',
    'logout',
    'create',
    'update',
    'delete',
    'export',
    'ai_query',
    'import',
    'report_generate',
    'report_download'
  ];

  const resourceTypeOptions: ResourceType[] = [
    'finding',
    'report',
    'chat',
    'user',
    'pattern',
    'session'
  ];

  // Load audit logs
  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedLogs = await auditService.getAuditLogs(filters, 500);
      setLogs(fetchedLogs);
    } catch (err) {
      console.error('Error loading audit logs:', err);
      setError('Failed to load audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load logs on mount and when filters change
  useEffect(() => {
    loadLogs();
  }, [filters]);

  // Handle action filter change
  const handleActionFilterChange = (action: AuditAction) => {
    setFilters(prev => {
      const currentActions = prev.action || [];
      const newActions = currentActions.includes(action)
        ? currentActions.filter(a => a !== action)
        : [...currentActions, action];
      
      return {
        ...prev,
        action: newActions.length > 0 ? newActions : undefined
      };
    });
  };

  // Handle resource type filter change
  const handleResourceTypeFilterChange = (resourceType: ResourceType) => {
    setFilters(prev => {
      const currentTypes = prev.resourceType || [];
      const newTypes = currentTypes.includes(resourceType)
        ? currentTypes.filter(t => t !== resourceType)
        : [...currentTypes, resourceType];
      
      return {
        ...prev,
        resourceType: newTypes.length > 0 ? newTypes : undefined
      };
    });
  };

  // Handle date range filter
  const handleDateRangeApply = () => {
    if (dateRange.start && dateRange.end) {
      setFilters(prev => ({
        ...prev,
        dateRange: {
          start: new Date(dateRange.start),
          end: new Date(dateRange.end)
        }
      }));
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({});
    setDateRange({ start: '', end: '' });
  };

  // Export to CSV
  const handleExport = () => {
    auditService.downloadCSV(logs);
    // Log the export action
    auditService.logExport('user', 'csv', logs.length);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: any): string => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleString();
    }
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }
    return new Date(timestamp).toLocaleString();
  };

  // Format details object
  const formatDetails = (details: Record<string, any>): string => {
    if (!details || Object.keys(details).length === 0) {
      return '-';
    }
    return JSON.stringify(details, null, 2);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Audit Log Viewer</h2>
        <p className="text-gray-600">
          View and filter system audit logs for security and compliance tracking
        </p>
      </div>

      {/* Filters Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        
        {/* Action Filters */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Actions
          </label>
          <div className="flex flex-wrap gap-2">
            {actionOptions.map(action => (
              <button
                key={action}
                onClick={() => handleActionFilterChange(action)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filters.action?.includes(action)
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        {/* Resource Type Filters */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resource Types
          </label>
          <div className="flex flex-wrap gap-2">
            {resourceTypeOptions.map(type => (
              <button
                key={type}
                onClick={() => handleResourceTypeFilterChange(type)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filters.resourceType?.includes(type)
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Range
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleDateRangeApply}
              disabled={!dateRange.start || !dateRange.end}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Filter Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Clear All Filters
          </button>
          <button
            onClick={loadLogs}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Export Button */}
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {logs.length} log{logs.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={handleExport}
          disabled={logs.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export to CSV
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading audit logs...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Logs Table */}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No audit logs found. Try adjusting your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {log.userId.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        {log.resourceType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {log.resourceId ? `${log.resourceId.substring(0, 8)}...` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.ipAddress || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <details className="cursor-pointer">
                        <summary className="text-blue-600 hover:text-blue-800">
                          View Details
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-w-md">
                          {formatDetails(log.details)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
