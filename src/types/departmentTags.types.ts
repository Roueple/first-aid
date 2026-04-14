import { Timestamp } from 'firebase/firestore';

/**
 * Department Tags - Static mapping for department keyword matching
 * Used by Bernard to expand department keywords (e.g., "IT") into all matching original names
 */
export interface DepartmentTag {
  id?: string;
  departmentName: string; // Primary department name
  tags: string[]; // All searchable keywords/tags (11 tags)
  category: string; // Department category (IT, Finance, HR, etc.)
  findingsCount?: number; // Total findings count (optional, can be calculated)
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Create a new department tag entry
 */
export function createDepartmentTag(
  departmentName: string,
  tags: string[],
  category: string,
  findingsCount: number = 0
): DepartmentTag {
  return {
    departmentName,
    tags,
    category,
    findingsCount,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}
