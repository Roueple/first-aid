import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import FelixSessionService from './FelixSessionService';
import FelixChatService from './FelixChatService';

/**
 * Felix AI Service - Modern AI chat assistant
 * Uses Google Gemini 3 Pro Preview (most intelligent model)
 * Integrates with session and chat history management
 */
export class FelixService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY is not configured');
    }

    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Send a message to Felix and get a response (with session management)
   */
  async chat(
    message: string,
    userId: string,
    sessionId?: string
  ): Promise<{ response: string; sessionId: string }> {
    const startTime = Date.now();

    try {
      // Get or create session
      const activeSessionId = sessionId || await FelixSessionService.getOrCreateSession(userId);

      // Get conversation history from database
      const history = await FelixChatService.getFormattedHistory(activeSessionId, 10);

      // Save user message
      await FelixChatService.addUserMessage(activeSessionId, userId, message);
      await FelixSessionService.incrementMessageCount(activeSessionId);

      // Build conversation contents
      const contents: any[] = [];
      
      // Add history
      for (const msg of history) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      }
      
      // Add current message
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await this.ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW
          }
        }
      });

      const responseText = response.text || '';
      const responseTime = Date.now() - startTime;

      // Save assistant response
      await FelixChatService.addAssistantResponse(
        activeSessionId,
        userId,
        responseText,
        {
          responseTime,
          modelVersion: 'gemini-3-pro-preview',
        }
      );
      await FelixSessionService.incrementMessageCount(activeSessionId);

      // Auto-generate title from first message if needed
      const session = await FelixSessionService.getById(activeSessionId);
      if (session && !session.title && session.messageCount === 2) {
        const title = this.generateTitle(message);
        await FelixSessionService.updateTitle(activeSessionId, title);
      }

      return { response: responseText, sessionId: activeSessionId };
    } catch (error) {
      console.error('Felix chat error:', error);
      throw new Error(`Failed to get response from Felix: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send a message using legacy interface (backward compatibility)
   */
  async chatLegacy(
    message: string, 
    conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> = []
  ): Promise<string> {
    try {
      // Build conversation contents
      const contents: any[] = [];
      
      // Add history
      for (const msg of conversationHistory) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      }
      
      // Add current message
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await this.ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW
          }
        }
      });

      return response.text || '';
    } catch (error) {
      console.error('Felix chat error:', error);
      throw new Error(`Failed to get response from Felix: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stream a response from Felix (for real-time typing effect with session management)
   */
  async *streamChat(
    message: string,
    userId: string,
    sessionId?: string
  ): AsyncGenerator<string, { sessionId: string }> {
    const startTime = Date.now();
    let fullResponse = '';

    try {
      // Get or create session
      const activeSessionId = sessionId || await FelixSessionService.getOrCreateSession(userId);

      // Get conversation history from database
      const history = await FelixChatService.getFormattedHistory(activeSessionId, 10);

      // Save user message
      await FelixChatService.addUserMessage(activeSessionId, userId, message);
      await FelixSessionService.incrementMessageCount(activeSessionId);

      // Build conversation contents
      const contents: any[] = [];
      
      // Add history
      for (const msg of history) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      }
      
      // Add current message
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const stream = await this.ai.models.generateContentStream({
        model: "gemini-3-pro-preview",
        contents,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW
          }
        }
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          fullResponse += chunk.text;
          yield chunk.text;
        }
      }

      const responseTime = Date.now() - startTime;

      // Save assistant response
      await FelixChatService.addAssistantResponse(
        activeSessionId,
        userId,
        fullResponse,
        {
          responseTime,
          modelVersion: 'gemini-3-pro-preview',
        }
      );
      await FelixSessionService.incrementMessageCount(activeSessionId);

      // Auto-generate title from first message if needed
      const session = await FelixSessionService.getById(activeSessionId);
      if (session && !session.title && session.messageCount === 2) {
        const title = this.generateTitle(message);
        await FelixSessionService.updateTitle(activeSessionId, title);
      }

      return { sessionId: activeSessionId };
    } catch (error) {
      console.error('Felix stream error:', error);
      throw new Error(`Failed to stream response from Felix: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stream a response using legacy interface (backward compatibility)
   */
  async *streamChatLegacy(
    message: string, 
    conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> = []
  ): AsyncGenerator<string> {
    try {
      // Build conversation contents
      const contents: any[] = [];
      
      // Add history
      for (const msg of conversationHistory) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      }
      
      // Add current message
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const stream = await this.ai.models.generateContentStream({
        model: "gemini-3-pro-preview",
        contents,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW
          }
        }
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    } catch (error) {
      console.error('Felix stream error:', error);
      throw new Error(`Failed to stream response from Felix: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a title from the first message
   */
  private generateTitle(message: string): string {
    // Take first 50 chars or until first newline
    const firstLine = message.split('\n')[0];
    return firstLine.length > 50 
      ? firstLine.substring(0, 47) + '...'
      : firstLine;
  }

  /**
   * Get session history
   */
  async getSessionHistory(sessionId: string) {
    return await FelixChatService.getSessionChats(sessionId);
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string, limit?: number) {
    return await FelixSessionService.getUserSessions(userId, limit);
  }

  /**
   * Create new session
   */
  async createNewSession(userId: string): Promise<string> {
    return await FelixSessionService.createSession(userId);
  }

  /**
   * Delete session and its chats
   */
  async deleteSession(sessionId: string): Promise<void> {
    await FelixChatService.deleteSessionChats(sessionId);
    await FelixSessionService.delete(sessionId);
  }
}

// Singleton instance
export const felixService = new FelixService();
