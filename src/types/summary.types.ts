import { Timestamp } from 'firebase/firestore';

/**
 * Summary table record
 */
export interface FindingSummary {
  id: string;
  no: number; // Sequential number
  sh: string; // Subholding
  project: string; // Project name
  total: number; // Total score/count
  finding: number; // Finding count
  nonFinding: number; // Non-finding count
  type: string; // Project type or category
  subtype: string; // Subcategory
  description: string; // Description
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Input for creating summary record
 */
export interface CreateSummaryInput {
  sh: string;
  project: string;
  total: number;
  finding: number;
  nonFinding: number;
  type: string;
  subtype: string;
  description: string;
}
