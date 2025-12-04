import DatabaseService from './DatabaseService';
import { Timestamp } from 'firebase/firestore';

/**
 * Audit Result interface matching Master-finding.xlsx structure
 */
export interface AuditResult {
  id?: string;
  auditResultId: string;
  year: number;
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
   */
  async getAuditResultsByYear(year: number): Promise<AuditResult[]> {
    return await this.getAll({
      filters: [{ field: 'year', operator: '==', value: year }],
      sorts: [{ field: 'projectName', direction: 'asc' }],
    });
  }

  /**
   * Get audit results by department
   */
  async getAuditResultsByDepartment(department: string): Promise<AuditResult[]> {
    return await this.getAll({
      filters: [{ field: 'department', operator: '==', value: department }],
      sorts: [{ field: 'year', direction: 'desc' }],
    });
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
