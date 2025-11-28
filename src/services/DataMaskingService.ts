/**
 * DataMaskingService
 * 
 * Unified service for masking/unmasking sensitive data.
 * Combines local regex-based masking with optional server-side pseudonymization.
 * 
 * Two modes:
 * 1. LOCAL MODE (default): Fast, client-side regex masking for queries
 * 2. SERVER MODE: Firebase Cloud Functions pseudonymization for findings data
 * 
 * Flow:
 * 1. Mask sensitive data in user query (local operation)
 * 2. Store mapping of masked tokens to original values
 * 3. Send masked query to LLM
 * 4. Unmask results before returning to user
 * 
 * Note: This service integrates with PseudonymizationService for server-side
 * session-based pseudonymization when needed.
 */

import { pseudonymizationService } from './PseudonymizationService';
import type { Finding } from '../types/finding.types';

export interface MaskingToken {
  token: string;
  originalValue: string;
  type: 'email' | 'phone' | 'name' | 'address' | 'id' | 'custom';
}

export interface MaskingResult {
  maskedText: string;
  tokens: MaskingToken[];
}

export type MaskingMode = 'local' | 'server';

export class DataMaskingService {
  private tokenCounter = 0;

  /**
   * Mask sensitive data in text (LOCAL MODE - fast, client-side)
   * Use this for user queries before sending to LLM
   * 
   * @param text - Original text with potential sensitive data
   * @returns Masked text and token mapping
   */
  maskSensitiveData(text: string): MaskingResult {
    let maskedText = text;
    const tokens: MaskingToken[] = [];

    // Reset counter for each masking operation
    this.tokenCounter = 0;

    // Mask email addresses
    maskedText = this.maskPattern(
      maskedText,
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      'email',
      tokens
    );

    // Mask phone numbers (various formats)
    maskedText = this.maskPattern(
      maskedText,
      /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      'phone',
      tokens
    );

    // Mask potential ID numbers (alphanumeric sequences)
    maskedText = this.maskPattern(
      maskedText,
      /\b[A-Z]{2,}\d{6,}\b/g,
      'id',
      tokens
    );

    // Mask potential names (capitalized words in specific contexts)
    // This is conservative to avoid masking legitimate terms
    maskedText = this.maskPattern(
      maskedText,
      /\b(?:auditor|inspector|manager|director|engineer)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/gi,
      'name',
      tokens
    );

    return {
      maskedText,
      tokens,
    };
  }

  /**
   * Unmask sensitive data in text (LOCAL MODE)
   * Use this to restore original values after LLM processing
   * 
   * @param maskedText - Text with masked tokens
   * @param tokens - Token mapping from masking operation
   * @returns Original text with unmasked values
   */
  unmaskSensitiveData(maskedText: string, tokens: MaskingToken[]): string {
    let unmaskedText = maskedText;

    // Replace tokens in reverse order (longest first) to avoid partial replacements
    const sortedTokens = [...tokens].sort((a, b) => b.token.length - a.token.length);

    for (const token of sortedTokens) {
      unmaskedText = unmaskedText.replace(
        new RegExp(this.escapeRegex(token.token), 'g'),
        token.originalValue
      );
    }

    return unmaskedText;
  }

  /**
   * Pseudonymize findings data (SERVER MODE - session-based)
   * Use this for findings data that will be sent to AI with context
   * 
   * This uses Firebase Cloud Functions for:
   * - Session-based isolation (each chat session has separate mappings)
   * - Persistent mappings (can depseudonymize later)
   * - More sophisticated pattern detection
   * 
   * @param findings - Findings to pseudonymize
   * @param sessionId - Chat session ID for isolation
   * @returns Pseudonymized findings and session info
   */
  async pseudonymizeFindings(
    findings: Finding[],
    sessionId: string
  ): Promise<{
    pseudonymizedFindings: Finding[];
    sessionId: string;
    mappingsCreated: number;
  }> {
    try {
      return await pseudonymizationService.pseudonymizeFindings(findings, sessionId);
    } catch (error) {
      console.error('Server pseudonymization failed, falling back to local masking:', error);
      
      // Fallback: use local masking for findings
      const pseudonymizedFindings = findings.map(finding => {
        const maskedTitle = this.maskSensitiveData(finding.findingTitle || '');
        const maskedDesc = this.maskSensitiveData(finding.findingDescription || '');
        
        return {
          ...finding,
          findingTitle: maskedTitle.maskedText,
          findingDescription: maskedDesc.maskedText,
        };
      });
      
      return {
        pseudonymizedFindings,
        sessionId,
        mappingsCreated: 0,
      };
    }
  }

  /**
   * Depseudonymize data (SERVER MODE)
   * Use this to restore original values in AI responses
   * 
   * @param data - Data containing pseudonyms
   * @param sessionId - Session ID from pseudonymization
   * @returns Data with original values restored
   */
  async depseudonymizeData(data: any, sessionId: string): Promise<any> {
    try {
      return await pseudonymizationService.depseudonymizeResults(data, sessionId);
    } catch (error) {
      console.error('Server depseudonymization failed:', error);
      // Return data as-is if depseudonymization fails
      return data;
    }
  }

  /**
   * Pseudonymize text (SERVER MODE)
   * Use for single text strings that need session-based pseudonymization
   * 
   * @param text - Text to pseudonymize
   * @param sessionId - Session ID
   * @returns Pseudonymized text
   */
  async pseudonymizeText(text: string, sessionId: string): Promise<string> {
    try {
      const result = await pseudonymizationService.pseudonymizeText(text, sessionId);
      return result.pseudonymizedText;
    } catch (error) {
      console.error('Server text pseudonymization failed, using local masking:', error);
      const masked = this.maskSensitiveData(text);
      return masked.maskedText;
    }
  }

  /**
   * Depseudonymize text (SERVER MODE)
   * Use to restore original values in text responses
   * 
   * @param text - Text with pseudonyms
   * @param sessionId - Session ID
   * @returns Text with original values
   */
  async depseudonymizeText(text: string, sessionId: string): Promise<string> {
    try {
      return await pseudonymizationService.depseudonymizeText(text, sessionId);
    } catch (error) {
      console.error('Server text depseudonymization failed:', error);
      return text;
    }
  }

  /**
   * Helper to mask patterns and track tokens
   */
  private maskPattern(
    text: string,
    pattern: RegExp,
    type: MaskingToken['type'],
    tokens: MaskingToken[]
  ): string {
    return text.replace(pattern, (match) => {
      const token = `[${type.toUpperCase()}_${++this.tokenCounter}]`;
      tokens.push({
        token,
        originalValue: match,
        type,
      });
      return token;
    });
  }

  /**
   * Escape special regex characters in a string
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Check if text contains sensitive data
   * @param text - Text to check
   * @returns true if sensitive data detected
   */
  containsSensitiveData(text: string): boolean {
    const patterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/, // Phone
      /\b[A-Z]{2,}\d{6,}\b/, // ID numbers
    ];

    return patterns.some(pattern => pattern.test(text));
  }
}

// Export singleton instance
export const dataMaskingService = new DataMaskingService();
