import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X, ChevronDown, ChevronUp } from 'lucide-react';

interface BernardResultsTableProps {
  results: any[];
  table: string;
  maxRows?: number;
}

/**
 * Format description text by adding line breaks after key Indonesian audit terms
 * for better readability in the table view
 */
const formatDescription = (text: string): string => {
  if (!text) return text;

  return text
    .replace(/\s+(Berdasarkan)/g, '\n\n$1')
    .replace(/^(Berdasarkan)/g, '$1')
    .replace(/\s+(Rekomendasi)/gi, '\n\n$1')
    .replace(/\s+(Kesimpulan)/gi, '\n\n$1')
    .replace(/\s+(Temuan)/gi, '\n\n$1')
    .trim();
};

/**
 * Truncate text with ellipsis
 */
const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text || '-';
  return text.slice(0, maxLength).trim() + '...';
};

/**
 * BernardResultsTable - Modern card-based table display for Bernard query results
 *
 * Features:
 * - Card-style rows for better readability
 * - Full-screen modal view option
 * - Paginated display (20 rows per page)
 * - Clickable rows with expandable detail view
 * - Responsive design
 * - Clean, scannable layout
 */
export const BernardResultsTable: React.FC<BernardResultsTableProps> = ({
  results,
  table,
  maxRows = 20
}) => {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [filters, setFilters] = useState<{
    subholding: string;
    proyek: string;
    department: string;
    riskArea: string;
    deskripsi: string;
  }>({
    subholding: '',
    proyek: '',
    department: '',
    riskArea: '',
    deskripsi: ''
  });

  // Reset to page 1 when results change
  useEffect(() => {
    setCurrentPage(1);
    setExpandedRow(null);
    setFilters({
      subholding: '',
      proyek: '',
      department: '',
      riskArea: '',
      deskripsi: ''
    });
  }, [results]);

  // Handle escape key to close fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullScreen]);

  if (!results || results.length === 0) {
    return null;
  }

  // Apply filters
  const filteredResults = results.filter(result => {
    if (filters.subholding && !result.subholding?.toLowerCase().includes(filters.subholding.toLowerCase())) {
      return false;
    }
    if (filters.proyek && !result.proyek?.toLowerCase().includes(filters.proyek.toLowerCase())) {
      return false;
    }
    if (filters.department && !result.department?.toLowerCase().includes(filters.department.toLowerCase())) {
      return false;
    }
    if (filters.riskArea && !result.riskArea?.toLowerCase().includes(filters.riskArea.toLowerCase())) {
      return false;
    }
    if (filters.deskripsi && !result.deskripsi?.toLowerCase().includes(filters.deskripsi.toLowerCase())) {
      return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredResults.length / maxRows);
  const startIndex = (currentPage - 1) * maxRows;
  const endIndex = Math.min(startIndex + maxRows, filteredResults.length);
  const displayResults = filteredResults.slice(startIndex, endIndex);

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

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
    setExpandedRow(null);
  };

  const clearFilters = () => {
    setFilters({
      subholding: '',
      proyek: '',
      department: '',
      riskArea: '',
      deskripsi: ''
    });
    setCurrentPage(1);
    setExpandedRow(null);
  };

  const hasActiveFilters = Object.values(filters).some(f => f !== '');

  // Header with fullscreen toggle and pagination info
  const TableHeader = () => (
    <div className="brt-header">
      <div className="brt-header-left">
        <span className="brt-result-count">
          {filteredResults.length} {filteredResults.length === 1 ? 'finding' : 'findings'}
          {hasActiveFilters && (
            <span className="brt-filtered-note">
              (filtered from {results.length})
            </span>
          )}
        </span>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="brt-clear-filters">
            Clear filters
          </button>
        )}
      </div>
      <div className="brt-header-right">
        <button
          onClick={() => setIsFullScreen(!isFullScreen)}
          className="brt-fullscreen-btn"
          title={isFullScreen ? "Exit full screen" : "View full screen"}
        >
          {isFullScreen ? <X size={16} /> : <Maximize2 size={16} />}
          <span>{isFullScreen ? 'Close' : 'Expand'}</span>
        </button>
      </div>
    </div>
  );

  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="brt-pagination">
        <span className="brt-pagination-info">
          {startIndex + 1}-{endIndex} of {filteredResults.length}
        </span>
        <div className="brt-pagination-buttons">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="brt-page-btn"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="brt-page-indicator">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="brt-page-btn"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  // Render audit-results table (handle both 'audit-results' and 'audit_results')
  if (table === 'audit-results' || table === 'audit_results') {
    const TableContent = () => (
      <div className={`brt-container ${isFullScreen ? 'brt-fullscreen' : ''}`}>
        <TableHeader />

        {/* Filter Row */}
        <div className="brt-filters">
          <input
            type="text"
            placeholder="Filter SH..."
            value={filters.subholding}
            onChange={(e) => handleFilterChange('subholding', e.target.value)}
            className="brt-filter-input brt-filter-sm"
          />
          <input
            type="text"
            placeholder="Filter Proyek..."
            value={filters.proyek}
            onChange={(e) => handleFilterChange('proyek', e.target.value)}
            className="brt-filter-input brt-filter-md"
          />
          <input
            type="text"
            placeholder="Filter Dept..."
            value={filters.department}
            onChange={(e) => handleFilterChange('department', e.target.value)}
            className="brt-filter-input brt-filter-sm"
          />
          <input
            type="text"
            placeholder="Filter Risk Area..."
            value={filters.riskArea}
            onChange={(e) => handleFilterChange('riskArea', e.target.value)}
            className="brt-filter-input brt-filter-md"
          />
          <input
            type="text"
            placeholder="Search description..."
            value={filters.deskripsi}
            onChange={(e) => handleFilterChange('deskripsi', e.target.value)}
            className="brt-filter-input brt-filter-lg"
          />
        </div>

        {/* Card-based Table */}
        <div className="brt-table-wrapper">
          <table className="brt-table">
            <thead>
              <tr>
                <th className="brt-th brt-th-no">#</th>
                <th className="brt-th brt-th-sh">SH</th>
                <th className="brt-th brt-th-proyek">Proyek</th>
                <th className="brt-th brt-th-dept">Department</th>
                <th className="brt-th brt-th-risk">Risk Area</th>
                <th className="brt-th brt-th-desc">Deskripsi</th>
              </tr>
            </thead>
            <tbody>
              {displayResults.map((result, index) => (
                <React.Fragment key={result.id || index}>
                  <tr
                    onClick={() => toggleRow(index)}
                    className={`brt-row ${expandedRow === index ? 'brt-row-expanded' : ''}`}
                    data-tutorial={index === 0 ? "table-row-first" : undefined}
                  >
                    <td className="brt-td brt-td-no">
                      <div className="brt-no-cell">
                        <span className="brt-expand-icon">
                          {expandedRow === index ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </span>
                        <span>{startIndex + index + 1}</span>
                      </div>
                    </td>
                    <td className="brt-td brt-td-sh">
                      <span className="brt-badge brt-badge-sh">{result.subholding || '-'}</span>
                    </td>
                    <td className="brt-td brt-td-proyek">
                      <div className="brt-text-cell" title={result.proyek}>
                        {isFullScreen ? result.proyek || '-' : truncateText(result.proyek, 40)}
                      </div>
                    </td>
                    <td className="brt-td brt-td-dept">
                      <div className="brt-text-cell" title={result.department}>
                        {truncateText(result.department, 25)}
                      </div>
                    </td>
                    <td className="brt-td brt-td-risk">
                      <div className="brt-text-cell brt-text-risk" title={result.riskArea}>
                        {isFullScreen ? result.riskArea || '-' : truncateText(result.riskArea, 35)}
                      </div>
                    </td>
                    <td className="brt-td brt-td-desc">
                      <div className="brt-text-cell brt-text-desc" title={result.deskripsi}>
                        {isFullScreen
                          ? (result.deskripsi ? formatDescription(result.deskripsi).slice(0, 200) + (result.deskripsi.length > 200 ? '...' : '') : '-')
                          : truncateText(result.deskripsi, 100)
                        }
                      </div>
                    </td>
                  </tr>
                  {expandedRow === index && (
                    <tr className="brt-detail-row">
                      <td colSpan={6}>
                        <div className="brt-detail-content">
                          <div className="brt-detail-grid">
                            <div className="brt-detail-item">
                              <label>Subholding</label>
                              <p>{result.subholding || '-'}</p>
                            </div>
                            <div className="brt-detail-item">
                              <label>Year</label>
                              <p>{result.year || '-'}</p>
                            </div>
                            <div className="brt-detail-item brt-detail-span-2">
                              <label>Proyek</label>
                              <p>{result.proyek || '-'}</p>
                            </div>
                            <div className="brt-detail-item brt-detail-span-2">
                              <label>Department</label>
                              <p>{result.department || '-'}</p>
                            </div>
                            <div className="brt-detail-item brt-detail-span-2">
                              <label>Risk Area</label>
                              <p className="brt-detail-risk">{result.riskArea || '-'}</p>
                            </div>
                          </div>
                          <div className="brt-detail-full">
                            <label>Deskripsi</label>
                            <div className="brt-detail-description">
                              {formatDescription(result.deskripsi || '-')}
                            </div>
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

        <PaginationControls />
      </div>
    );

    // Full screen modal
    if (isFullScreen) {
      return (
        <div className="brt-modal-overlay" onClick={() => setIsFullScreen(false)}>
          <div className="brt-modal" onClick={(e) => e.stopPropagation()}>
            <TableContent />
          </div>
        </div>
      );
    }

    return (
      <div className="bernard-results-table w-full" data-tutorial="results-table">
        <TableContent />
      </div>
    );
  }

  // Render projects table
  if (table === 'projects') {
    const TableContent = () => (
      <div className={`brt-container ${isFullScreen ? 'brt-fullscreen' : ''}`}>
        <TableHeader />

        <div className="brt-table-wrapper">
          <table className="brt-table">
            <thead>
              <tr>
                <th className="brt-th brt-th-no">#</th>
                <th className="brt-th">Project ID</th>
                <th className="brt-th">Initials</th>
                <th className="brt-th">Project Name</th>
                <th className="brt-th brt-th-sh">SH</th>
                <th className="brt-th brt-th-num">Findings</th>
                <th className="brt-th brt-th-num">Total</th>
              </tr>
            </thead>
            <tbody>
              {displayResults.map((result, index) => (
                <React.Fragment key={result.id || index}>
                  <tr
                    onClick={() => toggleRow(index)}
                    className={`brt-row ${expandedRow === index ? 'brt-row-expanded' : ''}`}
                  >
                    <td className="brt-td brt-td-no">
                      <div className="brt-no-cell">
                        <span className="brt-expand-icon">
                          {expandedRow === index ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </span>
                        <span>{startIndex + index + 1}</span>
                      </div>
                    </td>
                    <td className="brt-td">
                      <code className="brt-code">{result.projectId}</code>
                    </td>
                    <td className="brt-td">
                      <span className="brt-badge brt-badge-initials">{result.initials}</span>
                    </td>
                    <td className="brt-td">
                      <div className="brt-text-cell" title={result.projectName}>
                        {isFullScreen ? result.projectName : truncateText(result.projectName, 50)}
                      </div>
                    </td>
                    <td className="brt-td brt-td-sh">
                      <span className="brt-badge brt-badge-sh">{result.subholding}</span>
                    </td>
                    <td className="brt-td brt-td-num">
                      <span className="brt-badge brt-badge-danger">{result.finding || 0}</span>
                    </td>
                    <td className="brt-td brt-td-num">
                      <span className="brt-badge brt-badge-info">{result.total || 0}</span>
                    </td>
                  </tr>
                  {expandedRow === index && (
                    <tr className="brt-detail-row">
                      <td colSpan={7}>
                        <div className="brt-detail-content">
                          <div className="brt-detail-grid">
                            <div className="brt-detail-item">
                              <label>Project ID</label>
                              <p><code>{result.projectId}</code></p>
                            </div>
                            <div className="brt-detail-item">
                              <label>Initials</label>
                              <p className="brt-detail-bold">{result.initials}</p>
                            </div>
                            <div className="brt-detail-item brt-detail-span-2">
                              <label>Project Name</label>
                              <p>{result.projectName}</p>
                            </div>
                            <div className="brt-detail-item">
                              <label>SH</label>
                              <p>{result.subholding}</p>
                            </div>
                            <div className="brt-detail-item">
                              <label>Findings</label>
                              <p className="brt-detail-danger">{result.finding || 0}</p>
                            </div>
                            <div className="brt-detail-item">
                              <label>Total</label>
                              <p className="brt-detail-info">{result.total || 0}</p>
                            </div>
                          </div>
                          {result.id && (
                            <div className="brt-detail-full">
                              <label>Document ID</label>
                              <code className="brt-detail-code">{result.id}</code>
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

        <PaginationControls />
      </div>
    );

    if (isFullScreen) {
      return (
        <div className="brt-modal-overlay" onClick={() => setIsFullScreen(false)}>
          <div className="brt-modal" onClick={(e) => e.stopPropagation()}>
            <TableContent />
          </div>
        </div>
      );
    }

    return (
      <div className="bernard-results-table w-full">
        <TableContent />
      </div>
    );
  }

  // Render departments table
  if (table === 'departments') {
    const TableContent = () => (
      <div className={`brt-container ${isFullScreen ? 'brt-fullscreen' : ''}`}>
        <TableHeader />

        <div className="brt-table-wrapper">
          <table className="brt-table">
            <thead>
              <tr>
                <th className="brt-th brt-th-no">#</th>
                <th className="brt-th">Name</th>
                <th className="brt-th">Category</th>
                <th className="brt-th">Original Names</th>
              </tr>
            </thead>
            <tbody>
              {displayResults.map((result, index) => (
                <React.Fragment key={result.id || index}>
                  <tr
                    onClick={() => toggleRow(index)}
                    className={`brt-row ${expandedRow === index ? 'brt-row-expanded' : ''}`}
                  >
                    <td className="brt-td brt-td-no">
                      <div className="brt-no-cell">
                        <span className="brt-expand-icon">
                          {expandedRow === index ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </span>
                        <span>{startIndex + index + 1}</span>
                      </div>
                    </td>
                    <td className="brt-td">
                      <span className="brt-text-bold">{result.name}</span>
                    </td>
                    <td className="brt-td">
                      <span className="brt-badge brt-badge-success">{result.category}</span>
                    </td>
                    <td className="brt-td">
                      <div className="brt-text-cell" title={result.originalNames?.join(', ')}>
                        {isFullScreen
                          ? result.originalNames?.join(', ')
                          : truncateText(result.originalNames?.join(', '), 60)
                        }
                      </div>
                    </td>
                  </tr>
                  {expandedRow === index && (
                    <tr className="brt-detail-row">
                      <td colSpan={4}>
                        <div className="brt-detail-content">
                          <div className="brt-detail-grid">
                            <div className="brt-detail-item">
                              <label>Department Name</label>
                              <p className="brt-detail-bold">{result.name}</p>
                            </div>
                            <div className="brt-detail-item">
                              <label>Category</label>
                              <p>{result.category}</p>
                            </div>
                          </div>
                          <div className="brt-detail-full">
                            <label>Original Names</label>
                            <div className="brt-tags">
                              {result.originalNames?.map((name: string, i: number) => (
                                <span key={i} className="brt-tag">{name}</span>
                              ))}
                            </div>
                          </div>
                          {result.id && (
                            <div className="brt-detail-full">
                              <label>Document ID</label>
                              <code className="brt-detail-code">{result.id}</code>
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

        <PaginationControls />
      </div>
    );

    if (isFullScreen) {
      return (
        <div className="brt-modal-overlay" onClick={() => setIsFullScreen(false)}>
          <div className="brt-modal" onClick={(e) => e.stopPropagation()}>
            <TableContent />
          </div>
        </div>
      );
    }

    return (
      <div className="bernard-results-table w-full">
        <TableContent />
      </div>
    );
  }

  // Generic table for unknown types
  const TableContent = () => (
    <div className={`brt-container ${isFullScreen ? 'brt-fullscreen' : ''}`}>
      <TableHeader />

      <div className="brt-table-wrapper">
        <table className="brt-table">
          <thead>
            <tr>
              <th className="brt-th brt-th-no">#</th>
              <th className="brt-th">Data</th>
            </tr>
          </thead>
          <tbody>
            {displayResults.map((result, index) => (
              <React.Fragment key={result.id || index}>
                <tr
                  onClick={() => toggleRow(index)}
                  className={`brt-row ${expandedRow === index ? 'brt-row-expanded' : ''}`}
                >
                  <td className="brt-td brt-td-no">
                    <div className="brt-no-cell">
                      <span className="brt-expand-icon">
                        {expandedRow === index ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                      <span>{startIndex + index + 1}</span>
                    </div>
                  </td>
                  <td className="brt-td">
                    <pre className="brt-json-preview">
                      {JSON.stringify(result, null, 2).slice(0, 200)}...
                    </pre>
                  </td>
                </tr>
                {expandedRow === index && (
                  <tr className="brt-detail-row">
                    <td colSpan={2}>
                      <div className="brt-detail-content">
                        <pre className="brt-json-full">{JSON.stringify(result, null, 2)}</pre>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationControls />
    </div>
  );

  if (isFullScreen) {
    return (
      <div className="brt-modal-overlay" onClick={() => setIsFullScreen(false)}>
        <div className="brt-modal" onClick={(e) => e.stopPropagation()}>
          <TableContent />
        </div>
      </div>
    );
  }

  return (
    <div className="bernard-results-table w-full">
      <TableContent />
    </div>
  );
};

export default BernardResultsTable;
