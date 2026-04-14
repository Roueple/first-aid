import DatabaseService from './DatabaseService';
import { Timestamp } from 'firebase/firestore';

/**
 * Audit Result interface matching actual Firestore schema
 * 
 * NOTE: year is stored as NUMBER in Firestore (e.g., 2024, not "2024")
 * Field names match the import script: subholding, weight, severity, value
 */
export interface AuditResult {
  id?: string;
  uniqueId: string; // SHA-256 hash for deduplication
  year: number; // Stored as number in Firestore (e.g., 2024)
  subholding: string; // SH1, SH2, SH3A, SH3B, SH4
  projectName: string;
  department: string;
  riskArea: string;
  description: string;
  code: string; // F, NF, O, R
  weight: number; // Bobot
  severity: number; // Kadar
  value: number; // Nilai
  isRepeat: number; // Temuan Ulangan (0 or 1)
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Service for managing audit results
 */
export class AuditResultService extends DatabaseService<AuditResult> {
  constructor() {
    super('audit_results');
  }

  /**
   * Get audit results by project
   */
  async getAuditResultsByProject(projectName: string): Promise<AuditResult[]> {
    return await this.getAll({
      filters: [{ field: 'projectName', operator: '==', value: projectName }],
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
      sorts: [{ field: 'projectName', direction: 'asc' }],
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
   * Get audit results by code (finding type)
   */
  async getAuditResultsByCode(code: string): Promise<AuditResult[]> {
    return await this.getAll({
      filters: [{ field: 'code', operator: '==', value: code }],
      sorts: [{ field: 'value', direction: 'desc' }],
    });
  }
}

export default new AuditResultService();
