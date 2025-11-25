import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';
import { FindingSeverity } from './finding.types';

/**
 * Report type categories
 */
export type ReportType = 'summary' | 'detailed' | 'pattern' | 'location';

/**
 * Report format options
 */
export type ReportFormat = 'pdf' | 'excel' | 'powerpoint';

/**
 * Report generation status
 */
export type ReportStatus = 'generating' | 'completed' | 'failed';

/**
 * Report criteria for filtering findings
 */
export interface ReportCriteria {
  dateRange?: {
    start: Date | Timestamp;
    end: Date | Timestamp;
  };
  locations?: string[];
  severities?: FindingSeverity[];
  statuses?: string[];
  categories?: string[];
  departments?: string[];
}

/**
 * Report interface
 * Represents a generated report
 */
export interface Report {
  id: string;
  userId: string;
  title: string;
  type: ReportType;
  format: ReportFormat;
  criteria: ReportCriteria;
  status: ReportStatus;
  downloadUrl?: string;
  fileSize?: number;
  generatedAt: Timestamp;
  expiresAt: Timestamp; // 7 days after generation
  downloadCount: number;
}

/**
 * Input type for creating a report
 */
export interface CreateReportInput {
  userId: string;
  title: string;
  type: ReportType;
  format: ReportFormat;
  criteria: ReportCriteria;
}

/**
 * Input type for updating a report
 */
export interface UpdateReportInput {
  status?: ReportStatus;
  downloadUrl?: string;
  fileSize?: number;
  downloadCount?: number;
}

/**
 * Report generation request
 */
export interface ReportGenerationRequest {
  title: string;
  type: ReportType;
  format: ReportFormat;
  criteria: ReportCriteria;
}

/**
 * Zod schema for report criteria validation
 */
export const ReportCriteriaSchema = z.object({
  dateRange: z.object({
    start: z.any(), // Date or Timestamp
    end: z.any(), // Date or Timestamp
  }).optional(),
  locations: z.array(z.string()).optional(),
  severities: z.array(z.enum(['Critical', 'High', 'Medium', 'Low'])).optional(),
  statuses: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  departments: z.array(z.string()).optional(),
});

/**
 * Zod schema for report validation
 */
export const ReportSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1, 'Report title is required'),
  type: z.enum(['summary', 'detailed', 'pattern', 'location']),
  format: z.enum(['pdf', 'excel', 'powerpoint']),
  criteria: ReportCriteriaSchema,
  status: z.enum(['generating', 'completed', 'failed']),
  downloadUrl: z.string().url().optional(),
  fileSize: z.number().positive().optional(),
  generatedAt: z.any(), // Timestamp type
  expiresAt: z.any(), // Timestamp type
  downloadCount: z.number().int().min(0),
});

/**
 * Zod schema for creating a report
 */
export const CreateReportSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  title: z.string().min(1, 'Report title is required'),
  type: z.enum(['summary', 'detailed', 'pattern', 'location']),
  format: z.enum(['pdf', 'excel', 'powerpoint']),
  criteria: ReportCriteriaSchema,
});

/**
 * Zod schema for updating a report
 */
export const UpdateReportSchema = z.object({
  status: z.enum(['generating', 'completed', 'failed']).optional(),
  downloadUrl: z.string().url().optional(),
  fileSize: z.number().positive().optional(),
  downloadCount: z.number().int().min(0).optional(),
});

/**
 * Zod schema for report generation request
 */
export const ReportGenerationRequestSchema = z.object({
  title: z.string().min(1, 'Report title is required'),
  type: z.enum(['summary', 'detailed', 'pattern', 'location']),
  format: z.enum(['pdf', 'excel', 'powerpoint']),
  criteria: ReportCriteriaSchema,
});
