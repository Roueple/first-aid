import { GoogleGenerativeAI, Content } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;
let isInitialized = false;
let initializationError: string | null = null;

export type ThinkingMode = 'low' | 'high';

// Default thinking mode
let currentThinkingMode: ThinkingMode = 'low';

// Store chat sessions by session ID
const chatSessions = new Map<string, any>();

export const initializeGemini = () => {
  if (!API_KEY) {
    const errorMsg = 'Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file.';
    console.warn(errorMsg);
    initializationError = errorMsg;
    return;
  }
  try {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });
    isInitialized = true;
    initializationError = null;
    console.log('✅ Gemini API initialized successfully with model: gemini-3-pro-preview');
  } catch (error) {
    const errorMsg = `Failed to initialize Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    initializationError = errorMsg;
  }
};

export const isGeminiConfigured = (): boolean => {
  return isInitialized && model !== null;
};

export const getGeminiStatus = (): { configured: boolean; error: string | null } => {
  return {
    configured: isInitialized && model !== null,
    error: initializationError,
  };
};

export const setThinkingMode = (mode: ThinkingMode): void => {
  currentThinkingMode = mode;
  console.log(`🧠 Gemini thinking mode set to: ${mode}`);
};

export const getThinkingMode = (): ThinkingMode => {
  return currentThinkingMode;
};

export const sendMessageToGemini = async (
  message: string,
  thinkingMode?: ThinkingMode,
  sessionId?: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> => {
  if (!model) {
    initializeGemini();
    if (!model) {
      throw new Error(
        initializationError || 
        'Gemini API is not configured. Please check your API key in the .env file.'
      );
    }
  }

  // Use provided thinking mode or fall back to current mode
  const mode = thinkingMode || currentThinkingMode;

  try {
    // Configure generation with thinking mode
    const generationConfig = {
      thinkingConfig: {
        thinkingLevel: mode,
      },
    };

    // If we have a session ID and conversation history, use chat session
    if (sessionId && conversationHistory && conversationHistory.length > 0) {
      let chatSession = chatSessions.get(sessionId);
      
      // Create new chat session if it doesn't exist
      if (!chatSession) {
        // Convert conversation history to Gemini format
        const history: Content[] = conversationHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        }));

        console.log(`💬 Creating new chat session with ${history.length} messages in history`);
        chatSession = model.startChat({
          history,
          generationConfig,
        });
        chatSessions.set(sessionId, chatSession);
      }

      console.log(`🤔 Sending message with thinking mode: ${mode} (with history)`);
      const result = await chatSession.sendMessage(message);
      const response = await result.response;
      return response.text();
    } else {
      // No history - single message
      console.log(`🤔 Generating response with thinking mode: ${mode} (no history)`);
      const result = await model.generateContent(message, generationConfig);
      const response = await result.response;
      return response.text();
    }
  } catch (error) {
    console.error('Error sending message to Gemini:', error);
    
    // Provide more helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Invalid Gemini API key. Please check your VITE_GEMINI_API_KEY in the .env file.');
      }
      if (error.message.includes('quota')) {
        throw new Error('Gemini API quota exceeded. Please check your Google Cloud Console.');
      }
      throw error;
    }
    throw new Error('Failed to get response from Gemini. Please try again.');
  }
};

/**
 * Clear chat session from memory
 */
export const clearChatSession = (sessionId: string): void => {
  chatSessions.delete(sessionId);
  console.log(`🗑️ Cleared chat session: ${sessionId}`);
};

/**
 * Clear all chat sessions
 */
export const clearAllChatSessions = (): void => {
  chatSessions.clear();
  console.log('🗑️ Cleared all chat sessions');
};
