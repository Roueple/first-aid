import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FindingEditDialog } from '../FindingEditDialog';
import { Finding } from '../../types/finding.types';
import { Timestamp } from 'firebase/firestore';

describe('FindingEditDialog', () => {
  const mockFinding: Finding = {
    id: 'test-1',
    title: 'Test Finding',
    description: 'Test description',
    severity: 'High',
    status: 'Open',
    category: 'Security',
    location: 'Data Center A',
    responsiblePerson: 'John Doe',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-15')),
    dateCreated: Timestamp.fromDate(new Date('2024-01-15')),
    dateUpdated: Timestamp.fromDate(new Date('2024-01-15')),
    recommendation: 'Fix the issue',
    tags: ['security', 'urgent'],
    riskLevel: 8,
    originalSource: 'Test Audit',
    importBatch: 'batch-1',
  };

  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when open', () => {
    render(
      <FindingEditDialog
        finding={mockFinding}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Edit Finding')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Finding')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <FindingEditDialog
        finding={mockFinding}
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByText('Edit Finding')).not.toBeInTheDocument();
  });

  it('populates form fields with finding data', () => {
    render(
      <FindingEditDialog
        finding={mockFinding}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByDisplayValue('Test Finding')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('High')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Open')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Security')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Data Center A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Fix the issue')).toBeInTheDocument();
    expect(screen.getByDisplayValue('security, urgent')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(
      <FindingEditDialog
        finding={mockFinding}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Clear required field
    const titleInput = screen.getByLabelText(/Title/);
    fireEvent.change(titleInput, { target: { value: '' } });

    // Try to save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('validates title length', async () => {
    render(
      <FindingEditDialog
        finding={mockFinding}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const titleInput = screen.getByLabelText(/Title/);
    fireEvent.change(titleInput, { target: { value: 'a'.repeat(501) } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Title must be 500 characters or less')).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('validates date logic', async () => {
    render(
      <FindingEditDialog
        finding={mockFinding}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Set due date before identified date
    const dateIdentifiedInput = screen.getByLabelText(/Date Identified/);
    const dateDueInput = screen.getByLabelText(/Due Date/);

    fireEvent.change(dateIdentifiedInput, { target: { value: '2024-02-01' } });
    fireEvent.change(dateDueInput, { target: { value: '2024-01-01' } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Due date cannot be before date identified')).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('calls onSave with valid data', async () => {
    mockOnSave.mockResolvedValue(undefined);

    render(
      <FindingEditDialog
        finding={mockFinding}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Modify a field
    const titleInput = screen.getByLabelText(/Title/);
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

    // Save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        'test-1',
        expect.objectContaining({
          title: 'Updated Title',
        })
      );
    });
  });

  it('shows confirmation when closing with unsaved changes', async () => {
    render(
      <FindingEditDialog
        finding={mockFinding}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Make a change
    const titleInput = screen.getByLabelText(/Title/);
    fireEvent.change(titleInput, { target: { value: 'Modified Title' } });

    // Try to close
    const closeButton = screen.getByTitle('Close dialog');
    fireEvent.click(closeButton);

    // Should show confirmation
    await waitFor(() => {
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('closes without confirmation when no changes', () => {
    render(
      <FindingEditDialog
        finding={mockFinding}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Close without making changes
    const closeButton = screen.getByTitle('Close dialog');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles cancel button', () => {
    render(
      <FindingEditDialog
        finding={mockFinding}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('updates risk level with slider', () => {
    render(
      <FindingEditDialog
        finding={mockFinding}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const riskSlider = screen.getByLabelText(/Risk Level:/);
    fireEvent.change(riskSlider, { target: { value: '10' } });

    expect(screen.getByText(/Risk Level: 10\/10/)).toBeInTheDocument();
  });

  it('handles evidence as newline-separated list', async () => {
    mockOnSave.mockResolvedValue(undefined);

    render(
      <FindingEditDialog
        finding={mockFinding}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const evidenceInput = screen.getByLabelText(/Evidence/);
    fireEvent.change(evidenceInput, { 
      target: { value: 'Evidence 1\nEvidence 2\nEvidence 3' } 
    });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        'test-1',
        expect.objectContaining({
          evidence: ['Evidence 1', 'Evidence 2', 'Evidence 3'],
        })
      );
    });
  });

  it('handles tags as comma-separated list', async () => {
    mockOnSave.mockResolvedValue(undefined);

    render(
      <FindingEditDialog
        finding={mockFinding}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const tagsInput = screen.getByLabelText(/Tags/);
    fireEvent.change(tagsInput, { 
      target: { value: 'tag1, tag2, tag3' } 
    });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        'test-1',
        expect.objectContaining({
          tags: ['tag1', 'tag2', 'tag3'],
        })
      );
    });
  });

  it('shows loading state while saving', async () => {
    mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <FindingEditDialog
        finding={mockFinding}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  it('displays error message on save failure', async () => {
    mockOnSave.mockRejectedValue(new Error('Save failed'));

    render(
      <FindingEditDialog
        finding={mockFinding}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to save finding. Please try again.')).toBeInTheDocument();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('clears field error when user starts typing', async () => {
    render(
      <FindingEditDialog
        finding={mockFinding}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Clear required field to trigger error
    const titleInput = screen.getByLabelText(/Title/);
    fireEvent.change(titleInput, { target: { value: '' } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });

    // Start typing again
    fireEvent.change(titleInput, { target: { value: 'New Title' } });

    // Error should be cleared
    expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
  });
});
