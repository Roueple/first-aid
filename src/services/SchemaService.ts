/**
 * SchemaService
 * 
 * Provides database schema information and field mappings for intelligent query translation.
 * This service enables the AI to understand the database structure and map natural language
 * queries to actual database columns.
 * 
 * Purpose:
 * - Define all queryable fields with descriptions and aliases
 * - Help AI translate user intent into accurate database queries
 * - Support flexible natural language queries without requiring exact field names
 */

import { 
  FindingSeverity, 
  FindingStatus, 
  ProjectType, 
  ControlCategory 
} from '../types/finding.types';

// ============================================================================
// Field Schema Definitions
// ============================================================================

/**
 * Field type definitions for type safety
 */
export type FieldType = 
  | 'string' 
  | 'number' 
  | 'enum' 
  | 'array' 
  | 'date' 
  | 'boolean';

/**
 * Schema field definition
 */
export interface SchemaField {
  /** Database column name */
  fieldName: string;
  /** Human-readable field name */
  displayName: string;
  /** Field data type */
  type: FieldType;
  /** Description of what this field contains */
  description: string;
  /** Natural language aliases users might use */
  aliases: string[];
  /** Possible enum values (for enum types) */
  enumValues?: string[];
  /** Whether this field is commonly queried */
  isCommonFilter: boolean;
  /** Example values */
  examples?: string[];
}

/**
 * Complete database schema for Finding collection
 */
