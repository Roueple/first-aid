import DatabaseService from './DatabaseService';
import { Project, CreateProjectInput, UpdateProjectInput, ProjectWithStats } from '../types/project.types';
import { Finding } from '../types/finding.types';
import { Timestamp } from 'firebase/firestore';

/**
 * Service for managing projects
 * Projects are connected to Findings via projectName and projectType
 * 
 * Note: Project statistics (finding, nonFinding, total) are calculated from
 * the audit-results collection based on the 'code' field:
 * - Finding: code starts with 'F' (but not 'NF')
 * - Non-Finding: code starts with 'NF'
 */
export class ProjectService extends DatabaseService<Project> {
  private findingsService: DatabaseService<Finding>;

  constructor() {
    super('projects');
    this.findingsService = new DatabaseService<Finding>('findings');
  }

  /**
   * Generate a 7-digit project ID from SH-ProjectName-Type
   */
  private generateProjectId(sh: string, projectName: string, projectType: string): string {
    const combined = `${sh}-${projectName}-${projectType}`;
    
    // Create a simple hash
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to positive 7-digit number
    const positiveHash = Math.abs(hash);
    const sevenDigit = (positiveHash % 9000000) + 1000000; // Ensures 7 digits (1000000-9999999)
    
    return sevenDigit.toString();
  }

  /**
   * Generate base initials from project name (3-4 characters)
   * Simple rule: Take first 3-4 letters from the name, removing spaces and special chars
   * Always uppercase
   */
  private generateBaseInitials(projectName: string): string {
    // Remove all non-alphanumeric characters and spaces
    const cleaned = projectName.replace(/[^a-zA-Z0-9]/g, '');
    
    // Take first 4 letters (or less if name is shorter)
    const initials = cleaned.substring(0, 4).toUpperCase();
    
    // Ensure at least 3 characters (pad with X if needed)
    return initials.padEnd(3, 'X');
  }

