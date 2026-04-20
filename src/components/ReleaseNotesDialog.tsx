import React from 'react';
import { X } from 'lucide-react';

interface ReleaseNotesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReleaseNotesDialog: React.FC<ReleaseNotesDialogProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">🎉 What's New in v1.0.4</h2>
            <p className="text-sm text-blue-100 mt-1">April 20, 2026</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-120px)] px-6 py-4">
          {/* Main Feature */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-600">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              🎯 Enhanced Bernard Chat Interface
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>25 New Sample Prompts</strong> organized into 5 categories covering Indonesian real estate audit domains. 
              Smart placeholder text now shows relevant example queries to guide you!
            </p>
          </div>

          {/* Categories */}
          <div className="space-y-4 mb-6">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Sample Prompt Categories:</h4>
            
            <div className="grid gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="font-medium text-gray-900 dark:text-gray-100">🏘️ By Proyek & Kategori Temuan</div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Project-specific queries (CitraLand, Ciputra World, SH2, Ciputra Hospital)
                </p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="font-medium text-gray-900 dark:text-gray-100">💰 Finance & Accounting</div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Piutang, cash opname, accounting procedures, SPK/PO compliance
                </p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="font-medium text-gray-900 dark:text-gray-100">🏗️ Engineering & QS</div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Material compliance, BAST, retention clauses, volume discrepancies
                </p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="font-medium text-gray-900 dark:text-gray-100">⚖️ Legal & Legalitas</div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  IMB, SPPJB, PPATK reporting, certificate discrepancies, AJB status
                </p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="font-medium text-gray-900 dark:text-gray-100">🏢 Estate & Property Management</div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Security, lift/ARD systems, cleanliness, BPJS procedures, maintenance
                </p>
              </div>
            </div>
          </div>

          {/* Improvements */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">🔧 Improvements</h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Improved Bernard results table styling and theme consistency</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Enhanced chat interface animations and visual feedback</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Cleaned up 27 obsolete icon and logo files</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Better organized logo resources</span>
              </li>
            </ul>
          </div>

          {/* Bug Fixes */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">🐛 Bug Fixes</h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Fixed report chat dialog functionality</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Improved Bernard service error handling</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Enhanced vanish input component stability</span>
              </li>
            </ul>
          </div>

          {/* Coming Soon */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">🔜 Coming Soon</h4>
            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li>• Interactive onboarding tutorial</li>
              <li>• Enhanced smart query routing</li>
              <li>• Additional sample prompts based on user feedback</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};
