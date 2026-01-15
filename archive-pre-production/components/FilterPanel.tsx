import React, { useState } from 'react';
import { FindingFilters, DateRangeFilter } from '../types/filter.types';
import { FindingSeverity, FindingStatus } from '../types/finding.types';

interface FilterPanelProps {
  filters: FindingFilters;
  onFiltersChange: (filters: FindingFilters) => void;
  // New schema props
  availableSubholdings?: string[];
  availableProcessAreas?: string[];
  availableProjectTypes?: string[];
  availablePrimaryTags?: string[];
  // Backward compatibility
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
  availableSubholdings = [],
  availableProcessAreas = [],
  availableProjectTypes = [],
  availablePrimaryTags = [],
  // Backward compatibility
  availableLocations = [],
  availableCategories = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Priority options (was severity)
  const priorityOptions: FindingSeverity[] = ['Critical', 'High', 'Medium', 'Low'];

  // Status options
  const statusOptions: FindingStatus[] = ['Open', 'In Progress', 'Closed', 'Deferred'];

  // Use new field names, fallback to old for backward compatibility
  const subholdings = availableSubholdings.length > 0 ? availableSubholdings : availableLocations;
  const processAreas = availableProcessAreas.length > 0 ? availableProcessAreas : availableCategories;

  // Handle priority toggle (was severity)
  const handlePriorityToggle = (priority: FindingSeverity) => {
    const currentPriorities = filters.priorityLevel || filters.severity || [];
    const newPriorities = currentPriorities.includes(priority)
      ? currentPriorities.filter((p) => p !== priority)
      : [...currentPriorities, priority];

    onFiltersChange({
      ...filters,
      priorityLevel: newPriorities.length > 0 ? newPriorities : undefined,
      severity: undefined, // Clear old field
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

  // Handle subholding toggle (was location)
  const handleSubholdingToggle = (subholding: string) => {
    const currentSubholdings = filters.subholding || filters.location || [];
    const newSubholdings = currentSubholdings.includes(subholding)
      ? currentSubholdings.filter((s) => s !== subholding)
      : [...currentSubholdings, subholding];

    onFiltersChange({
      ...filters,
      subholding: newSubholdings.length > 0 ? newSubholdings : undefined,
      location: undefined, // Clear old field
    });
  };

  // Handle process area toggle (was category)
  const handleProcessAreaToggle = (processArea: string) => {
    const currentProcessAreas = filters.processArea || filters.category || [];
    const newProcessAreas = currentProcessAreas.includes(processArea)
      ? currentProcessAreas.filter((p) => p !== processArea)
      : [...currentProcessAreas, processArea];

    onFiltersChange({
      ...filters,
      processArea: newProcessAreas.length > 0 ? newProcessAreas : undefined,
      category: undefined, // Clear old field
    });
  };

  // Handle project type toggle
  const handleProjectTypeToggle = (projectType: string) => {
    const currentProjectTypes = filters.projectType || [];
    const newProjectTypes = currentProjectTypes.includes(projectType)
      ? currentProjectTypes.filter((p) => p !== projectType)
      : [...currentProjectTypes, projectType];

    onFiltersChange({
      ...filters,
      projectType: newProjectTypes.length > 0 ? newProjectTypes : undefined,
    });
  };

  // Handle primary tag toggle
  const handlePrimaryTagToggle = (tag: string) => {
    const currentTags = filters.primaryTag || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];

    onFiltersChange({
      ...filters,
      primaryTag: newTags.length > 0 ? newTags : undefined,
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
      (filters.priorityLevel && filters.priorityLevel.length > 0) ||
      (filters.severity && filters.severity.length > 0) ||
      (filters.status && filters.status.length > 0) ||
      (filters.subholding && filters.subholding.length > 0) ||
      (filters.location && filters.location.length > 0) ||
      (filters.processArea && filters.processArea.length > 0) ||
      (filters.category && filters.category.length > 0) ||
      (filters.projectType && filters.projectType.length > 0) ||
      (filters.primaryTag && filters.primaryTag.length > 0) ||
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
          {/* Priority Filter (was Severity) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority Level
            </label>
            <div className="space-y-2">
              {priorityOptions.map((priority) => (
                <label
                  key={priority}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={(filters.priorityLevel || filters.severity)?.includes(priority) || false}
                    onChange={() => handlePriorityToggle(priority)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{priority}</span>
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

          {/* Subholding Filter (was Location) */}
          {subholdings.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subholding
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {subholdings.map((subholding) => (
                  <label
                    key={subholding}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={(filters.subholding || filters.location)?.includes(subholding) || false}
                      onChange={() => handleSubholdingToggle(subholding)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{subholding}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Project Type Filter */}
          {availableProjectTypes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Type
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableProjectTypes.map((projectType) => (
                  <label
                    key={projectType}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.projectType?.includes(projectType) || false}
                      onChange={() => handleProjectTypeToggle(projectType)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{projectType}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Process Area Filter (was Category) */}
          {processAreas.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Process Area
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {processAreas.map((processArea) => (
                  <label
                    key={processArea}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={(filters.processArea || filters.category)?.includes(processArea) || false}
                      onChange={() => handleProcessAreaToggle(processArea)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{processArea}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Primary Tag Filter */}
          {availablePrimaryTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Tag
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availablePrimaryTags.map((tag) => (
                  <label
                    key={tag}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.primaryTag?.includes(tag) || false}
                      onChange={() => handlePrimaryTagToggle(tag)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{tag}</span>
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
