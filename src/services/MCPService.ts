/**
 * MCP (Model Context Protocol) Service
 * 
 * Handles communication with MCP servers for enhanced AI capabilities
 * Currently integrates with SmartQueryRouter and Gemini for RAG capabilities
 */

import { smartQueryRouter } from './SmartQueryRouter';
import { isQueryErrorResponse } from '../types/queryRouter.types';
import { isGeminiConfigured, initializeGemini } from './GeminiService';

export interface MCPMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface MCPResponse {
  content: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    processingTime?: number;
    queryType?: string;
    findingsAnalyzed?: number;
  };
}

class MCPService {
  private isInitialized = false;

  /**
   * Initialize MCP connection
   */
  async initialize(): Promise<void> {
    initializeGemini();
    this.isInitialized = isGeminiConfigured();
    if (this.isInitialized) {
      console.log('✅ MCP Service: Initialized with Gemini');
    } else {
      console.warn('⚠️ MCP Service: Gemini not configured');
    }
  }

  /**
   * Send a message through MCP
   */
  async sendMessage(message: string, context?: MCPMessage[]): Promise<MCPResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!isGeminiConfigured()) {
      return {
        content: "I'm not connected to the AI service yet. Please check your configuration.",
        metadata: { processingTime: 0 }
      };
    }

    try {
      // Use SmartQueryRouter to process the message
      // This gives us RAG capabilities (access to audit findings)
      const response = await smartQueryRouter.processQuery(message, {
        // Use a consistent session ID for now, or generate one if needed
        sessionId: 'doc-chat-session',
        thinkingMode: 'low'
      });

      if (isQueryErrorResponse(response)) {
        return {
          content: `I encountered an issue: ${response.error.message}. ${response.error.suggestion || ''}`,
          metadata: {
            processingTime: response.metadata.executionTimeMs,
            queryType: 'error'
          }
        };
      }

      return {
        content: response.answer,
        metadata: {
          model: 'gemini-3-pro-preview',
          tokensUsed: response.metadata.tokensUsed,
          processingTime: response.metadata.executionTimeMs,
          queryType: response.type,
          findingsAnalyzed: response.metadata.findingsAnalyzed
        }
      };

    } catch (error) {
      console.error('MCP Service Error:', error);
      return {
        content: "Sorry, I encountered an unexpected error while processing your request.",
        metadata: { processingTime: 0 }
      };
    }
  }

  /**
   * Check if MCP is available and configured
   */
  isAvailable(): boolean {
    return isGeminiConfigured();
  }

  /**
   * Get MCP status information
   */
  getStatus(): { available: boolean; configured: boolean; error?: string } {
    const configured = isGeminiConfigured();
    return {
      available: true,
      configured: configured,
      error: configured ? undefined : 'Gemini API Key missing in .env',
    };
  }
}

export const mcpService = new MCPService();
