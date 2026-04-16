import { Timestamp } from 'firebase/firestore';

/**
 * Finding code types
 * F = Finding (actual audit finding)
 * NF = Non-Finding (no issue found)
 * O = Observation
 * R = Recommendation
 */
export type FindingCode = 'F' | 'NF' | 'O' | 'R';

/**
 * Audit Result record - 1:1 mirror of Master_Audit_Data.xlsx
 *
 * Excel columns (16 total):
 * 1. Unique ID       → auditResultId
 * 2. Filename        → filename
 * 3. Proyek          → proyek
 * 4. Category        → category
 * 5. Subholding      → subholding
 * 6. Year            → year
 * 7. Department      → department
 * 8. Department(ori) → departmentOri
 * 9. Risk Area       → riskArea
 * 10. Deskripsi      → deskripsi
 * 11. Kode           → kode
 * 12. Bobot          → bobot
 * 13. Kadar          → kadar
 * 14. Nilai          → nilai
 * 15. Kategori       → kategori
 * 16. Temuan Ulangan Count → temuanUlanganCount
 */
export interface AuditResult {
  // Firestore document ID (auto-generated)
  id?: string;

  // ============================================
  // Excel columns - 1:1 mirror
  // ============================================

  /** Column 1: Unique ID - e.g., "1-C21-22-FDD-1-01" */
  auditResultId: string;

  /** Column 2: Source filename */
  filename: string;

  /** Column 3: Project name (Proyek) */
  proyek: string;

  /** Column 4: Project category */
  category: string;

  /** Column 5: Subholding code (SH1, SH2, SH3A, SH3B, SH4) */
  subholding: string;

  /** Column 6: Audit year (2022-2025) */
  year: number;

  /** Column 7: Department name (normalized) */
  department: string;

  /** Column 8: Original department name from source */
  departmentOri: string;

  /** Column 9: Risk area description */
  riskArea: string;

  /** Column 10: Finding description (Deskripsi) */
  deskripsi: string;

  /** Column 11: Finding code (F, NF, O, R) */
  kode: string;

  /** Column 12: Weight/Bobot (0-10) */
  bobot: number;

  /** Column 13: Severity/Kadar (0-5) */
  kadar: number;

  /** Column 14: Value/Nilai (Bobot × Kadar) */
  nilai: number;

  /** Column 15: Category classification (nullable) */
  kategori: string | null;

  /** Column 16: Repeat finding count */
  temuanUlanganCount: number;

  // ============================================
  // Firestore metadata
  // ============================================
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Input for creating a new audit result
 */
export interface CreateAuditResultInput {
  auditResultId: string;
  filename: string;
  proyek: string;
  category: string;
  subholding: string;
  year: number;
  department: string;
  departmentOri: string;
  riskArea: string;
  deskripsi: string;
  kode: string;
  bobot: number;
  kadar: number;
  nilai: number;
  kategori?: string | null;
  temuanUlanganCount: number;
}

/**
 * Input for updating an audit result
 */
export interface UpdateAuditResultInput {
  auditResultId?: string;
  filename?: string;
  proyek?: string;
  category?: string;
  subholding?: string;
  year?: number;
  department?: string;
  departmentOri?: string;
  riskArea?: string;
  deskripsi?: string;
  kode?: string;
  bobot?: number;
  kadar?: number;
  nilai?: number;
  kategori?: string | null;
  temuanUlanganCount?: number;
}

/**
 * Audit result with aggregated statistics (for dashboard/reports)
 */
export interface AuditResultWithStats extends AuditResult {
  projectCategory?: string;
  projectIndustry?: string;
  projectLocation?: string;
}

/**
 * Column mapping for Excel import/export
 * Maps Excel column headers to interface field names
 */
export const EXCEL_COLUMN_MAPPING = {
  'Unique ID': 'auditResultId',
  Filename: 'filename',
  Proyek: 'proyek',
  Category: 'category',
  Subholding: 'subholding',
  Year: 'year',
  Department: 'department',
  'Department(ori)': 'departmentOri',
  'Risk Area': 'riskArea',
  Deskripsi: 'deskripsi',
  Kode: 'kode',
  Bobot: 'bobot',
  Kadar: 'kadar',
  Nilai: 'nilai',
  Kategori: 'kategori',
  'Temuan Ulangan Count': 'temuanUlanganCount',
} as const;

/**
 * Reverse mapping for Excel export
 */
export const FIELD_TO_EXCEL_COLUMN = {
  auditResultId: 'Unique ID',
  filename: 'Filename',
  proyek: 'Proyek',
  category: 'Category',
  subholding: 'Subholding',
  year: 'Year',
  department: 'Department',
  departmentOri: 'Department(ori)',
  riskArea: 'Risk Area',
  deskripsi: 'Deskripsi',
  kode: 'Kode',
  bobot: 'Bobot',
  kadar: 'Kadar',
  nilai: 'Nilai',
  kategori: 'Kategori',
  temuanUlanganCount: 'Temuan Ulangan Count',
} as const;
