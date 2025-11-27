import * as admin from 'firebase-admin';
import { encrypt, decrypt } from '../utils/encryption';
import { MappingType, PseudonymMapping } from '../types/pseudonymization.types';

/**
 * Service for pseudonymizing and depseudonymizing sensitive data
 */
export class PseudonymizationService {
  private db: FirebaseFirestore.Firestore;
  private mappingsCollection: FirebaseFirestore.CollectionReference;

  constructor() {
    this.db = admin.firestore();
    this.mappingsCollection = this.db.collection('mappings');
  }

  /**
   * Extracts sensitive data from findings
   * Looks for patterns that match names, IDs, and amounts
   */
  private extractSensitiveData(findings: any[]): {
    names: Set<string>;
    ids: Set<string>;
    amounts: Set<string>;
  } {
    const names = new Set<string>();
    const ids = new Set<string>();
    const amounts = new Set<string>();

    findings.forEach(finding => {
      // Extract names from executor, reviewer, and manager fields
      if (finding.executor && typeof finding.executor === 'string') {
        names.add(finding.executor.trim());
      }
      if (finding.reviewer && typeof finding.reviewer === 'string') {
        names.add(finding.reviewer.trim());
      }
      if (finding.manager && typeof finding.manager === 'string') {
        names.add(finding.manager.trim());
      }

      // Extract IDs - look for patterns like ID numbers in description or evidence
      const idPattern = /\b[A-Z]{2,}\d{3,}\b|\b\d{6,}\b/g;
      const textFields = [
        finding.findingDescription,
        finding.rootCause,
        finding.impactDescription,
        finding.managementResponse,
        finding.actionPlan,
        finding.notes
      ].filter(Boolean);

      textFields.forEach(text => {
        const matches = text.match(idPattern);
        if (matches) {
          matches.forEach((id: string) => ids.add(id.trim()));
        }
      });

      // Extract amounts - look for currency patterns
      const amountPattern = /\$[\d,]+(?:\.\d{2})?|\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|IDR|dollars?|rupiah)\b/gi;
      textFields.forEach(text => {
        const matches = text.match(amountPattern);
        if (matches) {
          matches.forEach((amount: string) => amounts.add(amount.trim()));
        }
      });
    });

