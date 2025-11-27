import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

export const initializeGemini = () => {
  if (!API_KEY) {
    console.warn('Gemini API Key is missing. AI features will be disabled.');
    return;
  }
  try {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  } catch (error) {
    console.error('Failed to initialize Gemini:', error);
  }
};

export const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!model) {
    initializeGemini();
    if (!model) {
      throw new Error('Gemini API is not configured.');
    }
  }

  try {
    const result = await model.generateContent(message);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error sending message to Gemini:', error);
    throw error;
  }
};
