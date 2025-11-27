import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * Chat message role
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Chat message metadata
 */
export interface ChatMessageMetadata {
  confidence?: number;
  sources?: string[]; // finding IDs
  suggestions?: string[];
  processingTime?: number;
  isError?: boolean;
}

/**
 * Chat message interface
 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Timestamp;
  metadata?: ChatMessageMetadata;
}

/**
 * Chat session interface
 */
export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}

/**
 * Input type for creating a chat session
 */
export interface CreateChatSessionInput {
  userId: string;
  title: string;
}

/**
 * Input type for adding a message to a session
 */
export interface AddMessageInput {
  sessionId: string;
  role: MessageRole;
  content: string;
  metadata?: ChatMessageMetadata;
}

/**
 * Chat response from AI service
 */
export interface ChatResponse {
  messageId: string;
  content: string;
  metadata?: ChatMessageMetadata;
  sessionId: string;
}

/**
 * Zod schema for chat message metadata validation
 */
export const ChatMessageMetadataSchema = z.object({
  confidence: z.number().min(0).max(1).optional(),
  sources: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional(),
  processingTime: z.number().positive().optional(),
  isError: z.boolean().optional(),
});

/**
 * Zod schema for chat message validation
 */
export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1, 'Message content is required'),
  timestamp: z.any(), // Timestamp type
  metadata: ChatMessageMetadataSchema.optional(),
});

/**
 * Zod schema for chat session validation
 */
export const ChatSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1, 'Session title is required'),
  messages: z.array(ChatMessageSchema),
  createdAt: z.any(), // Timestamp type
  updatedAt: z.any(), // Timestamp type
  isActive: z.boolean(),
});

/**
 * Zod schema for creating a chat session
 */
export const CreateChatSessionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  title: z.string().min(1, 'Session title is required'),
});

/**
 * Zod schema for adding a message
 */
export const AddMessageSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1, 'Message content is required'),
  metadata: ChatMessageMetadataSchema.optional(),
});

/**
 * Zod schema for chat response validation
 */
export const ChatResponseSchema = z.object({
  messageId: z.string(),
  content: z.string().min(1),
  metadata: ChatMessageMetadataSchema.optional(),
  sessionId: z.string(),
});
