import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Finding } from '../types/finding.types';

/**
 * Client-side service for interacting with pseudonymization Cloud Functions
 * 
 * This service provides methods to:
 * 1. Pseudonymize findings before sending to AI services
 * 2. Depseudonymize AI results to restore original values
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.5
 */

export interface PseudonymizeRequest {
  findings: Finding[];
  sessionId: string; // Required: Chat session ID for isolation
  batchId?: string; // Deprecated: kept for backward compatibility
}

export interface PseudonymizeResponse {
  pseudonymizedFindings: Finding[];
  sessionId: string; // Session ID for this pseudonymization
  batchId: string; // Deprecated: kept for backward compatibility
  mappingsCreated: number;
}

export interface DepseudonymizeRequest {
  data: any;
  sessionId: string; // Required: Chat session ID to retrieve correct mappings
  batchId?: string; // Deprecated: kept for backward compatibility
}

export interface DepseudonymizeResponse {
  depseudonymizedData: any;
}

export class PseudonymizationService {
  private functions;

  constructor() {
    this.functions = getFunctions();
  }

  /**
   * Pseudonymizes findings data before sending to AI services
   * 
   * Session-based approach ensures:
   * - Each chat session has isolated pseudonym mappings
   * - Within a session, same value always gets same pseudonym (for LLM context)
   * - Different sessions can have different pseudonyms for same value (privacy)
   * 
   * This method:
   * 1. Calls the pseudonymizeFindings Cloud Function with sessionId
   * 2. Receives pseudonymized findings with sensitive data replaced
   * 3. Returns the pseudonymized data and session ID for later depseudonymization
   * 
   * @param findings - Array of findings to pseudonymize
   * @param sessionId - Chat session ID (required for session-based isolation)
   * @returns Pseudonymized findings, session ID, and count of mappings created
   * 
   * @example
   * ```typescript
   * const service = new PseudonymizationService();
   * const sessionId = 'chat_session_123'; // From your chat session
   * 
   * const result = await service.pseudonymizeFindings([
   *   {
   *     title: 'Security Issue',
   *     responsiblePerson: 'John Doe',
   *     description: 'Found issue with ID12345 involving $5,000'
   *   }
   * ], sessionId);
   * 
   * console.log(result.pseudonymizedFindings);
   * // [{
   * //   title: 'Security Issue',
   * //   responsiblePerson: 'Person_A',
   * //   description: 'Found issue with ID_001 involving Amount_001'
   * // }]
   * 
   * console.log(result.sessionId); // 'chat_session_123'
   * console.log(result.mappingsCreated); // 3
   * ```
   */
  async pseudonymizeFindings(
    findings: Finding[],
    sessionId: string
  ): Promise<PseudonymizeResponse> {
    if (!sessionId) {
      throw new Error('sessionId is required for session-based pseudonymization');
    }

    try {
      const pseudonymizeFn = httpsCallable<PseudonymizeRequest, PseudonymizeResponse>(
        this.functions,
        'pseudonymizeFindings'
      );

      const result = await pseudonymizeFn({ findings, sessionId });
      return result.data;
    } catch (error) {
      console.error('Error pseudonymizing findings:', error);
      throw new Error(
        `Failed to pseudonymize findings: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Depseudonymizes AI results to restore original values
   * 
   * Session-based approach ensures correct mappings are retrieved for depseudonymization
   * 
   * This method:
   * 1. Calls the depseudonymizeResults Cloud Function
   * 2. Provides the session ID to retrieve the correct mappings
   * 3. Receives data with pseudonyms replaced by original values
   * 
   * @param data - Data containing pseudonyms to reverse
   * @param sessionId - Session ID from the pseudonymization operation
   * @returns Data with original values restored
   * 
   * @example
   * ```typescript
   * const service = new PseudonymizationService();
   * const sessionId = 'chat_session_123';
   * 
   * // First pseudonymize
   * const pseudoResult = await service.pseudonymizeFindings(findings, sessionId);
   * 
   * // Send to AI and get response
   * const aiResponse = {
   *   message: 'Person_A should address ID_001 involving Amount_001'
   * };
   * 
   * // Depseudonymize the AI response using the same sessionId
   * const result = await service.depseudonymizeResults(
   *   aiResponse,
   *   sessionId
   * );
   * 
   * console.log(result);
   * // {
   * //   message: 'John Doe should address ID12345 involving $5,000'
   * // }
   * ```
   */
  async depseudonymizeResults(
    data: any,
    sessionId: string
  ): Promise<any> {
    if (!sessionId) {
      throw new Error('sessionId is required for session-based depseudonymization');
    }

    try {
      const depseudonymizeFn = httpsCallable<DepseudonymizeRequest, DepseudonymizeResponse>(
        this.functions,
        'depseudonymizeResults'
      );

      const result = await depseudonymizeFn({ data, sessionId });
      return result.data.depseudonymizedData;
    } catch (error) {
      console.error('Error depseudonymizing results:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('not-found')) {
          throw new Error(
            'Mappings not found. The session ID may be invalid or the mappings may have expired (30 days).'
          );
        }
        if (error.message.includes('unauthenticated')) {
          throw new Error('You must be logged in to depseudonymize results.');
        }
      }
      
      throw new Error(
        `Failed to depseudonymize results: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Pseudonymizes a single text string
   * Useful for pseudonymizing chat queries before sending to AI
   * 
   * @param text - Text to pseudonymize
   * @param sessionId - Session ID for this chat session
   * @returns Pseudonymized text and session ID
   */
  async pseudonymizeText(
    text: string,
    sessionId: string
  ): Promise<{ pseudonymizedText: string; sessionId: string }> {
    if (!sessionId) {
      throw new Error('sessionId is required for session-based pseudonymization');
    }

    // Create a temporary finding with the text
    const tempFinding: Partial<Finding> = {
      findingTitle: 'temp',
      findingDescription: text
    };

    const result = await this.pseudonymizeFindings([tempFinding as Finding], sessionId);
    
    return {
      pseudonymizedText: result.pseudonymizedFindings[0].findingDescription || '',
      sessionId: result.sessionId
    };
  }

  /**
   * Depseudonymizes a single text string
   * Useful for depseudonymizing AI responses
   * 
   * @param text - Text containing pseudonyms
   * @param sessionId - Session ID from pseudonymization
   * @returns Text with original values restored
   */
  async depseudonymizeText(text: string, sessionId: string): Promise<string> {
    if (!sessionId) {
      throw new Error('sessionId is required for session-based depseudonymization');
    }

    const result = await this.depseudonymizeResults({ text }, sessionId);
    return result.text;
  }
}

// Export singleton instance
export const pseudonymizationService = new PseudonymizationService();
