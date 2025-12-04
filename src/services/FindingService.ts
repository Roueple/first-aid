import DatabaseService from './DatabaseService';
import ProjectService from './ProjectService';
import { Finding, CreateFindingInput, UpdateFindingInput } from '../types/finding.types';
import { Timestamp } from 'firebase/firestore';

/**
 * Service for managing findings with project validation
 */
export class FindingService extends DatabaseService<Finding> {
  private projectService: ProjectService;

  constructor() {
    super('findings');
    this.projectService = new ProjectService();
  }

  /**
   * Create a new finding with project validation
   */
  async createFinding(input: CreateFindingInput, userId: string): Promise<string> {
    // Validate that the project exists
    const projectExists = await this.projectService.validateProjectExists(
      input.projectName,
      input.projectType
    );

    if (!projectExists) {
      throw new Error(
        `Project "${input.projectName}" (${input.projectType}) does not exist. Please create the project first.`
      );
    }

    // Calculate findingTotal and priorityLevel
    const findingTotal = input.findingBobot * input.findingKadar;
    const priorityLevel = this.calculatePriorityLevel(findingTotal);

    // Generate finding ID
    const findingId = await this.generateFindingId(input.auditYear);

    const findingData: Partial<Finding> = {
      id: findingId,
      ...input,
      findingTotal,
      priorityLevel,
      secondaryTags: input.secondaryTags || [],
      creationTimestamp: Timestamp.now(),
      lastModifiedDate: Timestamp.now(),
      modifiedBy: userId,
      importBatch: `manual-${Date.now()}`,
    };

    // Convert dates to Timestamps
    if (input.dateIdentified instanceof Date) {
      findingData.dateIdentified = Timestamp.fromDate(input.dateIdentified);
    }
    if (input.dateDue instanceof Date) {
      findingData.dateDue = Timestamp.fromDate(input.dateDue);
    }

    const docId = await this.create(findingData);

    // Update project statistics
    const project = await this.projectService.getProjectByName(input.projectName);
    if (project) {
      await this.projectService.recalculateProjectStats(project.id);
    }

    return docId;
  }

  /**
   * Update a finding
   */
  async updateFinding(id: string, input: UpdateFindingInput, userId: string): Promise<void> {
    const updateData: Partial<Finding> = {
      ...input,
      lastModifiedDate: Timestamp.now(),
      modifiedBy: userId,
    };

    // Recalculate if bobot or kadar changed
    if (input.findingBobot !== undefined || input.findingKadar !== undefined) {
      const existing = await this.getById(id);
      if (existing) {
        const bobot = input.findingBobot ?? existing.findingBobot;
        const kadar = input.findingKadar ?? existing.findingKadar;
        updateData.findingTotal = bobot * kadar;
        updateData.priorityLevel = this.calculatePriorityLevel(updateData.findingTotal);
      }
    }

    // Convert dates
    if (input.dateIdentified instanceof Date) {
      updateData.dateIdentified = Timestamp.fromDate(input.dateIdentified);
    }
    if (input.dateDue instanceof Date) {
      updateData.dateDue = Timestamp.fromDate(input.dateDue);
    }
    if (input.dateCompleted instanceof Date) {
      updateData.dateCompleted = Timestamp.fromDate(input.dateCompleted);
    }

    await this.update(id, updateData);

    // Update project statistics if project changed
    const finding = await this.getById(id);
    if (finding) {
      const project = await this.projectService.getProjectByName(finding.projectName);
      if (project) {
        await this.projectService.recalculateProjectStats(project.id);
      }
    }
  }

  /**
   * Delete a finding and update project stats
   */
  async deleteFinding(id: string): Promise<void> {
    const finding = await this.getById(id);
    
    await this.delete(id);

    // Update project statistics
    if (finding) {
      const project = await this.projectService.getProjectByName(finding.projectName);
      if (project) {
        await this.projectService.recalculateProjectStats(project.id);
      }
    }
  }

  /**
   * Get findings by project
   */
  async getFindingsByProject(projectName: string): Promise<Finding[]> {
    return await this.getAll({
      filters: [{ field: 'projectName', operator: '==', value: projectName }],
      sorts: [{ field: 'dateIdentified', direction: 'desc' }],
    });
  }

  /**
   * Calculate priority level from total score
   */
  private calculatePriorityLevel(total: number): 'Critical' | 'High' | 'Medium' | 'Low' {
    if (total >= 16) return 'Critical';
    if (total >= 11) return 'High';
    if (total >= 6) return 'Medium';
    return 'Low';
  }

  /**
   * Generate finding ID (e.g., FND-2024-001)
   */
  private async generateFindingId(year: number): Promise<string> {
    const findings = await this.getAll({
      filters: [{ field: 'auditYear', operator: '==', value: year }],
    });

    const nextNumber = findings.length + 1;
    return `FND-${year}-${String(nextNumber).padStart(3, '0')}`;
  }
}

export default FindingService;
