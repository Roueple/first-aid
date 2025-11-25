import React, { useState, useEffect } from 'react';
import { Finding, UpdateFindingInput, FindingSeverity, FindingStatus } from '../types/finding.types';
import { Timestamp } from 'firebase/firestore';

interface FindingEditDialogProps {
  finding: Finding | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: UpdateFindingInput) => Promise<void>;
}

interface FormData {
  title: string;
  description: string;
  severity: FindingSeverity;
  status: FindingStatus;
  category: string;
  subcategory: string;
  location: string;
  branch: string;
  department: string;
  responsiblePerson: string;
  reviewerPerson: string;
  dateIdentified: string;
  dateDue: string;
  dateCompleted: string;
  recommendation: string;
  managementResponse: string;
  actionPlan: string;
  evidence: string;
  tags: string;
  riskLevel: number;
}

interface FormErrors {
  [key: string]: string;
}

/**
 * FindingEditDialog Component
 * 
 * Modal dialog for editing finding properties with form validation
 * 
 * Requirements: 3.4, 12.3
 */
export const FindingEditDialog: React.FC<FindingEditDialogProps> = ({
  finding,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    severity: 'Medium',
    status: 'Open',
    category: '',
    subcategory: '',
    location: '',
    branch: '',
    department: '',
    responsiblePerson: '',
    reviewerPerson: '',
    dateIdentified: '',
    dateDue: '',
    dateCompleted: '',
    recommendation: '',
    managementResponse: '',
    actionPlan: '',
    evidence: '',
    tags: '',
    riskLevel: 5,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when finding changes
  useEffect(() => {
    if (finding && isOpen) {
      const formatDate = (timestamp: any): string => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toISOString().split('T')[0];
      };

      setFormData({
        title: finding.title || '',
        description: finding.description || '',
        severity: finding.severity || 'Medium',
        status: finding.status || 'Open',
        category: finding.category || '',
        subcategory: finding.subcategory || '',
        location: finding.location || '',
        branch: finding.branch || '',
        department: finding.department || '',
        responsiblePerson: finding.responsiblePerson || '',
        reviewerPerson: finding.reviewerPerson || '',
        dateIdentified: formatDate(finding.dateIdentified),
        dateDue: formatDate(finding.dateDue),
        dateCompleted: formatDate(finding.dateCompleted),
        recommendation: finding.recommendation || '',
        managementResponse: finding.managementResponse || '',
        actionPlan: finding.actionPlan || '',
        evidence: finding.evidence?.join('\n') || '',
        tags: finding.tags?.join(', ') || '',
        riskLevel: finding.riskLevel || 5,
      });
      setErrors({});
      setHasChanges(false);
    }
  }, [finding, isOpen]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setHasChanges(true);
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleRiskLevelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFormData((prev) => ({ ...prev, riskLevel: value }));
    setHasChanges(true);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 500) {
      newErrors.title = 'Title must be 500 characters or less';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.responsiblePerson.trim()) {
      newErrors.responsiblePerson = 'Responsible person is required';
    }

    if (!formData.dateIdentified) {
      newErrors.dateIdentified = 'Date identified is required';
    }

    if (!formData.recommendation.trim()) {
      newErrors.recommendation = 'Recommendation is required';
    }

    // Date validation
    if (formData.dateDue && formData.dateIdentified) {
      const identified = new Date(formData.dateIdentified);
      const due = new Date(formData.dateDue);
      if (due < identified) {
        newErrors.dateDue = 'Due date cannot be before date identified';
      }
    }

    if (formData.dateCompleted && formData.dateIdentified) {
      const identified = new Date(formData.dateIdentified);
      const completed = new Date(formData.dateCompleted);
      if (completed < identified) {
        newErrors.dateCompleted = 'Completion date cannot be before date identified';
      }
    }

    // Risk level validation
    if (formData.riskLevel < 1 || formData.riskLevel > 10) {
      newErrors.riskLevel = 'Risk level must be between 1 and 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!finding) return;

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      const updateData: UpdateFindingInput = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        severity: formData.severity,
        status: formData.status,
        category: formData.category.trim(),
        subcategory: formData.subcategory.trim() || undefined,
        location: formData.location.trim(),
        branch: formData.branch.trim() || undefined,
        department: formData.department.trim() || undefined,
        responsiblePerson: formData.responsiblePerson.trim(),
        reviewerPerson: formData.reviewerPerson.trim() || undefined,
        dateIdentified: Timestamp.fromDate(new Date(formData.dateIdentified)),
        dateDue: formData.dateDue ? Timestamp.fromDate(new Date(formData.dateDue)) : undefined,
        dateCompleted: formData.dateCompleted ? Timestamp.fromDate(new Date(formData.dateCompleted)) : undefined,
        recommendation: formData.recommendation.trim(),
        managementResponse: formData.managementResponse.trim() || undefined,
        actionPlan: formData.actionPlan.trim() || undefined,
        evidence: formData.evidence.trim() ? formData.evidence.split('\n').map(e => e.trim()).filter(e => e) : undefined,
        tags: formData.tags.trim() ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : undefined,
        riskLevel: formData.riskLevel,
      };

      await onSave(finding.id, updateData);
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('Error saving finding:', error);
      setErrors({ submit: 'Failed to save finding. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const confirmClose = () => {
    setShowConfirmClose(false);
    setHasChanges(false);
    onClose();
  };

  const cancelClose = () => {
    setShowConfirmClose(false);
  };

  if (!isOpen || !finding) {
    return null;
  }

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Edit Finding</h2>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close dialog"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            <form className="space-y-6">
              {/* Error Message */}
              {errors.submit && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{errors.submit}</p>
                </div>
              )}

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  maxLength={500}
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              </div>

              {/* Severity and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-1">
                    Severity <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="severity"
                    name="severity"
                    value={formData.severity}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Closed">Closed</option>
                    <option value="Deferred">Deferred</option>
                  </select>
                </div>
              </div>

              {/* Category and Subcategory */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.category ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
                </div>

                <div>
                  <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700 mb-1">
                    Subcategory
                  </label>
                  <input
                    type="text"
                    id="subcategory"
                    name="subcategory"
                    value={formData.subcategory}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Location, Branch, Department */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.location ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
                </div>

                <div>
                  <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-1">
                    Branch
                  </label>
                  <input
                    type="text"
                    id="branch"
                    name="branch"
                    value={formData.branch}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Responsible Person and Reviewer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="responsiblePerson" className="block text-sm font-medium text-gray-700 mb-1">
                    Responsible Person <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="responsiblePerson"
                    name="responsiblePerson"
                    value={formData.responsiblePerson}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.responsiblePerson ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.responsiblePerson && <p className="mt-1 text-sm text-red-600">{errors.responsiblePerson}</p>}
                </div>

                <div>
                  <label htmlFor="reviewerPerson" className="block text-sm font-medium text-gray-700 mb-1">
                    Reviewer
                  </label>
                  <input
                    type="text"
                    id="reviewerPerson"
                    name="reviewerPerson"
                    value={formData.reviewerPerson}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="dateIdentified" className="block text-sm font-medium text-gray-700 mb-1">
                    Date Identified <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="dateIdentified"
                    name="dateIdentified"
                    value={formData.dateIdentified}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.dateIdentified ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.dateIdentified && <p className="mt-1 text-sm text-red-600">{errors.dateIdentified}</p>}
                </div>

                <div>
                  <label htmlFor="dateDue" className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    id="dateDue"
                    name="dateDue"
                    value={formData.dateDue}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.dateDue ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.dateDue && <p className="mt-1 text-sm text-red-600">{errors.dateDue}</p>}
                </div>

                <div>
                  <label htmlFor="dateCompleted" className="block text-sm font-medium text-gray-700 mb-1">
                    Date Completed
                  </label>
                  <input
                    type="date"
                    id="dateCompleted"
                    name="dateCompleted"
                    value={formData.dateCompleted}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.dateCompleted ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.dateCompleted && <p className="mt-1 text-sm text-red-600">{errors.dateCompleted}</p>}
                </div>
              </div>

              {/* Risk Level */}
              <div>
                <label htmlFor="riskLevel" className="block text-sm font-medium text-gray-700 mb-1">
                  Risk Level: {formData.riskLevel}/10 <span className="text-red-500">*</span>
                </label>
                <input
                  type="range"
                  id="riskLevel"
                  name="riskLevel"
                  min="1"
                  max="10"
                  value={formData.riskLevel}
                  onChange={handleRiskLevelChange}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low (1)</span>
                  <span>Medium (5)</span>
                  <span>High (10)</span>
                </div>
                {errors.riskLevel && <p className="mt-1 text-sm text-red-600">{errors.riskLevel}</p>}
              </div>

              {/* Recommendation */}
              <div>
                <label htmlFor="recommendation" className="block text-sm font-medium text-gray-700 mb-1">
                  Recommendation <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="recommendation"
                  name="recommendation"
                  value={formData.recommendation}
                  onChange={handleInputChange}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.recommendation ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.recommendation && <p className="mt-1 text-sm text-red-600">{errors.recommendation}</p>}
              </div>

              {/* Management Response */}
              <div>
                <label htmlFor="managementResponse" className="block text-sm font-medium text-gray-700 mb-1">
                  Management Response
                </label>
                <textarea
                  id="managementResponse"
                  name="managementResponse"
                  value={formData.managementResponse}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Action Plan */}
              <div>
                <label htmlFor="actionPlan" className="block text-sm font-medium text-gray-700 mb-1">
                  Action Plan
                </label>
                <textarea
                  id="actionPlan"
                  name="actionPlan"
                  value={formData.actionPlan}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Evidence */}
              <div>
                <label htmlFor="evidence" className="block text-sm font-medium text-gray-700 mb-1">
                  Evidence (one per line)
                </label>
                <textarea
                  id="evidence"
                  name="evidence"
                  value={formData.evidence}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Enter each piece of evidence on a new line"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Tags */}
              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="e.g., security, urgent, compliance"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </form>
          </div>

          {/* Footer with Action Buttons */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="px-6 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Unsaved Changes */}
      {showConfirmClose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Unsaved Changes</h3>
            <p className="text-gray-600 mb-6">
              You have unsaved changes. Are you sure you want to close without saving?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Continue Editing
              </button>
              <button
                onClick={confirmClose}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
