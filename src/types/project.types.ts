import { Timestamp } from 'firebase/firestore';
import { ProjectType } from './finding.types';

/**
 * Project record - Master table for projects
 * Connected to Findings via projectName and projectType
 */
export interface Project {
  id: string; // Firestore document ID
  projectId: string; // Auto-generated 7-digit ID from SH-ProjectName-Type
  no: number; // Sequential number for display (not stored, calculated on display)
  sh: string; // Subholding
  projectName: string; // Unique project name (used as foreign key in Findings)
  projectType: ProjectType; // Project type
  initials: string; // 3-character initials from project name
  total: number; // Total findings count (aggregated)
  finding: number; // Count of findings
  nonFinding: number; // Count of non-findings
  type: string; // Additional type classification
  subtype: string; // Subtype classification
  description: string; // Project description
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  
  // Status
  isActive: boolean;
  
  // Additional project info
  startDate?: Timestamp;
  endDate?: Timestamp;
  location?: string;
  budget?: number;
}

/**
 * Input for creating a new project
 */
export interface CreateProjectInput {
  sh: string;
  projectName: string;
  projectType: ProjectType;
  type?: string;
  subtype?: string;
  description: string;
  location?: string;
  budget?: number;
  startDate?: Date | Timestamp;
  endDate?: Date | Timestamp;
}

/**
 * Input for updating a project
 */
export interface UpdateProjectInput {
  sh?: string;
  projectName?: string;
  projectType?: ProjectType;
  type?: string;
  subtype?: string;
  description?: string;
  isActive?: boolean;
  location?: string;
  budget?: number;
  startDate?: Date | Timestamp;
  endDate?: Date | Timestamp;
}

/**
 * Project with aggregated finding statistics
 */
export interface ProjectWithStats extends Project {
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  openCount: number;
  closedCount: number;
}
