import { Timestamp } from 'firebase/firestore';

/**
 * Project record - Master table for projects
 * NEW STRUCTURE: Simplified project master data
 */
export interface Project {
  id: string; // Firestore document ID
  projectName: string; // Project name (e.g., "Aceh Water", "Ciputra World Jakarta 2")
  sh: string; // Subholding (e.g., "SH2", "SH3A")
  tbk: string; // TBK status ("tbk" or "non")
  industry: string; // Industry code (e.g., "Oth", "Com", "Res")
  category: string; // Category (e.g., "Others", "Commercial", "Residential")
  location: string; // Location (e.g., "Jakarta", "Aceh, Nanggroe Aceh Darussalam")
  tags: string[]; // Tags array (e.g., ["AW", "Aceh Water Supply"])
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Status
  isActive: boolean;
}

/**
 * Input for creating a new project
 */
export interface CreateProjectInput {
  projectName: string;
  sh: string;
  tbk: string;
  industry: string;
  category: string;
  location: string;
  tags: string[];
}

/**
 * Input for updating a project
 */
export interface UpdateProjectInput {
  projectName?: string;
  sh?: string;
  tbk?: string;
  industry?: string;
  category?: string;
  location?: string;
  tags?: string[];
  isActive?: boolean;
}
