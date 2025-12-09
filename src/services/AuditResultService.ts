import DatabaseService from './DatabaseService';
import { Timestamp } from 'firebase/firestore';

/**
 * Audit Result interface matching Master-finding.xlsx structure
 * 
 * NOTE: year is stored as STRING in Firestore (e.g., "2024", not 2024)
 * This is due to the original Excel import format.
 */
export interface AuditResult {
  id?: string;
  auditResultId: string;
  year: string; // Stored as string in Firestore (e.g., "2024")
  sh: string;
  projectName: string;
  projectId: string | null;
  department: string;
  riskArea: string;
  descriptions: string;
  code: string;
  bobot: number;
  kadar: number;
  nilai: number;
  createdAt?: Timestamp;
  createdBy?: string;
  updatedAt?: Timestamp;
}

/**
 * Service for managing audit results
 */
export class AuditResultService extends DatabaseService<AuditResult> {
  constructor() {
    super('audit-results');
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
   * @param year - Year as string (e.g., "2024") or number (will be converted to string)
   */
  async getAuditResultsByYear(year: string | number): Promise<AuditResult[]> {
    const yearStr = String(year);
    return await this.getAll({
      filters: [{ field: 'year', operator: '==', value: yearStr }],
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

    // Sort by year descending (string comparison works for YYYY format)
    return results.sort((a, b) => b.year.localeCompare(a.year));
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
   * Get audit results by SH
   */
  async getAuditResultsBySH(sh: string): Promise<AuditResult[]> {
    return await this.getAll({
      filters: [{ field: 'sh', operator: '==', value: sh }],
      sorts: [{ field: 'year', direction: 'desc' }],
    });
  }

  /**
   * Get audit results by code (finding type)
   */
  async getAuditResultsByCode(code: string): Promise<AuditResult[]> {
    return await this.getAll({
      filters: [{ field: 'code', operator: '==', value: code }],
      sorts: [{ field: 'nilai', direction: 'desc' }],
    });
  }
}

export default new AuditResultService();
