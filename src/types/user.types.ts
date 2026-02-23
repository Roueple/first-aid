import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * User role types
 */
export type UserRole = 'auditor' | 'admin';

/**
 * Supported languages
 */
export type Language = 'en' | 'id';

/**
 * Theme options
 */
export type Theme = 'light' | 'dark';

/**
 * User preferences
 */
export interface UserPreferences {
  language: Language;
  timezone: string;
  notifications: boolean;
  theme: Theme;
}

/**
 * User interface
 * Represents a system user
 */
export interface User {
  id: string; // Firebase Auth UID
  email: string; // Also serves as username
  fullName: string; // Full legal name
  displayName: string; // Name displayed in Felix chat
  role: UserRole;
  department?: string;
  preferences: UserPreferences;
  createdAt: Timestamp;
  lastLogin?: Timestamp;
  isActive: boolean;
}

/**
 * Input type for creating a user
 */
export interface CreateUserInput {
  email: string;
  fullName: string;
  displayName?: string; // Optional, defaults to first name from fullName
  role: UserRole;
  department?: string;
  preferences?: Partial<UserPreferences>;
}

/**
 * Input type for updating a user
 */
export interface UpdateUserInput {
  fullName?: string;
  displayName?: string;
  role?: UserRole;
  department?: string;
  preferences?: Partial<UserPreferences>;
  isActive?: boolean;
}

/**
 * Zod schema for user preferences validation
 */
export const UserPreferencesSchema = z.object({
  language: z.enum(['en', 'id']),
  timezone: z.string(),
  notifications: z.boolean(),
  theme: z.enum(['light', 'dark']),
});

/**
 * Zod schema for user validation
 */
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(1, 'Full name is required'),
  displayName: z.string().min(1, 'Display name is required'),
  role: z.enum(['auditor', 'admin']),
  department: z.string().optional(),
  preferences: UserPreferencesSchema,
  createdAt: z.any(), // Timestamp type
  lastLogin: z.any().optional(), // Timestamp type
  isActive: z.boolean(),
});

/**
 * Zod schema for creating a user
 */
export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(1, 'Full name is required'),
  displayName: z.string().min(1).optional(),
  role: z.enum(['auditor', 'admin']),
  department: z.string().optional(),
  preferences: UserPreferencesSchema.partial().optional(),
});

/**
 * Zod schema for updating a user
 */
export const UpdateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
  role: z.enum(['auditor', 'admin']).optional(),
  department: z.string().optional(),
  preferences: UserPreferencesSchema.partial().optional(),
  isActive: z.boolean().optional(),
});
