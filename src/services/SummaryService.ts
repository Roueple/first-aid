import DatabaseService from './DatabaseService';
import { FindingSummary, CreateSummaryInput } from '../types/summary.types';
import { Timestamp } from 'firebase/firestore';

/**
 * Service for managing summary table records
 */
export class SummaryService extends DatabaseService<FindingSummary> {
  constructor() {
    super('summaries'); // Collection name in Firestore
  }

  /**
   * Create a new summary record
   */
  async createSummary(input: CreateSummaryInput): Promise<string> {
    // Get the next sequential number
    const existingSummaries = await this.getAll({
      sorts: [{ field: 'no', direction: 'desc' }],
      limit: 1,
    });

    const nextNo = existingSummaries.length > 0 ? existingSummaries[0].no + 1 : 1;

    const summaryData: Partial<FindingSummary> = {
      no: nextNo,
      sh: input.sh,
      project: input.project,
      total: input.total,
      finding: input.finding,
      nonFinding: input.nonFinding,
      type: input.type,
      subtype: input.subtype,
      description: input.description,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    return await this.create(summaryData);
  }

  /**
   * Update summary record
   */
  async updateSummary(id: string, input: Partial<CreateSummaryInput>): Promise<void> {
    const updateData: Partial<FindingSummary> = {
      ...input,
      updatedAt: Timestamp.now(),
    };

    await this.update(id, updateData);
  }

  /**
   * Get all summaries ordered by number
   */
  async getAllSummaries(): Promise<FindingSummary[]> {
    return await this.getAll({
      sorts: [{ field: 'no', direction: 'asc' }],
    });
  }
}

export default SummaryService;
