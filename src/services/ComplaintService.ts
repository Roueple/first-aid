import DatabaseService from './DatabaseService';
import { Complaint, ComplaintStatus, createComplaint, ComplaintCategory } from '../types/complaint.types';
import FelixChatService from './FelixChatService';
import FelixSessionService from './FelixSessionService';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * ComplaintService - Manages user complaints about chat sessions
 * 
 * Handles:
 * - Creating complaints with full chat history
 * - Sending email notifications to admin
 * - Tracking complaint status
 * - Admin resolution workflow
 */
export class ComplaintService extends DatabaseService<Complaint> {
  constructor() {
    super('complaints');
  }

  /**
   * Submit a new complaint
   */
  async submitComplaint(
    sessionId: string,
    userId: string,
    userEmail: string,
    category: ComplaintCategory,
    subject: string,
    description: string
  ): Promise<string> {
    try {
      // Get full chat history for the session
      const chats = await FelixChatService.getSessionChats(sessionId);
      const chatHistory = chats.map(chat => ({
        role: chat.role,
        message: chat.message,
        timestamp: chat.timestamp.toDate().toISOString(),
      }));

      // Get session details
      const session = await FelixSessionService.getById(sessionId);

      // Gather metadata
      const metadata = {
        deviceInfo: navigator.platform,
        userAgent: navigator.userAgent,
        appVersion: '1.0.0', // TODO: Get from package.json
        sessionTitle: session?.title,
        sessionCreatedAt: session?.createdAt.toDate().toISOString(),
      };

      // Create complaint
      const complaint = createComplaint(
        sessionId,
        userId,
        userEmail,
        category,
        subject,
        description,
        chatHistory,
        metadata
      );

      // Save to Firestore
      const complaintId = await this.create(complaint);
      console.log(`📧 Complaint submitted: ${complaintId}`);

      // Send email notification to admin
      try {
        const functions = getFunctions();
        const sendComplaintEmail = httpsCallable(functions, 'sendComplaintEmail');
        await sendComplaintEmail({ complaintId });
        console.log(`✉️ Email notification sent for complaint: ${complaintId}`);
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the complaint submission if email fails
      }

      return complaintId;
    } catch (error) {
      console.error('Error submitting complaint:', error);
      throw error;
    }
  }

  /**
   * Get all complaints for a user
   */
  async getUserComplaints(userId: string): Promise<(Complaint & { id: string })[]> {
    return await this.getAll({
      filters: [{ field: 'userId', operator: '==', value: userId }],
      sorts: [{ field: 'createdAt', direction: 'desc' }],
    });
  }

  /**
   * Get complaints by status
   */
  async getComplaintsByStatus(status: ComplaintStatus): Promise<(Complaint & { id: string })[]> {
    return await this.getAll({
      filters: [{ field: 'status', operator: '==', value: status }],
      sorts: [{ field: 'createdAt', direction: 'desc' }],
    });
  }

  /**
   * Get complaints for a specific session
   */
  async getSessionComplaints(sessionId: string): Promise<(Complaint & { id: string })[]> {
    return await this.getAll({
      filters: [{ field: 'sessionId', operator: '==', value: sessionId }],
      sorts: [{ field: 'createdAt', direction: 'desc' }],
    });
  }

  /**
   * Update complaint status
   */
  async updateStatus(
    complaintId: string,
    status: ComplaintStatus,
    adminNotes?: string,
    resolvedBy?: string
  ): Promise<void> {
    const updates: Partial<Complaint> = {
      status,
      updatedAt: new Date() as any,
    };

    if (adminNotes) {
      updates.adminNotes = adminNotes;
    }

    if (status === 'resolved' || status === 'dismissed') {
      updates.resolvedAt = new Date() as any;
      updates.resolvedBy = resolvedBy;
    }

    await this.update(complaintId, updates);
    console.log(`✅ Complaint ${complaintId} status updated to: ${status}`);
  }

  /**
   * Get complaint statistics
   */
  async getStatistics(): Promise<{
    total: number;
    pending: number;
    reviewing: number;
    resolved: number;
    dismissed: number;
    byCategory: Record<string, number>;
  }> {
    const allComplaints = await this.getAll({});

    const stats = {
      total: allComplaints.length,
      pending: 0,
      reviewing: 0,
      resolved: 0,
      dismissed: 0,
      byCategory: {} as Record<string, number>,
    };

    allComplaints.forEach(complaint => {
      // Count by status
      stats[complaint.status]++;

      // Count by category
      if (!stats.byCategory[complaint.category]) {
        stats.byCategory[complaint.category] = 0;
      }
      stats.byCategory[complaint.category]++;
    });

    return stats;
  }
}

export default new ComplaintService();
