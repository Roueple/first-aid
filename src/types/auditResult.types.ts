import { Timestamp } from 'firebase/firestore';

/**
 * Audit Result record - Master audit data
 * NEW STRUCTURE: Simplified audit results from master_audit_2022_2025.xlsx
 */
export interface AuditResult {
  id: string; // Firestore document ID
  uniqueId: string; // SHA-256 hash for duplicate detection
  projectName: string; // Project name (links to projects.projectName)
  subholding: string; // Subholding (e.g., "SH3A", "SH2")
  year: number; // Audit year (2022-2025)
  department: string; // Department (e.g., "Departemen Marketing", "IT")
  riskArea: string; // Risk area description
  description: string; // Finding description (Deskripsi)
  code: string; // Finding code ("F", "NF", "O", "R")
  weight: number; // Bobot (weight)
  severity: number; // Kadar (severity level)
  value: number; // Nilai (calculated value)
  isRepeat: number; // Temuan Ulangan (0 or 1)
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Input for creating a new audit result
 */
export interface CreateAuditResultInput {
  projectName: string;
  subholding: string;
  year: number;
  department: string;
  riskArea: string;
  description: string;
  code: string;
  weight: number;
  severity: number;
  value: number;
  isRepeat: number;
}

/**
 * Input for updating an audit result
 */
export interface UpdateAuditResultInput {
  projectName?: string;
  subholding?: string;
  year?: number;
  department?: string;
  riskArea?: string;
  description?: string;
  code?: string;
  weight?: number;
  severity?: number;
  value?: number;
  isRepeat?: number;
}

/**
 * Audit result with aggregated statistics
 */
export interface AuditResultWithStats extends AuditResult {
  projectCategory?: string;
  projectIndustry?: string;
  projectLocation?: string;
}
