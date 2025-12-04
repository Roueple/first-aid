import React, { useState, useEffect } from 'react';
import { AuditResult } from '../services/AuditResultService';
import auditResultService from '../services/AuditResultService';
import { exportAuditResultsToExcel } from '../utils/auditResultExcelExport';

interface AuditResultsTableProps {
  onResultSelect?: (result: AuditResult) => void;
}

export const AuditResultsTable: React.FC<AuditResultsTableProps> = ({ onResultSelect }) => {
  const [results, setResults] = useState<AuditResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof AuditResult>('year');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterText, setFilterText] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [shFilter, setShFilter] = useState<string>('all');

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      setLoading(true);
      const data = await auditResultService.getAll();
      setResults(data);
      setError(null);
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

  // Get unique years and SH values for filters
  const uniqueYears = React.useMemo(() => {
    const years = new Set(results.map(r => r.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [results]);

  const uniqueSH = React.useMemo(() => {
    const shs = new Set(results.map(r => r.sh));
    return Array.from(shs).sort();
  }, [results]);

  const filteredAndSortedResults = React.useMemo(() => {
    let filtered = results;

    // Apply text filter
    if (filterText) {
      const searchLower = filterText.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.projectName.toLowerCase().includes(searchLower) ||
          r.department.toLowerCase().includes(searchLower) ||
          r.riskArea.toLowerCase().includes(searchLower) ||
          r.descriptions.toLowerCase().includes(searchLower) ||
          r.code.toLowerCase().includes(searchLower) ||
          r.sh.toLowerCase().includes(searchLower)
      );
    }

    // Apply year filter
    if (yearFilter !== 'all') {
      filtered = filtered.filter(r => r.year === parseInt(yearFilter));
    }

    // Apply SH filter
    if (shFilter !== 'all') {
      filtered = filtered.filter(r => r.sh === shFilter);
    }

    // Apply sort
    return [...filtered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const comparison = aVal > bVal ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [results, filterText, yearFilter, shFilter, sortField, sortDirection]);

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Audit Results</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
          >
            📊 Export to Excel
          </button>
          <button
            onClick={loadResults}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search audit results..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="flex-1 min-w-[300px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Years</option>
          {uniqueYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <select
          value={shFilter}
          onChange={(e) => setShFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All SH</option>
          {uniqueSH.map(sh => (
            <option key={sh} value={sh}>{sh}</option>
          ))}
        </select>

        <div className="text-sm text-gray-600">
          Showing {filteredAndSortedResults.length} of {results.length} results
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                No.
              </th>
              <th
                onClick={() => handleSort('auditResultId')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                ID {sortField === 'auditResultId' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('year')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Year {sortField === 'year' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('sh')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                SH {sortField === 'sh' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('projectName')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Project {sortField === 'projectName' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('department')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Department {sortField === 'department' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('riskArea')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Risk Area {sortField === 'riskArea' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th
                onClick={() => handleSort('code')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Code {sortField === 'code' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('bobot')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Bobot {sortField === 'bobot' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('kadar')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Kadar {sortField === 'kadar' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('nilai')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Nilai {sortField === 'nilai' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedResults.map((result, index) => (
              <tr
                key={result.id}
                onClick={() => onResultSelect?.(result)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 text-sm text-gray-500 font-medium">
                  {index + 1}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                  {result.auditResultId}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-center">
                  {result.year}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {result.sh}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                  {result.projectName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {result.department}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {result.riskArea}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                  {result.descriptions}
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {result.code}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-center">
                  {result.bobot}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-center">
                  {result.kadar}
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
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
    </div>
  );
};

export default AuditResultsTable;
