import React, { useState, useEffect } from 'react';
import { FindingFilters, DateRangeFilter } from '../types/filter.types';
import { FindingSeverity, FindingStatus } from '../types/finding.types';

interface FilterPanelProps {
  filters: FindingFilters;
  onFiltersChange: (filters: FindingFilters) => void;
  availableLocations?: string[];
  availableCategories?: string[];
}

/**
 * FilterPanel Component
 * 
 * Multi-select filter panel for findings with:
 * - Severity filter (multi-select)
 * - Status filter (multi-select)
 * - Location filter (multi-select)
 * - Category filter (multi-select)
 * - Date range picker for dateIdentified
 * - Clear All Filters button
 * 
 * Requirements: 3.2, 3.5
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  availableLocations = [],
  availableCategories = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Severity options
  const severityOptions: FindingSeverity[] = ['Critical', 'High', 'Medium', 'Low'];

  // Status options
  const statusOptions: FindingStatus[] = ['Open', 'In Progress', 'Closed', 'Deferred'];

  // Handle severity toggle
  const handleSeverityToggle = (severity: FindingSeverity) => {
    const currentSeverities = filters.severity || [];
    const newSeverities = currentSeverities.includes(severity)
      ? currentSeverities.filter((s) => s !== severity)
      : [...currentSeverities, severity];

    onFiltersChange({
      ...filters,
      severity: newSeverities.length > 0 ? newSeverities : undefined,
    });
  };

  // Handle status toggle
  const handleStatusToggle = (status: FindingStatus) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];

    onFiltersChange({
      ...filters,
      status: newStatuses.length > 0 ? newStatuses : undefined,
    });
  };

  // Handle location toggle
  const handleLocationToggle = (location: string) => {
    const currentLocations = filters.location || [];
    const newLocations = currentLocations.includes(location)
      ? currentLocations.filter((l) => l !== location)
      : [...currentLocations, location];

    onFiltersChange({
      ...filters,
      location: newLocations.length > 0 ? newLocations : undefined,
    });
  };

  // Handle category toggle
  const handleCategoryToggle = (category: string) => {
    const currentCategories = filters.category || [];
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter((c) => c !== category)
      : [...currentCategories, category];

    onFiltersChange({
      ...filters,
      category: newCategories.length > 0 ? newCategories : undefined,
    });
  };

  // Handle date range change
  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    const currentDateRange = filters.dateIdentified || {};
    const newDateRange: DateRangeFilter = {
      ...currentDateRange,
      [field]: value ? new Date(value) : undefined,
    };

    // Remove undefined values
    if (!newDateRange.start && !newDateRange.end) {
      const { dateIdentified, ...rest } = filters;
      onFiltersChange(rest);
    } else {
      onFiltersChange({
        ...filters,
        dateIdentified: newDateRange,
      });
    }
  };

  // Clear all filters
  const handleClearAll = () => {
    onFiltersChange({});
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return (
      (filters.severity && filters.severity.length > 0) ||
      (filters.status && filters.status.length > 0) ||
      (filters.location && filters.location.length > 0) ||
      (filters.category && filters.category.length > 0) ||
      (filters.dateIdentified && (filters.dateIdentified.start || filters.dateIdentified.end))
    );
  };

  // Format date for input
  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          {hasActiveFilters() && (
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters() && (
            <button
              onClick={handleClearAll}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Clear All
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label={isExpanded ? 'Collapse filters' : 'Expand filters'}
          >
            <svg
              className={`w-5 h-5 transform transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity
            </label>
            <div className="space-y-2">
              {severityOptions.map((severity) => (
                <label
                  key={severity}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={filters.severity?.includes(severity) || false}
                    onChange={() => handleSeverityToggle(severity)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{severity}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="space-y-2">
              {statusOptions.map((status) => (
                <label
                  key={status}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={filters.status?.includes(status) || false}
                    onChange={() => handleStatusToggle(status)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{status}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Location Filter */}
          {availableLocations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableLocations.map((location) => (
                  <label
                    key={location}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.location?.includes(location) || false}
                      onChange={() => handleLocationToggle(location)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{location}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Category Filter */}
          {availableCategories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableCategories.map((category) => (
                  <label
                    key={category}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.category?.includes(category) || false}
                      onChange={() => handleCategoryToggle(category)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{category}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Identified
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">From</label>
                <input
                  type="date"
                  value={formatDateForInput(filters.dateIdentified?.start)}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">To</label>
                <input
                  type="date"
                  value={formatDateForInput(filters.dateIdentified?.end)}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