export const FINDING_SCHEMA: SchemaField[] = [
  // Core Identification
  {
    fieldName: 'id',
    displayName: 'Finding ID',
    type: 'string',
    description: 'Unique identifier for the finding (e.g., FND-2024-001)',
    aliases: ['id', 'finding id', 'finding number', 'reference number'],
    isCommonFilter: false,
    examples: ['FND-2024-001', 'FND-2025-042'],
  },
  {
    fieldName: 'auditYear',
    displayName: 'Audit Year',
    type: 'number',
    description: 'Year when the audit was conducted',
    aliases: ['year', 'audit year', 'in year', 'from year', 'during year'],
    isCommonFilter: true,
    examples: ['2024', '2025', 'last year', 'this year'],
  },
  
  // Organizational Structure
  {
    fieldName: 'subholding',
    displayName: 'Subholding',
    type: 'string',
    description: 'Business unit or subholding company',
    aliases: ['subholding', 'business unit', 'unit', 'sh'],
    isCommonFilter: true,
    examples: ['SH Alpha', 'SH Beta', 'Corporate'],
  },
  {
    fieldName: 'projectType',
    displayName: 'Project Type',
    type: 'enum',
    description: 'Type of project where finding was identified',
    aliases: ['project type', 'type', 'project category'],
    enumValues: [
      'Hotel', 'Landed House', 'Apartment', 'School', 'University',
      'Insurance', 'Hospital', 'Clinic', 'Mall', 'Office Building',
      'Mixed-Use Development'
    ],
    isCommonFilter: true,
    examples: ['Hotel', 'Hospital', 'Office Building'],
  },
  {
    fieldName: 'projectName',
    displayName: 'Project Name',
    type: 'string',
    description: 'Specific project name',
    aliases: ['project', 'project name', 'in project', 'at project'],
    isCommonFilter: true,
    examples: ['Grand Hotel Jakarta', 'Central Hospital', 'Project A'],
  },
  {
    fieldName: 'findingDepartment',
    displayName: 'Department',
    type: 'string',
    description: 'Department where the finding was identified',
    aliases: [
      'department', 'dept', 'in department', 'from department',
      'IT', 'HR', 'Finance', 'Sales', 'Procurement', 'Legal',
      'Marketing', 'Operations', 'Accounting', 'Admin'
    ],
    isCommonFilter: true,
    examples: ['IT', 'HR', 'Finance', 'Sales', 'Procurement'],
  },
  
  // Audit Team
  {
    fieldName: 'executor',
    displayName: 'Executor',
    type: 'string',
    description: 'Auditor who executed the audit',
    aliases: ['executor', 'auditor', 'executed by', 'audited by'],
    isCommonFilter: false,
    examples: ['John Doe', 'Jane Smith'],
  },
  {
    fieldName: 'reviewer',
    displayName: 'Reviewer',
    type: 'string',
    description: 'Auditor who reviewed the finding',
    aliases: ['reviewer', 'reviewed by'],
    isCommonFilter: false,
  },
  {
    fieldName: 'manager',
    displayName: 'Manager',
    type: 'string',
    description: 'Manager who approved the finding',
    aliases: ['manager', 'approved by', 'approver'],
    isCommonFilter: false,
  },
  
  // Finding Classification
  {
    fieldName: 'controlCategory',
    displayName: 'Control Category',
    type: 'enum',
    description: 'Type of control: Preventive, Detective, or Corrective',
    aliases: ['control category', 'control type', 'category'],
    enumValues: ['Preventive', 'Detective', 'Corrective'],
    isCommonFilter: true,
  },
  {
    fieldName: 'processArea',
    displayName: 'Process Area',
    type: 'string',
    description: 'Business process area (Sales, Procurement, Finance, HR, IT, Legal, Marketing, etc.)',
    aliases: ['process area', 'process', 'area', 'business process'],
    isCommonFilter: true,
    examples: ['Sales', 'Procurement', 'Finance', 'HR', 'IT', 'Legal', 'Marketing'],
  },
  
  // Finding Details
  {
    fieldName: 'findingTitle',
    displayName: 'Finding Title',
    type: 'string',
    description: 'Brief title of the finding',
    aliases: ['title', 'finding title', 'name', 'heading'],
    isCommonFilter: false,
  },
  {
    fieldName: 'findingDescription',
    displayName: 'Description',
    type: 'string',
    description: 'Detailed description of the finding',
    aliases: ['description', 'details', 'finding description'],
    isCommonFilter: false,
  },
  {
    fieldName: 'rootCause',
    displayName: 'Root Cause',
    type: 'string',
    description: 'Root cause analysis of the finding',
    aliases: ['root cause', 'cause', 'reason'],
    isCommonFilter: false,
  },
  {
    fieldName: 'impactDescription',
    displayName: 'Impact',
    type: 'string',
    description: 'Actual or potential impact of the finding',
    aliases: ['impact', 'impact description', 'consequence'],
    isCommonFilter: false,
  },
  {
    fieldName: 'recommendation',
    displayName: 'Recommendation',
    type: 'string',
    description: 'Audit recommendation to address the finding',
    aliases: ['recommendation', 'suggested action', 'advice'],
    isCommonFilter: false,
  },
  
  // Severity & Priority
  {
    fieldName: 'findingBobot',
    displayName: 'Finding Weight (Bobot)',
    type: 'number',
    description: 'Weight/Severity score (1-4)',
    aliases: ['bobot', 'weight', 'finding bobot'],
    isCommonFilter: false,
  },
  {
    fieldName: 'findingKadar',
    displayName: 'Finding Degree (Kadar)',
    type: 'number',
    description: 'Degree/Intensity score (1-5)',
    aliases: ['kadar', 'degree', 'intensity', 'finding kadar'],
    isCommonFilter: false,
  },
  {
    fieldName: 'findingTotal',
    displayName: 'Finding Total Score',
    type: 'number',
    description: 'Combined score (Bobot × Kadar, range 1-20)',
    aliases: ['total', 'score', 'finding total', 'total score'],
    isCommonFilter: false,
  },
  {
    fieldName: 'priorityLevel',
    displayName: 'Priority Level',
    type: 'enum',
    description: 'Priority level auto-calculated from total score',
    aliases: [
      'priority', 'severity', 'priority level', 'severity level',
      'critical', 'high', 'medium', 'low', 'urgent', 'important'
    ],
    enumValues: ['Critical', 'High', 'Medium', 'Low'],
    isCommonFilter: true,
  },
  
  // Tags & Classification
  {
    fieldName: 'primaryTag',
    displayName: 'Primary Tag',
    type: 'string',
    description: 'Main category tag',
    aliases: ['primary tag', 'main tag', 'category'],
    isCommonFilter: true,
  },
  {
    fieldName: 'secondaryTags',
    displayName: 'Secondary Tags',
    type: 'array',
    description: 'Additional relevant tags',
    aliases: ['secondary tags', 'tags', 'additional tags'],
    isCommonFilter: false,
  },
  
  // Status & Dates
  {
    fieldName: 'status',
    displayName: 'Status',
    type: 'enum',
    description: 'Current status of the finding',
    aliases: [
      'status', 'state', 'finding status',
      'open', 'closed', 'in progress', 'deferred',
      'pending', 'resolved', 'completed'
    ],
    enumValues: ['Open', 'In Progress', 'Closed', 'Deferred'],
    isCommonFilter: true,
  },
  {
    fieldName: 'dateIdentified',
    displayName: 'Date Identified',
    type: 'date',
    description: 'Date when finding was identified',
    aliases: ['date identified', 'identified date', 'found date', 'discovery date'],
    isCommonFilter: false,
  },
  {
    fieldName: 'dateDue',
    displayName: 'Due Date',
    type: 'date',
    description: 'Target completion date',
    aliases: ['due date', 'deadline', 'target date'],
    isCommonFilter: true,
  },
  {
    fieldName: 'dateCompleted',
    displayName: 'Completion Date',
    type: 'date',
    description: 'Date when finding was completed',
    aliases: ['completion date', 'completed date', 'closed date'],
    isCommonFilter: false,
  },
  
  // Management Response
  {
    fieldName: 'managementResponse',
    displayName: 'Management Response',
    type: 'string',
    description: 'Response from management',
    aliases: ['management response', 'response', 'management comment'],
    isCommonFilter: false,
  },
  {
    fieldName: 'actionPlan',
    displayName: 'Action Plan',
    type: 'string',
    description: 'Action plan to address the finding',
    aliases: ['action plan', 'plan', 'corrective action'],
    isCommonFilter: false,
  },
  
  // Additional Fields
  {
    fieldName: 'notes',
    displayName: 'Notes',
    type: 'string',
    description: 'Additional comments or notes',
    aliases: ['notes', 'comments', 'remarks'],
    isCommonFilter: false,
  },
];

