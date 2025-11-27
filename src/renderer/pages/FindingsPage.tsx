import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FindingsTable } from '../../components/FindingsTable';
import { FilterPanel } from '../../components/FilterPanel';
import { SearchBar } from '../../components/SearchBar';
import { FindingDetailsPanel } from '../../components/FindingDetailsPanel';
import { FindingEditDialog } from '../../components/FindingEditDialog';
import { Finding, UpdateFindingInput } from '../../types/finding.types';
import { FindingFilters } from '../../types/filter.types';
import findingsService from '../../services/FindingsService';

/**
 * FindingsPage Component
 * 
 * Example page demonstrating the FindingsTable component
 * This will be expanded in future tasks to include:
 * - Pagination controls (Task 6.2) ✓
 * - Filter panel (Task 6.3) ✓
 * - Search functionality (Task 6.4) ✓
 * - Finding details panel (Task 6.5) ✓
 * - Finding edit dialog (Task 6.6)
 */
export const FindingsPage: React.FC = () => {
  const [allFindings, setAllFindings] = useState<Finding[]>([]);
  const [selectedFindings, setSelectedFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // Filter state
  const [filters, setFilters] = useState<FindingFilters>({});
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Details panel state
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  
  // Edit dialog state
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch findings from Firebase
  useEffect(() => {
    const loadFindings = async () => {
      try {
        setIsLoading(true);
        const result = await findingsService.getFindings(undefined, {
          page: 1,
          pageSize: 10000, // Get all findings for client-side filtering
        });
        setAllFindings(result.items);
      } catch (error) {
        console.error('Error loading findings:', error);
        // Keep empty array on error
        setAllFindings([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadFindings();
  }, []);

  // Extract unique values from findings (NEW SCHEMA)
  const availableSubholdings = useMemo(() => {
    const subholdings = new Set(allFindings.map((f) => f.subholding));
    return Array.from(subholdings).sort();
  }, [allFindings]);

  const availableProcessAreas = useMemo(() => {
    const processAreas = new Set(allFindings.map((f) => f.processArea));
    return Array.from(processAreas).sort();
  }, [allFindings]);

  const availableProjectTypes = useMemo(() => {
    const projectTypes = new Set(allFindings.map((f) => f.projectType));
    return Array.from(projectTypes).sort();
  }, [allFindings]);

  const availablePrimaryTags = useMemo(() => {
    const tags = new Set(allFindings.map((f) => f.primaryTag));
    return Array.from(tags).sort();
  }, [allFindings]);

  // Apply filters and search to findings (NEW SCHEMA)
  const filteredFindings = useMemo(() => {
    return allFindings.filter((finding) => {
      // Search filter - search across title, description, and executor
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = finding.findingTitle.toLowerCase().includes(query);
        const matchesDescription = finding.findingDescription.toLowerCase().includes(query);
        const matchesExecutor = finding.executor.toLowerCase().includes(query);
        const matchesId = finding.id.toLowerCase().includes(query);
        
        if (!matchesTitle && !matchesDescription && !matchesExecutor && !matchesId) {
          return false;
        }
      }

      // Priority filter (was severity)
      const priorityFilter = filters.priorityLevel || filters.severity;
      if (priorityFilter && priorityFilter.length > 0) {
        if (!priorityFilter.includes(finding.priorityLevel)) {
          return false;
        }
      }

      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(finding.status)) {
          return false;
        }
      }

      // Subholding filter (was location)
      const subholdingFilter = filters.subholding || filters.location;
      if (subholdingFilter && subholdingFilter.length > 0) {
        if (!subholdingFilter.includes(finding.subholding)) {
          return false;
        }
      }

      // Process area filter (was category)
      const processAreaFilter = filters.processArea || filters.category;
      if (processAreaFilter && processAreaFilter.length > 0) {
        if (!processAreaFilter.includes(finding.processArea)) {
          return false;
        }
      }

      // Project type filter
      if (filters.projectType && filters.projectType.length > 0) {
        if (!filters.projectType.includes(finding.projectType)) {
          return false;
        }
      }

      // Primary tag filter
      if (filters.primaryTag && filters.primaryTag.length > 0) {
        if (!filters.primaryTag.includes(finding.primaryTag)) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateIdentified) {
        const findingDate = finding.dateIdentified.toDate();
        
        if (filters.dateIdentified.start) {
          const startDate = new Date(filters.dateIdentified.start);
          startDate.setHours(0, 0, 0, 0);
          if (findingDate < startDate) {
            return false;
          }
        }

        if (filters.dateIdentified.end) {
          const endDate = new Date(filters.dateIdentified.end);
          endDate.setHours(23, 59, 59, 999);
          if (findingDate > endDate) {
            return false;
          }
        }
      }

      return true;
    });
  }, [allFindings, filters, searchQuery]);

  // Calculate pagination
  const totalItems = filteredFindings.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedFindings = filteredFindings.slice(startIndex, endIndex);

  const handleRowSelectionChange = useCallback((selected: Finding[]) => {
    setSelectedFindings(selected);
    console.log('Selected findings:', selected);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    // Clear selection when changing pages
    setSelectedFindings([]);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    // Reset to first page when changing page size
    setCurrentPage(1);
    // Clear selection when changing page size
    setSelectedFindings([]);
  }, []);

  const handleFiltersChange = useCallback((newFilters: FindingFilters) => {
    setFilters(newFilters);
    // Reset to first page when filters change
    setCurrentPage(1);
    // Clear selection when filters change
    setSelectedFindings([]);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // Reset to first page when search changes
    setCurrentPage(1);
    // Clear selection when search changes
    setSelectedFindings([]);
  }, []);

  const handleRowClick = useCallback((finding: Finding) => {
    setSelectedFinding(finding);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedFinding(null);
  }, []);

  const handleEdit = useCallback((finding: Finding) => {
    setEditingFinding(finding);
    setIsEditDialogOpen(true);
  }, []);

  const handleSaveEdit = useCallback(async (id: string, data: UpdateFindingInput) => {
    try {
      await findingsService.updateFinding(id, data);
      
      // Fetch the updated finding from the service to ensure consistency
      const updatedFinding = await findingsService.getFindingById(id);
      
      if (updatedFinding) {
        // Update the finding in the local state
        setAllFindings(prev => prev.map(f => 
          f.id === id ? updatedFinding : f
        ));
        
        // Update selected finding if it's the one being edited
        setSelectedFinding(current => 
          current?.id === id ? updatedFinding : current
        );
      }
      
      setIsEditDialogOpen(false);
      setEditingFinding(null);
    } catch (error) {
      console.error('Error updating finding:', error);
      throw error;
    }
  }, []);

  const handleCloseEditDialog = useCallback(() => {
    setIsEditDialogOpen(false);
    setEditingFinding(null);
  }, []);

  const handleDelete = (finding: Finding) => {
    console.log('Delete finding:', finding);
    // TODO: Implement delete functionality
    // In real implementation, this would call FindingsService.deleteFinding()
    setAllFindings(allFindings.filter(f => f.id !== finding.id));
    alert(`Finding "${finding.findingTitle}" has been deleted (mock)`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => window.history.back()}
              className="text-gray-600 hover:text-gray-900 transition p-2 rounded-lg hover:bg-gray-100"
              title="Go back"
            >
              <svg
                className="w-6 h-6"
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Audit Findings</h1>
              <p className="text-gray-600 mt-1">
                View and manage all audit findings
              </p>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        {selectedFindings.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-blue-800 font-medium">
                {selectedFindings.length} finding(s) selected
              </p>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                  Export Selected
                </button>
                <button className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors">
                  Bulk Update
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filter Panel - Left Sidebar */}
          <div className="lg:col-span-1">
            <FilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              availableSubholdings={availableSubholdings}
              availableProcessAreas={availableProcessAreas}
              availableProjectTypes={availableProjectTypes}
              availablePrimaryTags={availablePrimaryTags}
            />
          </div>

          {/* Findings Table - Main Content */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="mb-4">
              <SearchBar
                onSearch={handleSearch}
                placeholder="Search by title, description, or responsible person..."
                debounceMs={300}
              />
              
              {/* Search Result Count */}
              {searchQuery && (
                <div className="mt-2 text-sm text-gray-600">
                  Found <span className="font-semibold">{totalItems}</span> result{totalItems !== 1 ? 's' : ''} for "{searchQuery}"
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow">
              <FindingsTable
                findings={paginatedFindings}
                onRowSelectionChange={handleRowSelectionChange}
                onRowClick={handleRowClick}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          </div>
        </div>

        {/* Finding Details Panel */}
        {selectedFinding && (
          <FindingDetailsPanel
            finding={selectedFinding}
            onClose={handleCloseDetails}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        {/* Finding Edit Dialog */}
        <FindingEditDialog
          finding={editingFinding}
          isOpen={isEditDialogOpen}
          onClose={handleCloseEditDialog}
          onSave={handleSaveEdit}
        />

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">
            Findings Management Features
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Sortable columns - Click any column header to sort</li>
            <li>✓ Row selection - Use checkboxes to select findings</li>
            <li>✓ Color-coded severity and status badges</li>
            <li>✓ Formatted dates and risk levels</li>
            <li>✓ Responsive design with horizontal scrolling</li>
            <li>✓ Pagination controls with page numbers and navigation</li>
            <li>✓ Items-per-page selector (20, 50, 100)</li>
            <li>✓ Total count and current range display</li>
            <li>✓ Multi-select filters for severity, status, location, category</li>
            <li>✓ Date range picker for dateIdentified</li>
            <li>✓ Clear All Filters button</li>
            <li>✓ Search functionality with debounced input</li>
            <li>✓ Search across title, description, and responsible person</li>
            <li>✓ Search result count display</li>
            <li>✓ Finding details panel with tabs (details, history, related)</li>
            <li>✓ Edit and delete action buttons</li>
            <li>✓ Audit trail display</li>
            <li>✓ Edit dialog with form validation and error messages</li>
            <li>✓ Save and cancel buttons with confirmation for unsaved changes</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
