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