// ============================================================================
// SchemaService Class
// ============================================================================

/**
 * Service for database schema information and intelligent field mapping
 */
export class SchemaService {
  private schema: SchemaField[];
  private fieldMap: Map<string, SchemaField>;
  private aliasMap: Map<string, SchemaField>;

  constructor() {
    this.schema = FINDING_SCHEMA;
    this.fieldMap = new Map();
    this.aliasMap = new Map();
    
    // Build lookup maps
    this.buildMaps();
  }

  /**
   * Build field and alias lookup maps for fast access
   */
  private buildMaps(): void {
    for (const field of this.schema) {
      // Map by field name
      this.fieldMap.set(field.fieldName.toLowerCase(), field);
      
      // Map by all aliases
      for (const alias of field.aliases) {
        this.aliasMap.set(alias.toLowerCase(), field);
      }
    }
  }

  /**
   * Get all schema fields
   */
  getAllFields(): SchemaField[] {
    return this.schema;
  }

  /**
   * Get commonly filtered fields (for AI context)
   */
  getCommonFilters(): SchemaField[] {
    return this.schema.filter(f => f.isCommonFilter);
  }

  /**
   * Find field by name or alias
   */
  findField(nameOrAlias: string): SchemaField | undefined {
    const normalized = nameOrAlias.toLowerCase().trim();
    
    // Try exact field name match first
    const byField = this.fieldMap.get(normalized);
    if (byField) return byField;
    
    // Try alias match
    const byAlias = this.aliasMap.get(normalized);
    if (byAlias) return byAlias;
    
    // Try partial match on aliases
    for (const [alias, field] of this.aliasMap.entries()) {
      if (alias.includes(normalized) || normalized.includes(alias)) {
        return field;
      }
    }
    
    return undefined;
  }

  /**
   * Get schema description for AI context
   * Returns a formatted string describing the database schema
   */
  getSchemaContext(): string {
    const commonFields = this.getCommonFilters();
    
    let context = '# Database Schema - Finding Collection\n\n';
    context += '## Commonly Queried Fields:\n\n';
    
    for (const field of commonFields) {
      context += `### ${field.displayName} (${field.fieldName})\n`;
      context += `- Type: ${field.type}\n`;
      context += `- Description: ${field.description}\n`;
      context += `- User might say: ${field.aliases.slice(0, 5).join(', ')}\n`;
      
      if (field.enumValues) {
        context += `- Valid values: ${field.enumValues.join(', ')}\n`;
      }
      
      if (field.examples) {
        context += `- Examples: ${field.examples.join(', ')}\n`;
      }
      
      context += '\n';
    }
    
    context += '\n## All Available Fields:\n';
    context += this.schema.map(f => `- ${f.fieldName}: ${f.description}`).join('\n');
    
    return context;
  }

  /**
   * Generate AI prompt for query translation
   */
  getQueryTranslationPrompt(userQuery: string): string {
    return `You are a query translator. Your job is to extract structured filters from natural language queries.

${this.getSchemaContext()}

## Important Notes:
- Users may use natural language without mentioning exact field names
- "IT findings" means findingDepartment = "IT"
- "HR department" means findingDepartment = "HR"  
- "2025" or "in 2025" means auditYear = 2025
- "critical" or "high priority" means priorityLevel = "Critical" or "High"
- "open" or "pending" means status = "Open"
- "hotel" or "hospital" means projectType = "Hotel" or "Hospital"

## User Query:
"${userQuery}"

## Task:
Extract all possible filters from the query and map them to the correct database fields.
Return a JSON object with field names as keys and filter values.

Example output format:
{
  "auditYear": 2025,
  "findingDepartment": "IT",
  "priorityLevel": ["Critical", "High"],
  "status": ["Open"]
}`;
  }

  /**
   * Validate if a value is valid for a field
   */
  validateFieldValue(fieldName: string, value: any): boolean {
    const field = this.fieldMap.get(fieldName.toLowerCase());
    if (!field) return false;

    // Type validation
    switch (field.type) {
      case 'number':
        return typeof value === 'number';
      case 'string':
        return typeof value === 'string';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'date':
        return value instanceof Date || typeof value === 'string';
      case 'enum':
        if (Array.isArray(value)) {
          return value.every(v => field.enumValues?.includes(v));
        }
        return field.enumValues?.includes(value) ?? false;
      default:
        return true;
    }
  }
}

// Export singleton instance
export const schemaService = new SchemaService();
