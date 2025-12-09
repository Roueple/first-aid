import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuditResultsTable from '../../components/AuditResultsTable';
import { AuditResult } from '../../services/AuditResultService';

/**
 * Audit Results Page - Display all audit results with filtering and sorting
 */
export const AuditResultsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleResultSelect = (result: AuditResult) => {
    console.log('Selected audit result:', result);
    
    // Show details in alert for now
    alert(
      `Audit Result Details:\n\n` +
      `ID: ${result.auditResultId}\n` +
      `Year: ${result.year}\n` +
      `Project: ${result.projectName}\n` +
      `Department: ${result.department}\n` +
      `Risk Area: ${result.riskArea}\n` +
      `Code: ${result.code}\n` +
      `Nilai: ${result.nilai}\n\n` +
      `Description: ${result.descriptions}`
    );
  };

  const handleBackToMenu = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-full">
        {/* Page Header */}
        <div className="mb-4 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={handleBackToMenu}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Back to Main Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Back to Menu</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Audit Results Management
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            View and analyze all audit results from Master-finding.xlsx. Click on a result to see details.
          </p>
        </div>

        {/* Audit Results Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <AuditResultsTable onResultSelect={handleResultSelect} />
        </div>

        {/* Help Text */}
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            💡 Quick Tips
          </h3>
          <ul className="text-xs sm:text-sm text-blue-800 space-y-1">
            <li>• Click column headers to sort by that field</li>
            <li>• Use the search box to filter across all fields</li>
            <li>• Filter by specific year or subholding (SH)</li>
            <li>• Click "Export to Excel" to download filtered results</li>
            <li>• Click on any row to view full details</li>
            <li>• Showing 50 results per page for better performance</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AuditResultsPage;
