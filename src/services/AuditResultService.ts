import DatabaseService from './DatabaseService';
import { Timestamp } from 'firebase/firestore';
import { AuditResult as AuditResultType } from '../types/auditResult.types';

/**
 * Re-export AuditResult type for backward compatibility
 * The interface now mirrors Master_Audit_Data.xlsx 1:1
 */
export type AuditResult = AuditResultType;

/**
 * Service for managing audit results
 * Collection: audit_results
 *
 * Fields mirror Master_Audit_Data.xlsx exactly:
 * - auditResultId: Unique ID (e.g., "1-C21-22-FDD-1-01")
 * - filename: Source filename
 * - proyek: Project name
 * - category: Project category
 * - subholding: SH code (SH1, SH2, SH3A, SH3B, SH4)
 * - year: Audit year (number)
 * - department: Department name
 * - departmentOri: Original department name
 * - riskArea: Risk area description
 * - deskripsi: Finding description
 * - kode: Finding code (F, NF, O, R)
 * - bobot: Weight (0-10)
 * - kadar: Severity (0-5)
 * - nilai: Value (bobot × kadar)
 * - kategori: Category classification
 * - temuanUlanganCount: Repeat finding count
 */
export class AuditResultService extends DatabaseService<AuditResult> {
  constructor() {
    super('audit_results');
  }

  /**
   * Get audit results by project name
   */
  async getAuditResultsByProject(proyek: string): Promise<AuditResult[]> {
    return await this.getAll({
      filters: [{ field: 'proyek', operator: '==', value: proyek }],
      sorts: [{ field: 'year', direction: 'desc' }],
    });
  }

  /**
   * Get audit results by year
   * @param year - Year as number (e.g., 2024) or string (will be converted to number)
   */
  async getAuditResultsByYear(year: string | number): Promise<AuditResult[]> {
    const yearNum = typeof year === 'number' ? year : parseInt(String(year), 10);
    return await this.getAll({
      filters: [{ field: 'year', operator: '==', value: yearNum }],
      sorts: [{ field: 'proyek', direction: 'asc' }],
    });
  }

  /**
   * Get audit results by department (exact match)
   */
  async getAuditResultsByDepartment(department: string): Promise<AuditResult[]> {
    return await this.getAll({
      filters: [{ field: 'department', operator: '==', value: department }],
      sorts: [{ field: 'year', direction: 'desc' }],
    });
  }

  /**
   * Search audit results by department keyword
   * Uses normalized department keywords for flexible searching
   */
  async searchByDepartmentKeyword(keyword: string): Promise<AuditResult[]> {
    // Import dynamically to avoid circular dependency
    const { default: departmentService } = await import('./DepartmentService');

    // Find matching departments
    const departments = await departmentService.findByKeyword(keyword);

    if (departments.length === 0) {
      return [];
    }

    // Get all original names from matching departments
    const originalNames = new Set<string>();
    departments.forEach((dept) => {
      dept.originalNames.forEach((name) => originalNames.add(name));
    });

    // Fetch audit results for all matching department names
    const results: AuditResult[] = [];
    for (const deptName of originalNames) {
      const deptResults = await this.getAuditResultsByDepartment(deptName);
      results.push(...deptResults);
    }

    // Sort by year descending (number comparison)
    return results.sort((a, b) => b.year - a.year);
  }

  /**
   * Get all unique departments from audit results
   */
  async getAllDepartments(): Promise<string[]> {
    const results = await this.getAll();
    const departments = new Set<string>();
    results.forEach((result) => {
      if (result.department) {
        departments.add(result.department);
      }
    });
    return Array.from(departments).sort();
  }

  /**
   * Get audit results by subholding (SH)
   */
  async getAuditResultsBySubholding(subholding: string): Promise<AuditResult[]> {
    return await this.getAll({
      filters: [{ field: 'subholding', operator: '==', value: subholding }],
      sorts: [{ field: 'year', direction: 'desc' }],
    });
  }

  /**
   * Get audit results by code (finding type: F, NF, O, R)
   */
  async getAuditResultsByCode(kode: string): Promise<AuditResult[]> {
    return await this.getAll({
      filters: [{ field: 'kode', operator: '==', value: kode }],
      sorts: [{ field: 'nilai', direction: 'desc' }],
    });
  }

  /**
   * Get findings only (kode = 'F')
   */
  async getFindings(): Promise<AuditResult[]> {
    return await this.getAuditResultsByCode('F');
  }

  /**
   * Get high-value findings (nilai >= threshold)
   */
  async getHighValueFindings(threshold: number = 10): Promise<AuditResult[]> {
    return await this.getAll({
      filters: [
        { field: 'kode', operator: '==', value: 'F' },
        { field: 'nilai', operator: '>=', value: threshold },
      ],
      sorts: [{ field: 'nilai', direction: 'desc' }],
    });
  }

  /**
   * Get repeat findings (temuanUlanganCount > 0)
   */
  async getRepeatFindings(): Promise<AuditResult[]> {
    return await this.getAll({
      filters: [
        { field: 'kode', operator: '==', value: 'F' },
        { field: 'temuanUlanganCount', operator: '>', value: 0 },
      ],
      sorts: [{ field: 'temuanUlanganCount', direction: 'desc' }],
    });
  }

  /**
   * Get audit results by category
   */
  async getAuditResultsByCategory(category: string): Promise<AuditResult[]> {
    return await this.getAll({
      filters: [{ field: 'category', operator: '==', value: category }],
      sorts: [{ field: 'year', direction: 'desc' }],
    });
  }

  /**
   * Search audit results by text in deskripsi or riskArea
   */
  async searchByText(searchText: string): Promise<AuditResult[]> {
    // Firestore doesn't support full-text search, so we fetch and filter client-side
    const results = await this.getAll();
    const searchLower = searchText.toLowerCase();

    return results.filter(
      (r) =>
        r.deskripsi?.toLowerCase().includes(searchLower) ||
        r.riskArea?.toLowerCase().includes(searchLower) ||
        r.proyek?.toLowerCase().includes(searchLower)
    );
  }
}

export default new AuditResultService();
