import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * Finding severity levels
 */
export type FindingSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

/**
 * Finding status values
 */
export type FindingStatus = 'Open' | 'In Progress' | 'Closed' | 'Deferred';

/**
 * File reference for attachments
 */
export interface FileReference {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: Timestamp;
}

/**
 * Main Finding interface
 * Represents an audit finding record
 */
export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  status: FindingStatus;
  category: string;
  subcategory?: string;
  location: string;
  branch?: string;
  department?: string;
  responsiblePerson: string;
  reviewerPerson?: string;
  dateIdentified: Timestamp;
  dateDue?: Timestamp;
  dateCompleted?: Timestamp;
  dateCreated: Timestamp;
  dateUpdated: Timestamp;
  recommendation: string;
  managementResponse?: string;
  actionPlan?: string;
  evidence?: string[];
  attachments?: FileReference[];
  tags: string[];
  riskLevel: number; // 1-10
  originalSource: string;
  importBatch: string;
  
  // Computed fields (not stored, calculated on read)
  isOverdue?: boolean;
  daysOpen?: number;
}

/**
 * Input type for creating a new finding
 */
export interface CreateFindingInput {
  title: string;
  description: string;
  severity: FindingSeverity;
  status: FindingStatus;
  category: string;
  subcategory?: string;
  location: string;
  branch?: string;
  department?: string;
  responsiblePerson: string;
  reviewerPerson?: string;
  dateIdentified: Date | Timestamp;
  dateDue?: Date | Timestamp;
  recommendation: string;
  managementResponse?: string;
  actionPlan?: string;
  evidence?: string[];
  tags?: string[];
  riskLevel: number;
  originalSource: string;
}

/**
 * Input type for updating an existing finding
 */
export interface UpdateFindingInput {
  title?: string;
  description?: string;
  severity?: FindingSeverity;
  status?: FindingStatus;
  category?: string;
  subcategory?: string;
  location?: string;
  branch?: string;
  department?: string;
  responsiblePerson?: string;
  reviewerPerson?: string;
  dateIdentified?: Date | Timestamp;
  dateDue?: Date | Timestamp;
  dateCompleted?: Date | Timestamp;
  recommendation?: string;
  managementResponse?: string;
  actionPlan?: string;
  evidence?: string[];
  tags?: string[];
  riskLevel?: number;
}

/**
 * Zod schema for file reference validation
 */
export const FileReferenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  size: z.number().positive(),
  type: z.string(),
  uploadedAt: z.any(), // Timestamp type
});

/**
 * Zod schema for finding validation
 */
export const FindingSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().min(1, 'Description is required'),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']),
  status: z.enum(['Open', 'In Progress', 'Closed', 'Deferred']),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  location: z.string().min(1, 'Location is required'),
  branch: z.string().optional(),
  department: z.string().optional(),
  responsiblePerson: z.string().min(1, 'Responsible person is required'),
  reviewerPerson: z.string().optional(),
  dateIdentified: z.any(), // Timestamp type
  dateDue: z.any().optional(), // Timestamp type
  dateCompleted: z.any().optional(), // Timestamp type
  dateCreated: z.any(), // Timestamp type
  dateUpdated: z.any(), // Timestamp type
  recommendation: z.string().min(1, 'Recommendation is required'),
  managementResponse: z.string().optional(),
  actionPlan: z.string().optional(),
  evidence: z.array(z.string()).optional(),
  attachments: z.array(FileReferenceSchema).optional(),
  tags: z.array(z.string()),
  riskLevel: z.number().min(1).max(10),
  originalSource: z.string(),
  importBatch: z.string(),
  isOverdue: z.boolean().optional(),
  daysOpen: z.number().optional(),
});

/**
 * Zod schema for creating a finding
 */
export const CreateFindingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().min(1, 'Description is required'),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']),
  status: z.enum(['Open', 'In Progress', 'Closed', 'Deferred']),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  location: z.string().min(1, 'Location is required'),
  branch: z.string().optional(),
  department: z.string().optional(),
  responsiblePerson: z.string().min(1, 'Responsible person is required'),
  reviewerPerson: z.string().optional(),
  dateIdentified: z.any(), // Date or Timestamp
  dateDue: z.any().optional(), // Date or Timestamp
  recommendation: z.string().min(1, 'Recommendation is required'),
  managementResponse: z.string().optional(),
  actionPlan: z.string().optional(),
  evidence: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  riskLevel: z.number().min(1).max(10),
  originalSource: z.string().min(1, 'Original source is required'),
});

/**
 * Zod schema for updating a finding
 */
export const UpdateFindingSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().min(1).optional(),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  status: z.enum(['Open', 'In Progress', 'Closed', 'Deferred']).optional(),
  category: z.string().min(1).optional(),
  subcategory: z.string().optional(),
  location: z.string().min(1).optional(),
  branch: z.string().optional(),
  department: z.string().optional(),
  responsiblePerson: z.string().min(1).optional(),
  reviewerPerson: z.string().optional(),
  dateIdentified: z.any().optional(),
  dateDue: z.any().optional(),
  dateCompleted: z.any().optional(),
  recommendation: z.string().min(1).optional(),
  managementResponse: z.string().optional(),
  actionPlan: z.string().optional(),
  evidence: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  riskLevel: z.number().min(1).max(10).optional(),
});
