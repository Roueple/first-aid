import React from 'react';
import AuditResultsTable from '../../components/AuditResultsTable';
import { AuditResult } from '../../services/AuditResultService';

/**
 * Audit Results Page - Display all audit results with filtering and sorting
 */
export const AuditResultsPage: React.FC = () => {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Audit Results Management
          </h1>
          <p className="text-gray-600">
            View and analyze all audit results from Master-finding.xlsx. Click on a result to see details.
          </p>
        </div>

        {/* Audit Results Table */}
        <div className="bg-white rounded-lg shadow">
          <AuditResultsTable onResultSelect={handleResultSelect} />
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            💡 Quick Tips
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Click column headers to sort by that field</li>
            <li>• Use the search box to filter across all fields</li>
            <li>• Filter by specific year or subholding (SH)</li>
            <li>• Click "Export to Excel" to download filtered results</li>
            <li>• Click on any row to view full details</li>
            <li>• Currently showing {'{'}8996+{'}'} audit results</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AuditResultsPage;
