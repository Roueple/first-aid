/**
 * Audit Logs Page
 * 
 * Page component for viewing audit logs
 * Accessible only to administrators
 * 
 * Requirements: 10.5
 */

import { AuditLogViewer } from '../../components/AuditLogViewer';
import { useNavigate } from 'react-router-dom';

export function AuditLogsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
            <p className="mt-1 text-sm text-gray-600">
              Security and compliance tracking
            </p>
          </div>
          <button
            onClick={() => navigate('/home')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AuditLogViewer />
      </main>
    </div>
  );
}
