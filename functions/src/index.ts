import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { PseudonymizationService } from './services/pseudonymizationService';
import {
  PseudonymizeRequest,
  PseudonymizeResponse,
  DepseudonymizeRequest,
  DepseudonymizeResponse
} from './types/pseudonymization.types';
import {
  LogAuditEventRequest,
  LogAuditEventResponse
} from './types/audit.types';

// Initialize Firebase Admin
admin.initializeApp();

// Email configuration
const ADMIN_EMAIL = 'geraldi.wiwono@ciputra.com';
const APP_NAME = 'FIRST-AID';

// Initialize services
const pseudonymizationService = new PseudonymizationService();

/**
 * Pseudonymize findings data before sending to AI services
 * 
 * This callable function:
 * 1. Extracts sensitive data (names, IDs, amounts) from findings
 * 2. Generates pseudonym mappings (Person_A, ID_001, Amount_001)
 * 3. Stores encrypted mappings in Firestore
 * 4. Returns pseudonymized findings data
 * 
 * Requirements: 5.1, 5.2, 5.5
 */
export const pseudonymizeFindings = functions.https.onCall(
  async (data: PseudonymizeRequest, context): Promise<PseudonymizeResponse> => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to pseudonymize findings'
      );
    }

    // Validate input
    if (!data.findings || !Array.isArray(data.findings)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'findings must be an array'
      );
    }

    if (data.findings.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'findings array cannot be empty'
      );
    }

    // Support both sessionId (new) and batchId (backward compatibility)
    const sessionId = data.sessionId || data.batchId || `session_${Date.now()}_${context.auth.uid}`;

    try {
      // Log the operation for audit purposes
      await admin.firestore().collection('auditLogs').add({
        userId: context.auth.uid,
        action: 'pseudonymize',
        resourceType: 'finding',
        details: {
          findingsCount: data.findings.length,
          sessionId
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      // Pseudonymize the findings with session-based isolation
      const result = await pseudonymizationService.pseudonymizeFindings(
        data.findings,
        context.auth.uid,
        sessionId
      );

      return result;
    } catch (error) {
      console.error('Error pseudonymizing findings:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to pseudonymize findings',
        error instanceof Error ? error.message : String(error)
      );
    }
  }
);

/**
 * Depseudonymize AI results to restore original values
 * 
 * This callable function:
 * 1. Retrieves mapping from secure Firestore collection
 * 2. Replaces pseudonyms with real values
 * 3. Returns depseudonymized results
 * 
 * Requirements: 5.3
 */
export const depseudonymizeResults = functions.https.onCall(
  async (data: DepseudonymizeRequest, context): Promise<DepseudonymizeResponse> => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to depseudonymize results'
      );
    }

    // Validate input
    if (!data.data) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'data is required'
      );
    }

    // Support both sessionId (new) and batchId (backward compatibility)
    const sessionId = data.sessionId || data.batchId;
    if (!sessionId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'sessionId is required for session-based depseudonymization'
      );
    }

    try {
      // Log the operation for audit purposes
      await admin.firestore().collection('auditLogs').add({
        userId: context.auth.uid,
        action: 'depseudonymize',
        resourceType: 'ai_result',
        details: {
          sessionId
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      // Depseudonymize the data with session-based mappings
      const depseudonymizedData = await pseudonymizationService.depseudonymizeData(
        data.data,
        sessionId,
        context.auth.uid
      );

      return { depseudonymizedData };
    } catch (error) {
      console.error('Error depseudonymizing results:', error);
      
      if (error instanceof Error && error.message.includes('No mappings found')) {
        throw new functions.https.HttpsError(
          'not-found',
          `Mappings not found for session ID: ${sessionId}. Mappings may have expired (30 days).`,
          error.message
        );
      }

      throw new functions.https.HttpsError(
        'internal',
        'Failed to depseudonymize results',
        error instanceof Error ? error.message : String(error)
      );
    }
  }
);

/**
 * Scheduled function to clean up expired mappings
 * Runs daily at midnight to delete mappings older than 30 days
 * 
 * Requirements: 5.4
 */
export const cleanupExpiredMappings = functions.pubsub
  .schedule('0 0 * * *') // Run daily at midnight
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      const deletedCount = await pseudonymizationService.cleanupExpiredMappings();
      
      console.log(`Cleaned up ${deletedCount} expired mappings`);
      
      // Log the cleanup operation
      await admin.firestore().collection('auditLogs').add({
        userId: 'system',
        action: 'cleanup_mappings',
        resourceType: 'mapping',
        details: {
          deletedCount
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      return null;
    } catch (error) {
      console.error('Error cleaning up expired mappings:', error);
      throw error;
    }
  });

/**
 * Log audit events for security and compliance tracking
 * 
 * This callable function:
 * 1. Captures user ID, action, resource type, and details
 * 2. Stores logs in Firestore auditLogs collection
 * 3. Adds IP address and timestamp automatically
 * 4. Returns log ID and timestamp for confirmation
 * 
 * Requirements: 10.1, 10.2
 */
export const logAuditEvent = functions.https.onCall(
  async (data: LogAuditEventRequest, context): Promise<LogAuditEventResponse> => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to log audit events'
      );
    }

    // Validate input
    if (!data.action) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'action is required'
      );
    }

    if (!data.resourceType) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'resourceType is required'
      );
    }

    try {
      // Extract IP address from request context
      const ipAddress = context.rawRequest?.ip || 
                       context.rawRequest?.headers['x-forwarded-for'] as string ||
                       context.rawRequest?.connection?.remoteAddress ||
                       'unknown';

      // Create audit log document
      const auditLogData = {
        userId: context.auth.uid,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        details: data.details || {},
        ipAddress,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };

      // Store in Firestore
      const docRef = await admin.firestore().collection('auditLogs').add(auditLogData);

      // Return success response with log ID
      return {
        success: true,
        logId: docRef.id,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error logging audit event:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to log audit event',
        error instanceof Error ? error.message : String(error)
      );
    }
  }
);

