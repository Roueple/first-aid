/**
 * Tests for AuditLogViewer Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuditLogViewer } from '../AuditLogViewer';
import { auditService } from '../../services/AuditService';
import { Timestamp } from 'firebase/firestore';

// Mock the audit service
vi.mock('../../services/AuditService', () => ({
  auditService: {
    getAuditLogs: vi.fn(),
    downloadCSV: vi.fn(),
    logExport: vi.fn()
  }
}));

describe('AuditLogViewer', () => {
  const mockLogs = [
    {
      id: '1',
      userId: 'user123',
      action: 'login' as const,
      resourceType: 'user' as const,
      resourceId: 'user123',
      details: { loginMethod: 'email' },
      ipAddress: '192.168.1.1',
      timestamp: Timestamp.fromDate(new Date('2024-01-01T10:00:00Z'))
    },
    {
      id: '2',
      userId: 'user456',
      action: 'create' as const,
      resourceType: 'finding' as const,
      resourceId: 'finding789',
      details: { title: 'Test Finding' },
      ipAddress: '192.168.1.2',
      timestamp: Timestamp.fromDate(new Date('2024-01-01T11:00:00Z'))
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (auditService.getAuditLogs as any).mockResolvedValue(mockLogs);
  });

  it('renders the component with title', async () => {
    render(<AuditLogViewer />);
    
    expect(screen.getByText('Audit Log Viewer')).toBeInTheDocument();
    expect(screen.getByText(/View and filter system audit logs/i)).toBeInTheDocument();
  });

  it('loads and displays audit logs on mount', async () => {
    render(<AuditLogViewer />);
    
    await waitFor(() => {
      expect(auditService.getAuditLogs).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText(/Showing 2 logs/i)).toBeInTheDocument();
    });
  });

  it('displays loading state while fetching logs', () => {
    (auditService.getAuditLogs as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockLogs), 1000))
    );

    render(<AuditLogViewer />);
    
    expect(screen.getByText('Loading audit logs...')).toBeInTheDocument();
  });

  it('displays error message when loading fails', async () => {
    (auditService.getAuditLogs as any).mockRejectedValue(new Error('Failed to load'));

    render(<AuditLogViewer />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load audit logs/i)).toBeInTheDocument();
    });
  });

  it('filters logs by action', async () => {
    render(<AuditLogViewer />);
    
    await waitFor(() => {
      expect(screen.getByText(/Showing 2 logs/i)).toBeInTheDocument();
    });

    const loginButton = screen.getByRole('button', { name: 'login' });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(auditService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          action: ['login']
        }),
        500
      );
    });
  });

  it('filters logs by resource type', async () => {
    render(<AuditLogViewer />);
    
    await waitFor(() => {
      expect(screen.getByText(/Showing 2 logs/i)).toBeInTheDocument();
    });

    const findingButton = screen.getByRole('button', { name: 'finding' });
    fireEvent.click(findingButton);

    await waitFor(() => {
      expect(auditService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: ['finding']
        }),
        500
      );
    });
  });

  it('applies date range filter', async () => {
    render(<AuditLogViewer />);
    
    await waitFor(() => {
      expect(screen.getByText(/Showing 2 logs/i)).toBeInTheDocument();
    });

    const startDateInput = screen.getAllByRole('textbox')[0];
    const endDateInput = screen.getAllByRole('textbox')[1];
    
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
    fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });

    const applyButton = screen.getByRole('button', { name: 'Apply' });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(auditService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          dateRange: expect.objectContaining({
            start: expect.any(Date),
            end: expect.any(Date)
          })
        }),
        500
      );
    });
  });

  it('clears all filters', async () => {
    render(<AuditLogViewer />);
    
    await waitFor(() => {
      expect(screen.getByText(/Showing 2 logs/i)).toBeInTheDocument();
    });

    // Apply a filter first
    const loginButton = screen.getByRole('button', { name: 'login' });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(auditService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          action: ['login']
        }),
        500
      );
    });

    // Clear filters
    const clearButton = screen.getByRole('button', { name: 'Clear All Filters' });
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(auditService.getAuditLogs).toHaveBeenCalledWith({}, 500);
    });
  });

  it('exports logs to CSV', async () => {
    render(<AuditLogViewer />);
    
    await waitFor(() => {
      expect(screen.getByText(/Showing 2 logs/i)).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /Export to CSV/i });
    fireEvent.click(exportButton);

    expect(auditService.downloadCSV).toHaveBeenCalledWith(mockLogs);
    expect(auditService.logExport).toHaveBeenCalledWith('user', 'csv', 2);
  });

  it('disables export button when no logs', async () => {
    (auditService.getAuditLogs as any).mockResolvedValue([]);

    render(<AuditLogViewer />);
    
    await waitFor(() => {
      expect(screen.getByText(/Showing 0 logs/i)).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /Export to CSV/i });
    expect(exportButton).toBeDisabled();
  });

  it('refreshes logs when refresh button is clicked', async () => {
    render(<AuditLogViewer />);
    
    await waitFor(() => {
      expect(screen.getByText(/Showing 2 logs/i)).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: 'Refresh' });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(auditService.getAuditLogs).toHaveBeenCalledTimes(2);
    });
  });

  it('displays log details in table', async () => {
    render(<AuditLogViewer />);
    
    await waitFor(() => {
      expect(screen.getByText(/Showing 2 logs/i)).toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByText('Timestamp')).toBeInTheDocument();
    expect(screen.getByText('User ID')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Resource Type')).toBeInTheDocument();

    // Check log data is displayed
    expect(screen.getByText('login')).toBeInTheDocument();
    expect(screen.getByText('create')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('finding')).toBeInTheDocument();
  });

  it('shows empty state when no logs match filters', async () => {
    (auditService.getAuditLogs as any).mockResolvedValue([]);

    render(<AuditLogViewer />);
    
    await waitFor(() => {
      expect(screen.getByText(/No audit logs found/i)).toBeInTheDocument();
    });
  });
});
