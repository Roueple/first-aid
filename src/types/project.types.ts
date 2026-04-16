import { Timestamp } from 'firebase/firestore';

/**
 * Grade values for audit results
 * "A" (Excellent), "B" (Good), "C" (Satisfactory), "D" (Needs Improvement), "E" (Poor)
 * Empty string "" means not audited that year
 */
export type AuditGrade = 'A' | 'B' | 'C' | 'D' | 'E' | '';

/**
 * Project record - Master table for projects
 * Contains core project info plus yearly statistics and grades
 */
export interface Project {
  id: string; // Firestore document ID
  projectName: string; // Project name (e.g., "Aceh Water", "Ciputra World Jakarta 2")
  sh: string; // Subholding (e.g., "SH2", "SH3A")
  tbk: string; // TBK status ("tbk" or "non")
  industry: string; // Industry code (e.g., "Oth", "Com", "Res", "Hea", "Edu")
  category: string; // Category (e.g., "Others", "Commercial", "Residential", "Healthcare", "Education")
  location: string; // Location (e.g., "Jakarta", "Aceh, Nanggroe Aceh Darussalam")
  tags: string[]; // Tags array (e.g., ["AW", "Aceh Water Supply"])
  auditedYears: string; // Comma-separated years when project was audited

  // Yearly Grades (2025-2010)
  grade2025: AuditGrade;
  grade2024: AuditGrade;
  grade2023: AuditGrade;
  grade2022: AuditGrade;
  grade2021: AuditGrade;
  grade2020: AuditGrade;
  grade2019: AuditGrade;
  grade2018: AuditGrade;
  grade2017: AuditGrade;
  grade2016: AuditGrade;
  grade2015: AuditGrade;
  grade2014: AuditGrade;
  grade2013: AuditGrade;
  grade2012: AuditGrade;
  grade2011: AuditGrade;
  grade2010: AuditGrade;

  // Yearly Statistics - Total audit results
  total2025: number;
  total2024: number;
  total2023: number;
  total2022: number;

  // Yearly Statistics - Findings (F code) count
  f2025: number;
  f2024: number;
  f2023: number;
  f2022: number;

  // Yearly Statistics - Non-Findings (NF code) count
  nf2025: number;
  nf2024: number;
  nf2023: number;
  nf2022: number;

  // Aggregate Statistics
  grandTotal: number; // Total audit results across all years
  totalFindings: number; // Total findings (F) across all years
  totalNF: number; // Total non-findings (NF) across all years

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
  auditedYears?: string;

  // Yearly Grades (optional)
  grade2025?: AuditGrade;
  grade2024?: AuditGrade;
  grade2023?: AuditGrade;
  grade2022?: AuditGrade;
  grade2021?: AuditGrade;
  grade2020?: AuditGrade;
  grade2019?: AuditGrade;
  grade2018?: AuditGrade;
  grade2017?: AuditGrade;
  grade2016?: AuditGrade;
  grade2015?: AuditGrade;
  grade2014?: AuditGrade;
  grade2013?: AuditGrade;
  grade2012?: AuditGrade;
  grade2011?: AuditGrade;
  grade2010?: AuditGrade;

  // Yearly Statistics (optional)
  total2025?: number;
  total2024?: number;
  total2023?: number;
  total2022?: number;
  f2025?: number;
  f2024?: number;
  f2023?: number;
  f2022?: number;
  nf2025?: number;
  nf2024?: number;
  nf2023?: number;
  nf2022?: number;

  // Aggregate Statistics (optional)
  grandTotal?: number;
  totalFindings?: number;
  totalNF?: number;
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
  auditedYears?: string;
  isActive?: boolean;

  // Yearly Grades
  grade2025?: AuditGrade;
  grade2024?: AuditGrade;
  grade2023?: AuditGrade;
  grade2022?: AuditGrade;
  grade2021?: AuditGrade;
  grade2020?: AuditGrade;
  grade2019?: AuditGrade;
  grade2018?: AuditGrade;
  grade2017?: AuditGrade;
  grade2016?: AuditGrade;
  grade2015?: AuditGrade;
  grade2014?: AuditGrade;
  grade2013?: AuditGrade;
  grade2012?: AuditGrade;
  grade2011?: AuditGrade;
  grade2010?: AuditGrade;

  // Yearly Statistics
  total2025?: number;
  total2024?: number;
  total2023?: number;
  total2022?: number;
  f2025?: number;
  f2024?: number;
  f2023?: number;
  f2022?: number;
  nf2025?: number;
  nf2024?: number;
  nf2023?: number;
  nf2022?: number;

  // Aggregate Statistics
  grandTotal?: number;
  totalFindings?: number;
  totalNF?: number;
}