    return { names, ids, amounts };
  }

  /**
   * Generates a pseudonym for a given type and index
   */
  private generatePseudonym(type: MappingType, index: number): string {
    switch (type) {
      case 'names':
        return `Person_${String.fromCharCode(65 + (index % 26))}${Math.floor(index / 26) || ''}`;
      case 'ids':
        return `ID_${String(index + 1).padStart(3, '0')}`;
      case 'amounts':
        return `Amount_${String(index + 1).padStart(3, '0')}`;
      case 'locations':
        return `Location_${String(index + 1).padStart(3, '0')}`;
      default:
        return `Unknown_${index}`;
    }
  }

  /**
   * Creates or retrieves mappings for sensitive values within a session
   * Encrypts original values using AES-256-GCM before storage
   * Sets 30-day expiry for automatic cleanup
   * 
   * Session-based isolation ensures:
   * - User 1's "Best Jakarta" in Session A → "Location_001"
   * - User 2's "Best Jakarta" in Session B → "Location_001" (different mapping)
   * - Same user's "Best Jakarta" in Session A → always "Location_001" (consistent within session)
   */
  private async createMappings(
    values: Set<string>,
    type: MappingType,
    sessionId: string,
    userId: string
  ): Promise<Map<string, string>> {
    const mappings = new Map<string, string>();

    // Check if mappings already exist for these values IN THIS SESSION
    const existingMappingsSnapshot = await this.mappingsCollection
      .where('sessionId', '==', sessionId)
      .where('mappingType', '==', type)
      .get();

    const existingMappings = new Map<string, string>();
    const existingDocs = new Map<string, FirebaseFirestore.DocumentReference>();
    
    existingMappingsSnapshot.forEach(doc => {
      const data = doc.data() as PseudonymMapping;
      try {
        const originalValue = decrypt(data.originalValue);
        existingMappings.set(originalValue, data.pseudonymValue);
        existingDocs.set(originalValue, doc.ref);
      } catch (error) {
        console.error('Error decrypting mapping:', error);
        // Log decryption failure for security audit
        this.logMappingAccess('decryption_error', sessionId, type, 'system', {
          error: error instanceof Error ? error.message : String(error),
          mappingId: doc.id
        });
      }
    });

    // Create new mappings for values that don't exist in this session
    const batch = this.db.batch();
    let index = existingMappings.size;
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 30 * 24 * 60 * 60 * 1000 // 30 days from now
    );

    for (const value of values) {
      if (existingMappings.has(value)) {
        // Update last accessed timestamp for existing mappings
        const docRef = existingDocs.get(value);
        if (docRef) {
          batch.update(docRef, {
            lastAccessedAt: now,
            usageCount: admin.firestore.FieldValue.increment(1)
          });
        }
        mappings.set(value, existingMappings.get(value)!);
      } else {
        const pseudonym = this.generatePseudonym(type, index);
        mappings.set(value, pseudonym);

        const mappingDoc = this.mappingsCollection.doc();
        const mapping: PseudonymMapping = {
          id: mappingDoc.id,
          sessionId, // Session-based isolation
          batchId: sessionId, // Keep for backward compatibility
          mappingType: type,
          originalValue: encrypt(value), // AES-256-GCM encryption
          pseudonymValue: pseudonym,
          createdAt: now,
          expiresAt, // Auto-delete after 30 days
          usageCount: 0,
          lastAccessedAt: now,
          createdBy: userId
        };

        batch.set(mappingDoc, mapping);
        
        // Log mapping creation for audit purposes
        this.logMappingAccess('create', sessionId, type, userId, {
          pseudonymValue: pseudonym,
          mappingId: mappingDoc.id
        });
        
        index++;
      }
    }

    await batch.commit();
    return mappings;
  }

  /**
   * Logs mapping access for audit purposes
   * Restricted to Cloud Functions only
   */
  private async logMappingAccess(
    action: string,
    batchId: string,
    mappingType: MappingType,
    userId: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      await this.db.collection('auditLogs').add({
        userId,
        action: `mapping_${action}`,
        resourceType: 'mapping',
        resourceId: batchId,
        details: {
          mappingType,
          ...details
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging mapping access:', error);
      // Don't throw - logging failure shouldn't break the main operation
    }
  }

  /**
   * Replaces sensitive values in text with pseudonyms
   */
  private replaceSensitiveValues(
    text: string,
    mappings: Map<string, string>
  ): string {
    let result = text;

    // Sort by length (longest first) to avoid partial replacements
    const sortedEntries = Array.from(mappings.entries()).sort(
      (a, b) => b[0].length - a[0].length
    );

    for (const [original, pseudonym] of sortedEntries) {
      // Use word boundaries for names, but not for IDs and amounts
      const regex = new RegExp(
        original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'g'
      );
      result = result.replace(regex, pseudonym);
    }

    return result;
  }

  /**
   * Pseudonymizes findings data for a specific chat session
   * Encrypts all sensitive values before storage
   * 
   * Session-based approach ensures:
   * - Each chat session has isolated pseudonym mappings
   * - Within a session, same value always gets same pseudonym (for LLM context)
   * - Different sessions can have different pseudonyms for same value (privacy)
   */
  async pseudonymizeFindings(
    findings: any[],
    userId: string,
    sessionId: string
  ): Promise<{ pseudonymizedFindings: any[]; sessionId: string; batchId: string; mappingsCreated: number }> {
    // Validate sessionId
    if (!sessionId) {
      throw new Error('sessionId is required for pseudonymization');
    }

    // Extract sensitive data
    const { names, ids, amounts } = this.extractSensitiveData(findings);

    // Create session-specific mappings with encryption and audit logging
    const [nameMappings, idMappings, amountMappings] = await Promise.all([
      this.createMappings(names, 'names', sessionId, userId),
      this.createMappings(ids, 'ids', sessionId, userId),
      this.createMappings(amounts, 'amounts', sessionId, userId)
    ]);

    const totalMappings = nameMappings.size + idMappings.size + amountMappings.size;

    // Pseudonymize findings
    const pseudonymizedFindings = findings.map(finding => {
      const pseudonymized = { ...finding };

      // Replace in text fields
      const textFields = [
        'findingTitle',
        'findingDescription',
        'rootCause',
        'impactDescription',
        'executor',
        'reviewer',
        'manager',
        'recommendation',
        'managementResponse',
        'actionPlan',
        'notes'
      ];

      textFields.forEach(field => {
        if (pseudonymized[field] && typeof pseudonymized[field] === 'string') {
          let text = pseudonymized[field];
          text = this.replaceSensitiveValues(text, nameMappings);
          text = this.replaceSensitiveValues(text, idMappings);
          text = this.replaceSensitiveValues(text, amountMappings);
          pseudonymized[field] = text;
        }
      });

      return pseudonymized;
    });

    return {
      pseudonymizedFindings,
      sessionId,
      batchId: sessionId, // For backward compatibility
      mappingsCreated: totalMappings
    };
  }

  /**
   * Depseudonymizes data by replacing pseudonyms with original values for a specific session
   * Decrypts stored values and tracks usage for audit purposes
   * 
   * Session-based approach ensures correct mappings are used for depseudonymization
   */
  async depseudonymizeData(data: any, sessionId: string, userId: string): Promise<any> {
    // Validate sessionId
    if (!sessionId) {
      throw new Error('sessionId is required for depseudonymization');
    }

    // Retrieve all mappings for this session
    const mappingsSnapshot = await this.mappingsCollection
      .where('sessionId', '==', sessionId)
      .get();

    if (mappingsSnapshot.empty) {
      throw new Error(`No mappings found for session ID: ${sessionId}`);
    }

    // Build reverse mapping (pseudonym -> original)
    const reverseMappings = new Map<string, string>();
    const now = admin.firestore.Timestamp.now();
    const batch = this.db.batch();
    
    mappingsSnapshot.forEach(doc => {
      const mapping = doc.data() as PseudonymMapping;
      try {
        const originalValue = decrypt(mapping.originalValue);
        reverseMappings.set(mapping.pseudonymValue, originalValue);
        
        // Update usage count and last accessed timestamp for audit tracking
        batch.update(doc.ref, {
          usageCount: admin.firestore.FieldValue.increment(1),
          lastAccessedAt: now
        });
        
        // Log mapping access for audit purposes
        this.logMappingAccess('access', sessionId, mapping.mappingType, userId, {
          pseudonymValue: mapping.pseudonymValue,
          mappingId: doc.id
        });
      } catch (error) {
        console.error('Error decrypting mapping:', error);
        // Log decryption failure for security audit
        this.logMappingAccess('decryption_error', sessionId, mapping.mappingType, userId, {
          error: error instanceof Error ? error.message : String(error),
          mappingId: doc.id
        });
      }
    });
    
    // Commit usage tracking updates
    await batch.commit();

    // Depseudonymize the data
    const depseudonymize = (obj: any): any => {
      if (typeof obj === 'string') {
        let result = obj;
        for (const [pseudonym, original] of reverseMappings.entries()) {
          const regex = new RegExp(
            pseudonym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            'g'
          );
          result = result.replace(regex, original);
        }
        return result;
      } else if (Array.isArray(obj)) {
        return obj.map(item => depseudonymize(item));
      } else if (obj !== null && typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
          result[key] = depseudonymize(obj[key]);
        }
        return result;
      }
      return obj;
    };

    return depseudonymize(data);
  }

  /**
   * Cleans up expired mappings (auto-delete after 30 days)
   * Logs deletion for audit purposes
   */
  async cleanupExpiredMappings(): Promise<number> {
    const now = admin.firestore.Timestamp.now();
    const expiredMappings = await this.mappingsCollection
      .where('expiresAt', '<=', now)
      .get();

    if (expiredMappings.empty) {
      return 0;
    }

    const batch = this.db.batch();
    const deletedMappings: Array<{ id: string; batchId: string; type: MappingType }> = [];
    
    expiredMappings.forEach(doc => {
      const mapping = doc.data() as PseudonymMapping;
      deletedMappings.push({
        id: doc.id,
        batchId: mapping.batchId,
        type: mapping.mappingType
      });
      batch.delete(doc.ref);
    });

    await batch.commit();
    
    // Log cleanup for audit purposes
    await this.logMappingAccess('cleanup', 'system', 'names', 'system', {
      deletedCount: deletedMappings.length,
      deletedMappings: deletedMappings.map(m => ({
        id: m.id,
        batchId: m.batchId,
        type: m.type
      }))
    });

    return expiredMappings.size;
  }
}
