import { GoogleGenAI } from '@google/genai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI: GoogleGenAI | null = null;
let isInitialized = false;
let initializationError: string | null = null;

// Use Gemini 2.5 Flash model (latest stable with free tier)
const MODEL_NAME = 'gemini-2.5-flash';

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
    genAI = new GoogleGenAI({ apiKey: API_KEY });
    isInitialized = true;
    initializationError = null;
    console.log(`✅ Gemini API initialized successfully with model: ${MODEL_NAME}`);
  } catch (error) {
    const errorMsg = `Failed to initialize Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    initializationError = errorMsg;
  }
};

export const isGeminiConfigured = (): boolean => {
  return isInitialized && genAI !== null;
};

export const getGeminiStatus = (): { configured: boolean; error: string | null } => {
  return {
    configured: isInitialized && genAI !== null,
    error: initializationError,
  };
};

export const sendMessageToGemini = async (
  message: string,
  _thinkingMode?: string,
  sessionId?: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> => {
  if (!genAI) {
    initializeGemini();
    if (!genAI) {
      throw new Error(
        initializationError || 
        'Gemini API is not configured. Please check your API key in the .env file.'
      );
    }
  }

  try {
    // If we have a session ID and conversation history, use chat session
    if (sessionId && conversationHistory && conversationHistory.length > 0) {
      let chatSession = chatSessions.get(sessionId);
      
      // Create new chat session if it doesn't exist
      if (!chatSession) {
        // Filter history to ensure it starts with a user message
        let filteredHistory = conversationHistory;
        const firstUserIndex = conversationHistory.findIndex(msg => msg.role === 'user');
        
        if (firstUserIndex > 0) {
          // Skip any leading assistant messages
          filteredHistory = conversationHistory.slice(firstUserIndex);
          console.log(`⚠️ Skipped ${firstUserIndex} leading assistant messages from history`);
        }
        
        // Convert conversation history to new API format
        const history = filteredHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          content: msg.content,
        }));

        console.log(`💬 Creating new chat session with ${history.length} messages in history`);
        chatSession = genAI.chats.create({
          model: MODEL_NAME,
          history,
        });
        chatSessions.set(sessionId, chatSession);
      }

      console.log(`🤔 Sending message (with history)`);
      const response = await chatSession.sendMessage(message);
      return response.text || '';
    } else {
      // No history - single message
      console.log(`🤔 Generating response (no history)`);
      const response = await genAI.models.generateContent({
        model: MODEL_NAME,
        contents: message,
      });
      return response.text || '';
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

/**
 * Generate a concise title for a chat session based on the first message
 */
export const generateSessionTitle = async (firstMessage: string): Promise<string> => {
  if (!genAI) {
    initializeGemini();
    if (!genAI) {
      return 'New Chat'; // Fallback if Gemini is not available
    }
  }

  try {
    const prompt = `Generate a concise, descriptive title (max 6 words) for a chat session that starts with this message: "${firstMessage}". 
    
Rules:
- Maximum 6 words
- No quotes or punctuation at the end
- Capture the main topic or intent
- Be specific but brief
- Use title case

Examples:
"Show me all high priority findings" → "High Priority Findings Review"
"Analyze project completion rates" → "Project Completion Analysis"
"What are the common issues?" → "Common Issues Overview"

Title:`;

    const response = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });
    
    let title = (response.text || '').trim();
    
    // Clean up the title
    title = title.replace(/^["']|["']$/g, ''); // Remove quotes
    title = title.replace(/\.$/, ''); // Remove trailing period
    
    // Limit to 60 characters max
    if (title.length > 60) {
      title = title.substring(0, 57) + '...';
    }
    
    return title || 'New Chat';
  } catch (error) {
    console.error('Error generating session title:', error);
    return 'New Chat'; // Fallback on error
  }
};