  /**
   * Generate unique initials from project name (3-4 characters)
   * Ensures uniqueness by checking existing projects and adding numeric suffix if needed
   */
  private async generateUniqueInitials(projectName: string, excludeId?: string): Promise<string> {
    const baseInitials = this.generateBaseInitials(projectName);
    
    // Check if base initials are unique
    const existingProjects = await this.getAll({
      filters: [{ field: 'initials', operator: '==', value: baseInitials }],
    });
    
    // Filter out the current project if updating
    const conflicts = excludeId 
      ? existingProjects.filter(p => p.id !== excludeId)
      : existingProjects;
    
    if (conflicts.length === 0) {
      return baseInitials;
    }
    
    // If collision, append number (1-99)
    for (let i = 1; i <= 99; i++) {
      const candidate = baseInitials + i;
      
      const candidateExists = await this.getAll({
        filters: [{ field: 'initials', operator: '==', value: candidate }],
      });
      
      const candidateConflicts = excludeId
        ? candidateExists.filter(p => p.id !== excludeId)
        : candidateExists;
      
      if (candidateConflicts.length === 0) {
        return candidate;
      }
    }
    
    // Fallback: use hash if all numbers exhausted
    const hash = Math.abs(projectName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
    return baseInitials + (hash % 1000);
  }

  /**
   * Create a new project
   */
  async createProject(input: CreateProjectInput, createdBy: string): Promise<string> {
    // Check if project name already exists
    const existing = await this.getAll({
      filters: [{ field: 'projectName', operator: '==', value: input.projectName }],
    });

    if (existing.length > 0) {
      throw new Error(`Project with name "${input.projectName}" already exists`);
    }

    // Generate 7-digit project ID
    const projectId = this.generateProjectId(input.sh, input.projectName, input.projectType);
    
    // Generate unique initials (3-4 characters)
    const initials = await this.generateUniqueInitials(input.projectName);

    const projectData: Partial<Project> = {
      projectId,
      sh: input.sh,
      projectName: input.projectName,
      projectType: input.projectType,
      initials,
      type: input.type || input.projectType,
      subtype: input.subtype || '',
      description: input.description,
      location: input.location,
      budget: input.budget,
      startDate: input.startDate ? (input.startDate instanceof Date ? Timestamp.fromDate(input.startDate) : input.startDate) : undefined,
      endDate: input.endDate ? (input.endDate instanceof Date ? Timestamp.fromDate(input.endDate) : input.endDate) : undefined,
      total: 0,
      finding: 0,
      nonFinding: 0,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy,
    };

    return await this.create(projectData);
  }

  /**
   * Update project
   */
  async updateProject(id: string, input: UpdateProjectInput): Promise<void> {
    const { startDate, endDate, ...rest } = input;
    
    const updateData: Partial<Project> = {
      ...rest,
      updatedAt: Timestamp.now(),
    };

    // Convert Date to Timestamp if needed
    if (startDate) {
      updateData.startDate = startDate instanceof Date ? Timestamp.fromDate(startDate) : startDate;
    }
    if (endDate) {
      updateData.endDate = endDate instanceof Date ? Timestamp.fromDate(endDate) : endDate;
    }

    await this.update(id, updateData);
  }

  /**
   * Get project by name (used for lookups from Findings)
   */
  async getProjectByName(projectName: string): Promise<Project | null> {
    const projects = await this.getAll({
      filters: [{ field: 'projectName', operator: '==', value: projectName }],
      limit: 1,
    });

    return projects.length > 0 ? projects[0] : null;
  }

  /**
   * Get all projects ordered by number
   */
  async getAllProjects(): Promise<Project[]> {
    return await this.getAll({
      sorts: [{ field: 'no', direction: 'asc' }],
    });
  }

  /**
   * Get active projects only
   */
  async getActiveProjects(): Promise<Project[]> {
    return await this.getAll({
      filters: [{ field: 'isActive', operator: '==', value: true }],
      sorts: [{ field: 'no', direction: 'asc' }],
    });
  }

  /**
   * Get projects by subholding
   */
  async getProjectsBySubholding(sh: string): Promise<Project[]> {
    return await this.getAll({
      filters: [{ field: 'sh', operator: '==', value: sh }],
      sorts: [{ field: 'no', direction: 'asc' }],
    });
  }

  /**
   * Recalculate finding counts for a project from audit-results
   * Counts based on code field:
   * - Finding: code starts with 'F' (but not 'NF')
   * - Non-Finding: code starts with 'NF'
   */
  async recalculateProjectStats(projectId: string): Promise<void> {
    const project = await this.getById(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Get all audit results for this project
    const auditResultsService = new DatabaseService('audit-results');
    const auditResults = await auditResultsService.getAll({
      filters: [
        { field: 'projectName', operator: '==', value: project.projectName },
      ],
    });

    // Count findings and non-findings based on code
    let finding = 0;
    let nonFinding = 0;
    
    auditResults.forEach((result: any) => {
      const code = (result.code || '').toUpperCase();
      
      // Check if code starts with 'NF' first (more specific)
      if (code.startsWith('NF')) {
        nonFinding++;
      } else if (code.startsWith('F')) {
        finding++;
      }
    });

    const total = finding + nonFinding;

    await this.update(projectId, {
      total,
      finding,
      nonFinding,
    });
  }

  /**
   * Get project with aggregated statistics
   */
  async getProjectWithStats(projectId: string): Promise<ProjectWithStats | null> {
    const project = await this.getById(projectId);
    if (!project) return null;

    // Get all findings for this project
    const findings = await this.findingsService.getAll({
      filters: [
        { field: 'projectName', operator: '==', value: project.projectName },
      ],
    });

    const stats = {
      criticalCount: findings.filter(f => f.priorityLevel === 'Critical').length,
      highCount: findings.filter(f => f.priorityLevel === 'High').length,
      mediumCount: findings.filter(f => f.priorityLevel === 'Medium').length,
      lowCount: findings.filter(f => f.priorityLevel === 'Low').length,
      openCount: findings.filter(f => f.status === 'Open').length,
      closedCount: findings.filter(f => f.status === 'Closed').length,
    };

    return {
      ...project,
      ...stats,
    };
  }

  /**
   * Recalculate all project statistics
   */
  async recalculateAllProjectStats(): Promise<void> {
    const projects = await this.getAllProjects();
    
    console.log(`🔄 Recalculating stats for ${projects.length} projects...`);
    
    for (const project of projects) {
      await this.recalculateProjectStats(project.id);
      console.log(`✅ Updated stats for: ${project.projectName}`);
    }
    
    console.log('✨ All project stats updated!');
  }

  /**
   * Validate if a project exists before creating a finding
   */
  async validateProjectExists(projectName: string, projectType: string): Promise<boolean> {
    const projects = await this.getAll({
      filters: [
        { field: 'projectName', operator: '==', value: projectName },
        { field: 'projectType', operator: '==', value: projectType },
      ],
    });

    return projects.length > 0;
  }
}

export default ProjectService;
