import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * Finding severity/priority levels (auto-calculated from Finding_Total)
 */
export type FindingSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

/**
 * Finding status values
 */
export type FindingStatus = 'Open' | 'In Progress' | 'Closed' | 'Deferred';

/**
 * Control category types
 */
export type ControlCategory = 'Preventive' | 'Detective' | 'Corrective';

/**
 * Project types
 */
export type ProjectType = 
  | 'Hotel' 
  | 'Landed House' 
  | 'Apartment' 
  | 'School' 
  | 'University' 
  | 'Insurance' 
  | 'Hospital' 
  | 'Clinic' 
  | 'Mall' 
  | 'Office Building' 
  | 'Mixed-Use Development';

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
 * Represents an audit finding record based on findings-table-structure.md
 */
export interface Finding {
  // Core Identification Fields
  id: string; // Finding_ID (auto-generated, e.g., FND-2024-001)
  auditYear: number; // Audit_Year - Year of audit (for historical tracking)
  
  // Organizational Structure
  subholding: string; // SH (Subholding) - Business unit level
  projectType: ProjectType; // Project_Type
  projectName: string; // Project_Name - Specific project
  findingDepartment: string; // Finding_Department - Department where finding was identified
  
  // Audit Team
  executor: string; // Executor - Auditor who executed the audit
  reviewer: string; // Reviewer - Auditor who reviewed
  manager: string; // Manager - Manager who approved
  
  // Finding Classification
  controlCategory: ControlCategory; // Control_Category
  processArea: string; // Process_Area - Sales, Procurement, Finance, HR, IT, Legal, Marketing, etc.
  
  // Finding Details
  findingTitle: string; // Finding_Title - Brief title (50-100 chars)
  findingDescription: string; // Finding_Description - Detailed description
  rootCause: string; // Root_Cause - Root cause analysis
  impactDescription: string; // Impact_Description - Actual or potential impact
  recommendation: string; // Recommendation - Audit recommendation
  
  // Severity & Priority
  findingBobot: number; // Finding_Bobot (1-4) - Weight/Severity
  findingKadar: number; // Finding_Kadar (1-5) - Degree/Intensity
  findingTotal: number; // Finding_Total (1-20) - Combined score (Bobot × Kadar)
  priorityLevel: FindingSeverity; // Priority_Level - Auto-calculated from Total
  
  // Tags & Classification (Multi-select capable)
  primaryTag: string; // Primary_Tag - Main category
  secondaryTags: string[]; // Secondary_Tags - Additional relevant tags
  
  // Additional Metadata
  creationTimestamp: Timestamp; // Creation_Timestamp - Auto-generated
  lastModifiedDate: Timestamp; // Last_Modified_Date - Auto-updated
  modifiedBy: string; // Modified_By - User who last modified
  notes?: string; // Notes - Additional comments/notes
  
  // Status tracking
  status: FindingStatus;
  dateIdentified: Timestamp;
  dateDue?: Timestamp;
  dateCompleted?: Timestamp;
  
  // Management response
  managementResponse?: string;
  actionPlan?: string;
  
  // Evidence and attachments
  evidence?: string[];
  attachments?: FileReference[];
  
  // Import tracking
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
  // Core Identification
  auditYear: number;
  
  // Organizational Structure
  subholding: string;
  projectType: ProjectType;
  projectName: string;
  findingDepartment: string;
  
  // Audit Team
  executor: string;
  reviewer: string;
  manager: string;
  
  // Finding Classification
  controlCategory: ControlCategory;
  processArea: string;
  
  // Finding Details
  findingTitle: string;
  findingDescription: string;
  rootCause: string;
  impactDescription: string;
  recommendation: string;
  
  // Severity & Priority
  findingBobot: number; // 1-4
  findingKadar: number; // 1-5
  // findingTotal and priorityLevel will be auto-calculated
  
  // Tags
  primaryTag: string;
  secondaryTags?: string[];
  
  // Status
  status: FindingStatus;
  dateIdentified: Date | Timestamp;
  dateDue?: Date | Timestamp;
  
  // Management response
  managementResponse?: string;
  actionPlan?: string;
  
  // Evidence
  evidence?: string[];
  
  // Notes
  notes?: string;
  
  // Import tracking
  originalSource: string;
}

/**
 * Input type for updating an existing finding
 */
export interface UpdateFindingInput {
  // Core Identification
  auditYear?: number;
  
  // Organizational Structure
  subholding?: string;
  projectType?: ProjectType;
  projectName?: string;
  findingDepartment?: string;
  
  // Audit Team
  executor?: string;
  reviewer?: string;
  manager?: string;
  
  // Finding Classification
  controlCategory?: ControlCategory;
  processArea?: string;
  
  // Finding Details
  findingTitle?: string;
  findingDescription?: string;
  rootCause?: string;
  impactDescription?: string;
  recommendation?: string;
  
  // Severity & Priority
  findingBobot?: number;
  findingKadar?: number;
  // findingTotal and priorityLevel will be auto-calculated
  
  // Tags
  primaryTag?: string;
  secondaryTags?: string[];
  
  // Status
  status?: FindingStatus;
  dateIdentified?: Date | Timestamp;
  dateDue?: Date | Timestamp;
  dateCompleted?: Date | Timestamp;
  
  // Management response
  managementResponse?: string;
  actionPlan?: string;
  
  // Evidence
  evidence?: string[];
  
