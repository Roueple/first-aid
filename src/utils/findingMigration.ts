/**
 * Migration utilities for updating findings to new schema
 * Based on findings-table-structure.md
 */

import { Timestamp } from 'firebase/firestore';
import { Finding } from '../types/finding.types';
import { calculateFindingTotal, calculatePriorityLevel, generateFindingId } from '../types/finding.constants';

/**
 * Old finding structure (for reference)
 */
interface OldFinding {
  id: string;
  title: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Closed' | 'Deferred';
  category: string;
  location: string;
  department?: string;
  responsiblePerson: string;
  reviewerPerson?: string;
  dateIdentified: Timestamp;
  dateDue?: Timestamp;
  dateCompleted?: Timestamp;
  dateCreated: Timestamp;
  dateUpdated: Timestamp;
  recommendation: string;
  managementResponse?: string;
  actionPlan?: string;
  evidence?: string[];
  tags: string[];
  riskLevel: number;
  originalSource: string;
  importBatch: string;
}

/**
 * Map old severity to bobot/kadar values
 */
function mapSeverityToScores(severity: string): { bobot: number; kadar: number } {
  switch (severity) {
    case 'Critical':
      return { bobot: 4, kadar: 5 }; // Total: 20
    case 'High':
      return { bobot: 4, kadar: 3 }; // Total: 12
    case 'Medium':
      return { bobot: 3, kadar: 2 }; // Total: 6
    case 'Low':
    default:
      return { bobot: 2, kadar: 2 }; // Total: 4
  }
}

/**
 * Map old category to process area
 */
function mapCategoryToProcessArea(category: string): string {
  const mapping: Record<string, string> = {
    'Financial': 'Finance',
    'Operations': 'Procurement',
    'IT': 'IT',
    'HR': 'HR',
    'Legal': 'Legal',
    'Marketing': 'Marketing',
  };
  return mapping[category] || 'Finance';
}

/**
 * Migrate old finding to new structure
 */
export function migrateOldFinding(oldFinding: OldFinding, auditYear: number, sequence: number): Partial<Finding> {
  const scores = mapSeverityToScores(oldFinding.severity);
  const findingTotal = calculateFindingTotal(scores.bobot, scores.kadar);
  const priorityLevel = calculatePriorityLevel(findingTotal);

  return {
    id: generateFindingId(auditYear, sequence),
    auditYear,
    
    // Map old fields to new organizational structure
    subholding: oldFinding.location || 'Unknown',
    projectType: 'Office Building', // Default, should be updated manually
    projectName: oldFinding.location || 'Unknown Project',
    findingDepartment: oldFinding.department || 'Unknown',
    
    // Map audit team
    executor: oldFinding.responsiblePerson,
    reviewer: oldFinding.reviewerPerson || 'Unknown',
    manager: 'Unknown', // Not in old structure
    
    // Map classification
    controlCategory: 'Detective', // Default, should be updated manually
    processArea: mapCategoryToProcessArea(oldFinding.category),
    
    // Map finding details
    findingTitle: oldFinding.title,
    findingDescription: oldFinding.description,
    rootCause: 'To be determined', // Not in old structure
    impactDescription: 'To be determined', // Not in old structure
    recommendation: oldFinding.recommendation,
    
    // Map severity
    findingBobot: scores.bobot,
    findingKadar: scores.kadar,
    findingTotal,
    priorityLevel,
    
    // Map tags
    primaryTag: oldFinding.tags[0] || 'Other',
    secondaryTags: oldFinding.tags.slice(1),
    
    // Map metadata
    creationTimestamp: oldFinding.dateCreated,
    lastModifiedDate: oldFinding.dateUpdated,
    modifiedBy: 'migration',
    notes: `Migrated from old structure. Original ID: ${oldFinding.id}`,
    
    // Map status
    status: oldFinding.status,
    dateIdentified: oldFinding.dateIdentified,
    dateDue: oldFinding.dateDue,
    dateCompleted: oldFinding.dateCompleted,
    
    // Map management response
    managementResponse: oldFinding.managementResponse,
    actionPlan: oldFinding.actionPlan,
    
    // Map evidence
    evidence: oldFinding.evidence,
    
    // Map import tracking
    originalSource: oldFinding.originalSource,
    importBatch: oldFinding.importBatch,
  };
}

/**
 * Validate migrated finding has all required fields
 */
export function validateMigratedFinding(finding: Partial<Finding>): string[] {
  const errors: string[] = [];
  
  if (!finding.auditYear) errors.push('Missing auditYear');
  if (!finding.subholding) errors.push('Missing subholding');
  if (!finding.projectType) errors.push('Missing projectType');
  if (!finding.projectName) errors.push('Missing projectName');
  if (!finding.findingDepartment) errors.push('Missing findingDepartment');
  if (!finding.executor) errors.push('Missing executor');
  if (!finding.reviewer) errors.push('Missing reviewer');
  if (!finding.manager) errors.push('Missing manager');
  if (!finding.controlCategory) errors.push('Missing controlCategory');
  if (!finding.processArea) errors.push('Missing processArea');
  if (!finding.findingTitle) errors.push('Missing findingTitle');
  if (!finding.findingDescription) errors.push('Missing findingDescription');
  if (!finding.rootCause) errors.push('Missing rootCause');
  if (!finding.impactDescription) errors.push('Missing impactDescription');
  if (!finding.recommendation) errors.push('Missing recommendation');
  if (!finding.findingBobot) errors.push('Missing findingBobot');
  if (!finding.findingKadar) errors.push('Missing findingKadar');
  if (!finding.primaryTag) errors.push('Missing primaryTag');
  
  return errors;
}
