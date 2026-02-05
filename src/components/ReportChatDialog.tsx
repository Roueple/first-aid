import React, { useState } from 'react';
import { X, Send, CheckCircle } from 'lucide-react';
import ComplaintService from '../services/ComplaintService';
import { useAuth } from '../contexts/AuthContext';

interface ReportChatDialogProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportChatDialog: React.FC<ReportChatDialogProps> = ({
  sessionId,
  isOpen,
  onClose,
}) => {
  const { currentUser } = useAuth();
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser?.email) {
      setError('User email not found. Please log in again.');
      return;
    }

    if (!description.trim()) {
      setError('Please describe the issue or request.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await ComplaintService.submitComplaint(
        sessionId,
        currentUser.uid,
        currentUser.email,
        'other', // Default category since we removed the selector
        'User Report', // Default subject
        description.trim()
      );

      setSubmitSuccess(true);
      
      // Auto-close after 1.5 seconds
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      console.error('Error submitting complaint:', err);
      setError('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setDescription('');
    setError(null);
    setSubmitSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Report Issue or Request
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Success Message */}
        {submitSuccess && (
          <div className="m-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">
                  Report submitted successfully!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  We'll review your report and get back to you soon.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        {!submitSuccess && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Describe your issue or request
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us what went wrong or what you'd like to see improved..."
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                disabled={isSubmitting}
                required
                autoFocus
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                💡 The complete chat history will be automatically attached to your report.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !description.trim()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Report
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