  // Notes
  notes?: string;
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
  auditYear: z.number().int().min(2000).max(2100),
  subholding: z.string().min(1, 'Subholding is required'),
  projectType: z.enum(['Hotel', 'Landed House', 'Apartment', 'School', 'University', 'Insurance', 'Hospital', 'Clinic', 'Mall', 'Office Building', 'Mixed-Use Development']),
  projectName: z.string().min(1, 'Project name is required'),
  findingDepartment: z.string().min(1, 'Department is required'),
  executor: z.string().min(1, 'Executor is required'),
  reviewer: z.string().min(1, 'Reviewer is required'),
  manager: z.string().min(1, 'Manager is required'),
  controlCategory: z.enum(['Preventive', 'Detective', 'Corrective']),
  processArea: z.string().min(1, 'Process area is required'),
  findingTitle: z.string().min(1, 'Title is required').max(100, 'Title should be 50-100 chars'),
  findingDescription: z.string().min(1, 'Description is required'),
  rootCause: z.string().min(1, 'Root cause is required'),
  impactDescription: z.string().min(1, 'Impact description is required'),
  recommendation: z.string().min(1, 'Recommendation is required'),
  findingBobot: z.number().int().min(1).max(4),
  findingKadar: z.number().int().min(1).max(5),
  findingTotal: z.number().int().min(1).max(20),
  priorityLevel: z.enum(['Critical', 'High', 'Medium', 'Low']),
  primaryTag: z.string().min(1, 'Primary tag is required'),
  secondaryTags: z.array(z.string()),
  creationTimestamp: z.any(), // Timestamp type
  lastModifiedDate: z.any(), // Timestamp type
  modifiedBy: z.string(),
  notes: z.string().optional(),
  status: z.enum(['Open', 'In Progress', 'Closed', 'Deferred']),
  dateIdentified: z.any(), // Timestamp type
  dateDue: z.any().optional(), // Timestamp type
  dateCompleted: z.any().optional(), // Timestamp type
  managementResponse: z.string().optional(),
  actionPlan: z.string().optional(),
  evidence: z.array(z.string()).optional(),
  attachments: z.array(FileReferenceSchema).optional(),
  originalSource: z.string(),
  importBatch: z.string(),
  isOverdue: z.boolean().optional(),
  daysOpen: z.number().optional(),
});

/**
 * Zod schema for creating a finding
 */
export const CreateFindingSchema = z.object({
  auditYear: z.number().int().min(2000).max(2100),
  subholding: z.string().min(1, 'Subholding is required'),
  projectType: z.enum(['Hotel', 'Landed House', 'Apartment', 'School', 'University', 'Insurance', 'Hospital', 'Clinic', 'Mall', 'Office Building', 'Mixed-Use Development']),
  projectName: z.string().min(1, 'Project name is required'),
  findingDepartment: z.string().min(1, 'Department is required'),
  executor: z.string().min(1, 'Executor is required'),
  reviewer: z.string().min(1, 'Reviewer is required'),
  manager: z.string().min(1, 'Manager is required'),
  controlCategory: z.enum(['Preventive', 'Detective', 'Corrective']),
  processArea: z.string().min(1, 'Process area is required'),
  findingTitle: z.string().min(1, 'Title is required').max(100, 'Title should be 50-100 chars'),
  findingDescription: z.string().min(1, 'Description is required'),
  rootCause: z.string().min(1, 'Root cause is required'),
  impactDescription: z.string().min(1, 'Impact description is required'),
  recommendation: z.string().min(1, 'Recommendation is required'),
  findingBobot: z.number().int().min(1).max(4),
  findingKadar: z.number().int().min(1).max(5),
  primaryTag: z.string().min(1, 'Primary tag is required'),
  secondaryTags: z.array(z.string()).optional(),
  status: z.enum(['Open', 'In Progress', 'Closed', 'Deferred']),
  dateIdentified: z.any(), // Date or Timestamp
  dateDue: z.any().optional(), // Date or Timestamp
  managementResponse: z.string().optional(),
  actionPlan: z.string().optional(),
  evidence: z.array(z.string()).optional(),
  notes: z.string().optional(),
  originalSource: z.string().min(1, 'Original source is required'),
});

/**
 * Zod schema for updating a finding
 */
export const UpdateFindingSchema = z.object({
  auditYear: z.number().int().min(2000).max(2100).optional(),
  subholding: z.string().min(1).optional(),
  projectType: z.enum(['Hotel', 'Landed House', 'Apartment', 'School', 'University', 'Insurance', 'Hospital', 'Clinic', 'Mall', 'Office Building', 'Mixed-Use Development']).optional(),
  projectName: z.string().min(1).optional(),
  findingDepartment: z.string().min(1).optional(),
  executor: z.string().min(1).optional(),
  reviewer: z.string().min(1).optional(),
  manager: z.string().min(1).optional(),
  controlCategory: z.enum(['Preventive', 'Detective', 'Corrective']).optional(),
  processArea: z.string().min(1).optional(),
  findingTitle: z.string().min(1).max(100).optional(),
  findingDescription: z.string().min(1).optional(),
  rootCause: z.string().min(1).optional(),
  impactDescription: z.string().min(1).optional(),
  recommendation: z.string().min(1).optional(),
  findingBobot: z.number().int().min(1).max(4).optional(),
  findingKadar: z.number().int().min(1).max(5).optional(),
  primaryTag: z.string().min(1).optional(),
  secondaryTags: z.array(z.string()).optional(),
  status: z.enum(['Open', 'In Progress', 'Closed', 'Deferred']).optional(),
  dateIdentified: z.any().optional(),
  dateDue: z.any().optional(),
  dateCompleted: z.any().optional(),
  managementResponse: z.string().optional(),
  actionPlan: z.string().optional(),
  evidence: z.array(z.string()).optional(),
  notes: z.string().optional(),
});
