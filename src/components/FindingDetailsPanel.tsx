import React, { useState } from 'react';
import { Finding } from '../types/finding.types';
import { AuditLog } from '../types/audit.types';

interface FindingDetailsPanelProps {
  finding: Finding | null;
  onClose: () => void;
  onEdit?: (finding: Finding) => void;
  onDelete?: (finding: Finding) => void;
}

type TabType = 'details' | 'history' | 'related';

/**
 * FindingDetailsPanel Component
 * 
 * Displays full finding information in a side panel with tabs for:
 * - Details: Complete finding information
 * - History: Audit trail of changes
 * - Related: Related findings based on similarity
 * 
 * Requirements: 3.1, 10.2
 */
export const FindingDetailsPanel: React.FC<FindingDetailsPanelProps> = ({
  finding,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!finding) {
    return null;
  }

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Open':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'In Progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Closed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Deferred':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(finding);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  // Mock audit history - in real implementation, this would be fetched from Firestore
  const mockAuditHistory: AuditLog[] = [
    {
      id: '1',
      userId: 'user123',
      action: 'create',
      resourceType: 'finding',
      resourceId: finding.id,
      details: { message: 'Finding created' },
      timestamp: finding.dateCreated,
    },
    {
      id: '2',
      userId: 'user456',
      action: 'update',
      resourceType: 'finding',
      resourceId: finding.id,
      details: { 
        message: 'Status changed from Open to In Progress',
        changes: { status: { from: 'Open', to: 'In Progress' } }
      },
      timestamp: finding.dateUpdated,
    },
  ];

  // Mock related findings - in real implementation, this would use similarity search
  const mockRelatedFindings: Finding[] = [];

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 truncate">
            Finding Details
          </h2>
          <p className="text-sm text-gray-600 mt-1">ID: {finding.id}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Close panel"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 p-4 border-b border-gray-200 bg-white">
        {onEdit && (
          <button
            onClick={() => onEdit(finding)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </span>
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'details'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('related')}
          className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'related'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Related Findings
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Title and Status */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">{finding.title}</h3>
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getSeverityColor(finding.severity)}`}>
                  {finding.severity}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(finding.status)}`}>
                  {finding.status}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200">
                  Risk Level: {finding.riskLevel}/10
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
              <p className="text-gray-900 leading-relaxed">{finding.description}</p>
            </div>

            {/* Key Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label="Category" value={finding.category} />
              {finding.subcategory && <InfoField label="Subcategory" value={finding.subcategory} />}
              <InfoField label="Location" value={finding.location} />
              {finding.branch && <InfoField label="Branch" value={finding.branch} />}
              {finding.department && <InfoField label="Department" value={finding.department} />}
              <InfoField label="Responsible Person" value={finding.responsiblePerson} />
              {finding.reviewerPerson && <InfoField label="Reviewer" value={finding.reviewerPerson} />}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label="Date Identified" value={formatDate(finding.dateIdentified)} />
              {finding.dateDue && <InfoField label="Due Date" value={formatDate(finding.dateDue)} />}
              {finding.dateCompleted && <InfoField label="Date Completed" value={formatDate(finding.dateCompleted)} />}
              <InfoField label="Created" value={formatDate(finding.dateCreated)} />
              <InfoField label="Last Updated" value={formatDate(finding.dateUpdated)} />
            </div>

            {/* Recommendation */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Recommendation</h4>
              <p className="text-gray-900 leading-relaxed bg-blue-50 p-4 rounded-lg border border-blue-100">
                {finding.recommendation}
              </p>
            </div>

            {/* Management Response */}
            {finding.managementResponse && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Management Response</h4>
                <p className="text-gray-900 leading-relaxed bg-green-50 p-4 rounded-lg border border-green-100">
                  {finding.managementResponse}
                </p>
              </div>
            )}

            {/* Action Plan */}
            {finding.actionPlan && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Action Plan</h4>
                <p className="text-gray-900 leading-relaxed bg-purple-50 p-4 rounded-lg border border-purple-100">
                  {finding.actionPlan}
                </p>
              </div>
            )}

            {/* Evidence */}
            {finding.evidence && finding.evidence.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Evidence</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-900">
                  {finding.evidence.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tags */}
            {finding.tags && finding.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {finding.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Source Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <InfoField label="Original Source" value={finding.originalSource} />
              <InfoField label="Import Batch" value={finding.importBatch} />
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Trail</h3>
            {mockAuditHistory.length > 0 ? (
              <div className="space-y-3">
                {mockAuditHistory.map((log) => (
                  <div key={log.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {log.action}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{log.details.message}</p>
                    {log.details.changes && (
                      <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border border-gray-200">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(log.details.changes, null, 2)}
                        </pre>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">User: {log.userId}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No audit history available</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'related' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Findings</h3>
            {mockRelatedFindings.length > 0 ? (
              <div className="space-y-3">
                {mockRelatedFindings.map((relatedFinding) => (
                  <div key={relatedFinding.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-colors">
                    <h4 className="font-medium text-gray-900 mb-2">{relatedFinding.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{relatedFinding.description}</p>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(relatedFinding.severity)}`}>
                        {relatedFinding.severity}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(relatedFinding.status)}`}>
                        {relatedFinding.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p>No related findings found</p>
                <p className="text-sm mt-2">Related findings will be identified using AI similarity analysis</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this finding? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for displaying information fields
const InfoField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
      {label}
    </h4>
    <p className="text-gray-900">{value}</p>
  </div>
);