/**
 * Send complaint email notification to admin
 * 
 * This callable function:
 * 1. Retrieves complaint details from Firestore
 * 2. Formats email with chat history
 * 3. Sends email to admin using Firebase Extensions or custom SMTP
 * 
 * Note: This requires Firebase Extensions (Trigger Email) or custom email service
 */
export const sendComplaintEmail = functions.https.onCall(
  async (data: { complaintId: string }, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to send complaint emails'
      );
    }

    const { complaintId } = data;

    if (!complaintId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'complaintId is required'
      );
    }

    try {
      // Get complaint details
      const complaintDoc = await admin.firestore()
        .collection('complaints')
        .doc(complaintId)
        .get();

      if (!complaintDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          `Complaint not found: ${complaintId}`
        );
      }

      const complaint = complaintDoc.data();
      if (!complaint) {
        throw new functions.https.HttpsError(
          'internal',
          'Failed to retrieve complaint data'
        );
      }

      // Format chat history
      const chatHistoryHtml = complaint.chatHistory
        .map((chat: any, index: number) => {
          const role = chat.role === 'user' ? '👤 User' : '🤖 Assistant';
          const timestamp = new Date(chat.timestamp).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          });
          return `
            <div style="margin-bottom: 20px; padding: 15px; background-color: ${
              chat.role === 'user' ? '#f0f9ff' : '#f9fafb'
            }; border-left: 4px solid ${
              chat.role === 'user' ? '#3b82f6' : '#6b7280'
            }; border-radius: 4px;">
              <div style="font-weight: bold; color: #374151; margin-bottom: 5px;">
                ${role} - ${timestamp}
              </div>
              <div style="color: #1f2937; white-space: pre-wrap; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                ${escapeHtml(chat.message)}
              </div>
            </div>
          `;
        })
        .join('');

      // Format metadata
      const metadataHtml = complaint.metadata
        ? `
          <div style="margin-top: 20px; padding: 15px; background-color: #f9fafb; border-radius: 4px;">
            <h3 style="color: #374151; margin-top: 0;">Session Metadata</h3>
            <ul style="color: #6b7280; line-height: 1.8;">
              ${complaint.metadata.sessionTitle ? `<li><strong>Session Title:</strong> ${escapeHtml(complaint.metadata.sessionTitle)}</li>` : ''}
              ${complaint.metadata.sessionCreatedAt ? `<li><strong>Session Created:</strong> ${new Date(complaint.metadata.sessionCreatedAt).toLocaleString()}</li>` : ''}
              ${complaint.metadata.deviceInfo ? `<li><strong>Device:</strong> ${escapeHtml(complaint.metadata.deviceInfo)}</li>` : ''}
              ${complaint.metadata.appVersion ? `<li><strong>App Version:</strong> ${escapeHtml(complaint.metadata.appVersion)}</li>` : ''}
            </ul>
          </div>
        `
        : '';

      // Create email HTML
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Complaint Report - ${APP_NAME}</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🚨 New Complaint Report</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${APP_NAME} - Chat Issue Report</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <!-- Complaint Details -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Complaint Details</h2>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr>
                  <td style="padding: 10px; background-color: #f9fafb; font-weight: bold; width: 150px; color: #374151;">Complaint ID:</td>
                  <td style="padding: 10px; background-color: #ffffff; color: #1f2937;">${complaintId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; background-color: #f9fafb; font-weight: bold; color: #374151;">Category:</td>
                  <td style="padding: 10px; background-color: #ffffff; color: #1f2937;">
                    <span style="background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 14px;">
                      ${complaint.category.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px; background-color: #f9fafb; font-weight: bold; color: #374151;">Priority:</td>
                  <td style="padding: 10px; background-color: #ffffff; color: #1f2937;">
                    <span style="background-color: ${getPriorityColor(complaint.priority)}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px;">
                      ${complaint.priority.toUpperCase()}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px; background-color: #f9fafb; font-weight: bold; color: #374151;">Subject:</td>
                  <td style="padding: 10px; background-color: #ffffff; color: #1f2937;">${escapeHtml(complaint.subject)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; background-color: #f9fafb; font-weight: bold; color: #374151;">User Email:</td>
                  <td style="padding: 10px; background-color: #ffffff; color: #1f2937;">${escapeHtml(complaint.userEmail)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; background-color: #f9fafb; font-weight: bold; color: #374151;">Session ID:</td>
                  <td style="padding: 10px; background-color: #ffffff; color: #1f2937; font-family: monospace; font-size: 12px;">${complaint.sessionId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; background-color: #f9fafb; font-weight: bold; color: #374151;">Submitted:</td>
                  <td style="padding: 10px; background-color: #ffffff; color: #1f2937;">${complaint.createdAt.toDate().toLocaleString()}</td>
                </tr>
              </table>
            </div>

            <!-- Description -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Description</h2>
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 4px; margin-top: 15px; white-space: pre-wrap; color: #1f2937;">
${escapeHtml(complaint.description)}
              </div>
            </div>

            <!-- Chat History -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Complete Chat History</h2>
              <div style="margin-top: 15px;">
                ${chatHistoryHtml}
              </div>
            </div>

            ${metadataHtml}

            <!-- Action Links -->
            <div style="margin-top: 30px; padding: 20px; background-color: #eff6ff; border-radius: 4px; text-align: center;">
              <p style="margin: 0 0 15px 0; color: #1e40af; font-weight: bold;">Quick Actions</p>
              <a href="https://console.firebase.google.com/project/_/firestore/data/~2Fcomplaints~2F${complaintId}" 
                 style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 0 5px; font-weight: bold;">
                View in Firestore
              </a>
            </div>
          </div>

          <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
            <p>This is an automated notification from ${APP_NAME}</p>
            <p>Complaint ID: ${complaintId}</p>
          </div>
        </body>
        </html>
      `;

      // Create email document for Firebase Extensions (Trigger Email)
      // If you have the extension installed, it will automatically send the email
      await admin.firestore().collection('mail').add({
        to: ADMIN_EMAIL,
        message: {
          subject: `[${APP_NAME}] New Complaint: ${complaint.subject}`,
          html: emailHtml,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`📧 Email queued for complaint: ${complaintId}`);

      return {
        success: true,
        message: 'Email notification queued successfully',
      };
    } catch (error) {
      console.error('Error sending complaint email:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to send complaint email',
        error instanceof Error ? error.message : String(error)
      );
    }
  }
);

/**
 * Helper function to escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Helper function to get priority color
 */
function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#dc2626',
  };
  return colors[priority] || '#6b7280';
}
