import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * Pattern type categories
 */
export type PatternType = 'geographic' | 'temporal' | 'categorical' | 'personnel';

/**
 * Pattern severity levels
 */
export type PatternSeverity = 'High' | 'Medium' | 'Low';

/**
 * Pattern interface
 * Represents a detected pattern in audit findings
 */
export interface Pattern {
  id: string;
  type: PatternType;
  title: string;
  description: string;
  confidence: number; // 0-1
  occurrences: number;
  affectedFindings: string[]; // finding IDs
  detectedAt: Timestamp;
  severity: PatternSeverity;
  recommendations: string[];
  isDismissed: boolean;
}

/**
 * Input type for creating a pattern
 */
export interface CreatePatternInput {
  type: PatternType;
  title: string;
  description: string;
  confidence: number;
  occurrences: number;
  affectedFindings: string[];
  severity: PatternSeverity;
  recommendations: string[];
}

/**
 * Input type for updating a pattern
 */
export interface UpdatePatternInput {
  title?: string;
  description?: string;
  confidence?: number;
  occurrences?: number;
  affectedFindings?: string[];
  severity?: PatternSeverity;
  recommendations?: string[];
  isDismissed?: boolean;
}

/**
 * Zod schema for pattern validation
 */
export const PatternSchema = z.object({
  id: z.string(),
  type: z.enum(['geographic', 'temporal', 'categorical', 'personnel']),
  title: z.string().min(1, 'Pattern title is required'),
  description: z.string().min(1, 'Pattern description is required'),
  confidence: z.number().min(0).max(1),
  occurrences: z.number().int().min(3, 'Pattern must have at least 3 occurrences'),
  affectedFindings: z.array(z.string()).min(3, 'Pattern must affect at least 3 findings'),
  detectedAt: z.any(), // Timestamp type
  severity: z.enum(['High', 'Medium', 'Low']),
  recommendations: z.array(z.string()),
  isDismissed: z.boolean(),
});

/**
 * Zod schema for creating a pattern
 */
export const CreatePatternSchema = z.object({
  type: z.enum(['geographic', 'temporal', 'categorical', 'personnel']),
  title: z.string().min(1, 'Pattern title is required'),
  description: z.string().min(1, 'Pattern description is required'),
  confidence: z.number().min(0).max(1),
  occurrences: z.number().int().min(3),
  affectedFindings: z.array(z.string()).min(3),
  severity: z.enum(['High', 'Medium', 'Low']),
  recommendations: z.array(z.string()),
});

/**
 * Zod schema for updating a pattern
 */
export const UpdatePatternSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
  occurrences: z.number().int().min(3).optional(),
  affectedFindings: z.array(z.string()).min(3).optional(),
  severity: z.enum(['High', 'Medium', 'Low']).optional(),
  recommendations: z.array(z.string()).optional(),
  isDismissed: z.boolean().optional(),
});
