import { QueryPattern } from './SimpleQueryMatcher';


/**
 * Query Pattern Definitions for Simple Query Matching
 * 
 * This file contains all predefined patterns for matching user queries
 * and translating them directly to Firebase queries.
 * 
 * Pattern Priority Guidelines:
 * - Composite patterns (multiple filters): 20-30
 * - Specific patterns (single filter): 10-19
 * - Generic patterns: 1-9
 */

/**
 * Temporal Query Patterns (Year-based)
 * Requirements: 2.1, 2.2, 2.3
 */
export const temporalPatterns: QueryPattern[] = [
  {
    id: 'temporal-year-from',
    name: 'Temporal Query - Findings from Year',
    priority: 10,
    regex: /(?:findings?|audit results?)\s+from\s+(\d{4})/i,
    parameterExtractors: [
      { name: 'year', type: 'string', captureGroup: 1 } // Store as string to match Firestore
    ],
    filterBuilder: (params) => [
      { field: 'year', operator: '==', value: params.year }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  },
  {
    id: 'temporal-year-in',
    name: 'Temporal Query - Findings in Year',
    priority: 10,
    regex: /(?:findings?|audit results?)\s+in\s+(\d{4})/i,
    parameterExtractors: [
      { name: 'year', type: 'string', captureGroup: 1 } // Store as string to match Firestore
    ],
    filterBuilder: (params) => [
      { field: 'year', operator: '==', value: params.year }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  },
  {
    id: 'temporal-year-prefix',
    name: 'Temporal Query - Year Findings',
    priority: 10,
    regex: /(\d{4})\s+(?:findings?|audit results?)/i,
    parameterExtractors: [
      { name: 'year', type: 'string', captureGroup: 1 } // Store as string to match Firestore
    ],
    filterBuilder: (params) => [
      { field: 'year', operator: '==', value: params.year }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  },
  {
    id: 'temporal-show-year',
    name: 'Temporal Query - Show Year Findings',
    priority: 10,
    regex: /show\s+(?:me\s+)?(\d{4})\s+(?:findings?|audit results?)/i,
    parameterExtractors: [
      { name: 'year', type: 'string', captureGroup: 1 } // Store as string to match Firestore
    ],
    filterBuilder: (params) => [
      { field: 'year', operator: '==', value: params.year }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  }
];

/**
 * Department Query Patterns
 * Requirements: 3.1, 3.2, 3.3
 */
const departmentList = 'IT|HR|Finance|Sales|Procurement|Legal|Marketing|Operations|Audit|Compliance';

export const departmentPatterns: QueryPattern[] = [
  {
    id: 'department-findings',
    name: 'Department Query - Department Findings',
    priority: 10,
    regex: new RegExp(`(${departmentList})\\s+(?:department\\s+)?findings?`, 'i'),
    parameterExtractors: [
      { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' }
    ],
    filterBuilder: (params) => [
      { field: 'department', operator: '==', value: params.department }
    ],
    sortBuilder: () => [
      { field: 'year', direction: 'desc' }
    ]
  },
  {
    id: 'department-show',
    name: 'Department Query - Show Department',
    priority: 10,
    regex: new RegExp(`show\\s+(?:me\\s+)?(${departmentList})(?:\\s+department)?$`, 'i'),
    parameterExtractors: [
      { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' }
    ],
    filterBuilder: (params) => [
      { field: 'department', operator: '==', value: params.department }
    ],
    sortBuilder: () => [
      { field: 'year', direction: 'desc' }
    ]
  },
  {
    id: 'department-from',
    name: 'Department Query - Findings from Department',
    priority: 10,
    regex: new RegExp(`(?:findings?|audit results?)\\s+from\\s+(${departmentList})`, 'i'),
    parameterExtractors: [
      { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' }
    ],
    filterBuilder: (params) => [
      { field: 'department', operator: '==', value: params.department }
    ],
    sortBuilder: () => [
      { field: 'year', direction: 'desc' }
    ]
  }
];

/**
 * Risk Level Query Patterns
 * Requirements: 4.1, 4.2, 4.3
 */
export const riskPatterns: QueryPattern[] = [
  {
    id: 'risk-critical',
    name: 'Risk Query - Critical Findings',
    priority: 15,
    regex: /critical\s+(?:risk\s+)?findings?|findings?\s+(?:with|above)\s+critical\s+risk/i,
    parameterExtractors: [],
    filterBuilder: () => [
      { field: 'nilai', operator: '>=', value: 15 }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  },
  {
    id: 'risk-high',
    name: 'Risk Query - High Risk Findings',
    priority: 15,
    regex: /high\s+(?:risk\s+)?findings?|findings?\s+(?:with|above)\s+high\s+risk/i,
    parameterExtractors: [],
    filterBuilder: () => [
      { field: 'nilai', operator: '>=', value: 10 }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  },
  {
    id: 'risk-medium',
    name: 'Risk Query - Medium Risk Findings',
    priority: 15,
    regex: /medium\s+(?:risk\s+)?findings?|findings?\s+(?:with|at)\s+medium\s+risk/i,
    parameterExtractors: [],
    filterBuilder: () => [
      { field: 'nilai', operator: '>=', value: 5 },
      { field: 'nilai', operator: '<', value: 10 }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  },
  {
    id: 'risk-top-n',
    name: 'Risk Query - Top N Findings',
    priority: 15,
    regex: /top\s+(\d+)\s+findings?/i,
    parameterExtractors: [
      { name: 'limit', type: 'number', captureGroup: 1 }
    ],
    filterBuilder: () => [],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  }
];

/**
 * Project Query Patterns
 * Requirements: 5.1, 5.2, 5.3
 */
export const projectPatterns: QueryPattern[] = [
  {
    id: 'project-findings-for',
    name: 'Project Query - Findings for Project',
    priority: 10,
    regex: /(?:findings?|audit results?)\s+for\s+(.+?)(?:\s+project)?$/i,
    parameterExtractors: [
      { name: 'projectName', type: 'string', captureGroup: 1, normalizer: 'trim' }
    ],
    filterBuilder: (params) => [
      { field: 'projectName', operator: '==', value: params.projectName }
    ],
    sortBuilder: () => [
      { field: 'year', direction: 'desc' }
    ]
  },
  {
    id: 'project-prefix',
    name: 'Project Query - Project Findings',
    priority: 10,
    regex: /^(.+?)\s+(?:project\s+)?findings?$/i,
    parameterExtractors: [
      { name: 'projectName', type: 'string', captureGroup: 1, normalizer: 'trim' }
    ],
    filterBuilder: (params) => [
      { field: 'projectName', operator: '==', value: params.projectName }
    ],
    sortBuilder: () => [
      { field: 'year', direction: 'desc' }
    ]
  },
  {
    id: 'project-show',
    name: 'Project Query - Show Project Audit Results',
    priority: 15,
    regex: /show\s+(?:me\s+)?(.+?)\s+(?:audit results?|findings?)$/i,
    parameterExtractors: [
      { name: 'projectName', type: 'string', captureGroup: 1, normalizer: 'trim' }
    ],
    filterBuilder: (params) => [
      { field: 'projectName', operator: '==', value: params.projectName }
    ],
    sortBuilder: () => [
      { field: 'year', direction: 'desc' }
    ]
  }
];

/**
 * Subholding Query Patterns
 * Requirements: 8.1, 8.2, 8.3
 */
export const subholdingPatterns: QueryPattern[] = [
  {
    id: 'subholding-sh-code',
    name: 'Subholding Query - SH Code',
    priority: 10,
    regex: /(?:findings?|audit results?)\s+for\s+SH\s+([A-Z0-9]+)/i,
    parameterExtractors: [
      { name: 'sh', type: 'string', captureGroup: 1, normalizer: 'uppercase' }
    ],
    filterBuilder: (params) => [
      { field: 'sh', operator: '==', value: params.sh }
    ],
    sortBuilder: () => [
      { field: 'year', direction: 'desc' }
    ]
  },
  {
    id: 'subholding-code-prefix',
    name: 'Subholding Query - Code Subholding Findings',
    priority: 10,
    regex: /([A-Z0-9]+)\s+subholding\s+findings?/i,
    parameterExtractors: [
      { name: 'sh', type: 'string', captureGroup: 1, normalizer: 'uppercase' }
    ],
    filterBuilder: (params) => [
      { field: 'sh', operator: '==', value: params.sh }
    ],
    sortBuilder: () => [
      { field: 'year', direction: 'desc' }
    ]
  },
  {
    id: 'subholding-show',
    name: 'Subholding Query - Show Code Audit Results',
    priority: 10,
    regex: /show\s+(?:me\s+)?([A-Z0-9]+)\s+(?:audit results?|findings?)/i,
    parameterExtractors: [
      { name: 'sh', type: 'string', captureGroup: 1, normalizer: 'uppercase' }
    ],
    filterBuilder: (params) => [
      { field: 'sh', operator: '==', value: params.sh }
    ],
    sortBuilder: () => [
      { field: 'year', direction: 'desc' }
    ]
  }
];

/**
 * Composite Query Patterns (Multiple Filters)
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
export const compositePatterns: QueryPattern[] = [
  // Show all [department] findings [year]
  {
    id: 'composite-show-all-dept-findings-year',
    name: 'Composite Query - Show All Department Findings Year',
    priority: 25,
    regex: new RegExp(`show\\s+all\\s+(${departmentList})\\s+findings?\\s+(\\d{4})`, 'i'),
    parameterExtractors: [
      { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' },
      { name: 'year', type: 'string', captureGroup: 2 } // Store as string to match Firestore
    ],
    filterBuilder: (params) => [
      { field: 'department', operator: '==', value: params.department },
      { field: 'year', operator: '==', value: params.year }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  },
  {
    id: 'composite-dept-year-from',
    name: 'Composite Query - Department Findings from Year',
    priority: 20,
    regex: new RegExp(`(${departmentList})\\s+findings?\\s+from\\s+(\\d{4})`, 'i'),
    parameterExtractors: [
      { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' },
      { name: 'year', type: 'string', captureGroup: 2 } // Store as string to match Firestore
    ],
    filterBuilder: (params) => [
      { field: 'department', operator: '==', value: params.department },
      { field: 'year', operator: '==', value: params.year }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  },
  {
    id: 'composite-dept-year-in',
    name: 'Composite Query - Department Findings in Year',
    priority: 20,
    regex: new RegExp(`(${departmentList})\\s+findings?\\s+in\\s+(\\d{4})`, 'i'),
    parameterExtractors: [
      { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' },
      { name: 'year', type: 'string', captureGroup: 2 } // Store as string to match Firestore
    ],
    filterBuilder: (params) => [
      { field: 'department', operator: '==', value: params.department },
      { field: 'year', operator: '==', value: params.year }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  },
  {
    id: 'composite-year-dept',
    name: 'Composite Query - Year Department Findings',
    priority: 20,
    regex: new RegExp(`(\\d{4})\\s+(${departmentList})\\s+findings?`, 'i'),
    parameterExtractors: [
      { name: 'year', type: 'string', captureGroup: 1 }, // Store as string to match Firestore
      { name: 'department', type: 'string', captureGroup: 2, normalizer: 'capitalize' }
    ],
    filterBuilder: (params) => [
      { field: 'department', operator: '==', value: params.department },
      { field: 'year', operator: '==', value: params.year }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  },
  {
    id: 'composite-critical-dept',
    name: 'Composite Query - Critical Department Findings',
    priority: 25,
    regex: new RegExp(`critical\\s+(${departmentList})\\s+findings?`, 'i'),
    parameterExtractors: [
      { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' }
    ],
    filterBuilder: (params) => [
      { field: 'department', operator: '==', value: params.department },
      { field: 'nilai', operator: '>=', value: 15 }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  },
  {
    id: 'composite-dept-critical',
    name: 'Composite Query - Department Critical Findings',
    priority: 25,
    regex: new RegExp(`(${departmentList})\\s+critical\\s+findings?`, 'i'),
    parameterExtractors: [
      { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' }
    ],
    filterBuilder: (params) => [
      { field: 'department', operator: '==', value: params.department },
      { field: 'nilai', operator: '>=', value: 15 }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  },
  {
    id: 'composite-high-risk-dept',
    name: 'Composite Query - High Risk Department Findings',
    priority: 25,
    regex: new RegExp(`high\\s+risk\\s+(${departmentList})\\s+findings?`, 'i'),
    parameterExtractors: [
      { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' }
    ],
    filterBuilder: (params) => [
      { field: 'department', operator: '==', value: params.department },
      { field: 'nilai', operator: '>=', value: 10 }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  },
  {
    id: 'composite-dept-high-risk',
    name: 'Composite Query - Department High Risk Findings',
    priority: 25,
    regex: new RegExp(`(${departmentList})\\s+high\\s+risk\\s+findings?`, 'i'),
    parameterExtractors: [
      { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' }
    ],
    filterBuilder: (params) => [
      { field: 'department', operator: '==', value: params.department },
      { field: 'nilai', operator: '>=', value: 10 }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  }
];

/**
 * Finding Type Patterns (Findings vs Non-Findings)
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export const findingTypePatterns: QueryPattern[] = [
  {
    id: 'finding-only',
    name: 'Finding Type - Only Findings',
    priority: 5,
    regex: /only\s+findings?|actual\s+findings?/i,
    parameterExtractors: [],
    filterBuilder: () => [
      { field: 'code', operator: '!=', value: '' }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  },
  {
    id: 'finding-exclude-non',
    name: 'Finding Type - Exclude Non-Findings',
    priority: 5,
    regex: /exclude\s+non-findings?/i,
    parameterExtractors: [],
    filterBuilder: () => [
      { field: 'code', operator: '!=', value: '' }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  },
  {
    id: 'finding-non-findings',
    name: 'Finding Type - Non-Findings',
    priority: 5,
    regex: /non-findings?/i,
    parameterExtractors: [],
    filterBuilder: () => [
      { field: 'code', operator: '==', value: '' }
    ],
    sortBuilder: () => [
      { field: 'year', direction: 'desc' }
    ]
  }
];

/**
 * Composite Finding Type Patterns (Finding Type + Other Filters)
 * Requirements: 7.5
 */
export const compositeFindingTypePatterns: QueryPattern[] = [
  // Only findings + year
  {
    id: 'composite-only-findings-year',
    name: 'Composite - Only Findings from Year',
    priority: 30,
    regex: /(?:only\s+findings?|actual\s+findings?)\s+(?:from|in)\s+(\d{4})/i,
    parameterExtractors: [
      { name: 'year', type: 'string', captureGroup: 1 } // Store as string to match Firestore
    ],
    filterBuilder: (params) => [
      { field: 'code', operator: '!=', value: '' },
      { field: 'year', operator: '==', value: params.year }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  },
  // Only findings + department
  {
    id: 'composite-only-findings-dept',
    name: 'Composite - Only Findings Department',
    priority: 30,
    regex: new RegExp(`(?:only\\s+findings?|actual\\s+findings?)\\s+(${departmentList})`, 'i'),
    parameterExtractors: [
      { name: 'department', type: 'string', captureGroup: 1, normalizer: 'uppercase' }
    ],
    filterBuilder: (params) => [
      { field: 'code', operator: '!=', value: '' },
      { field: 'department', operator: '==', value: params.department }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  },
  // Only findings + department + year
  {
    id: 'composite-only-findings-dept-year',
    name: 'Composite - Only Findings Department from Year',
    priority: 35,
    regex: new RegExp(`(?:only\\s+findings?|actual\\s+findings?)\\s+(${departmentList})\\s+(?:from|in)\\s+(\\d{4})`, 'i'),
    parameterExtractors: [
      { name: 'department', type: 'string', captureGroup: 1, normalizer: 'uppercase' },
      { name: 'year', type: 'string', captureGroup: 2 } // Store as string to match Firestore
    ],
    filterBuilder: (params) => [
      { field: 'code', operator: '!=', value: '' },
      { field: 'department', operator: '==', value: params.department },
      { field: 'year', operator: '==', value: params.year }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  },
  // Non-findings + year
  {
    id: 'composite-non-findings-year',
    name: 'Composite - Non-Findings from Year',
    priority: 30,
    regex: /non-findings?\s+(?:from|in)\s+(\d{4})/i,
    parameterExtractors: [
      { name: 'year', type: 'string', captureGroup: 1 } // Store as string to match Firestore
    ],
    filterBuilder: (params) => [
      { field: 'code', operator: '==', value: '' },
      { field: 'year', operator: '==', value: params.year }
    ],
    sortBuilder: () => [
      { field: 'year', direction: 'desc' }
    ]
  },
  // Non-findings + department
  {
    id: 'composite-non-findings-dept',
    name: 'Composite - Non-Findings Department',
    priority: 30,
    regex: new RegExp(`non-findings?\\s+(${departmentList})`, 'i'),
    parameterExtractors: [
      { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' }
    ],
    filterBuilder: (params) => [
      { field: 'code', operator: '==', value: '' },
      { field: 'department', operator: '==', value: params.department }
    ],
    sortBuilder: () => [
      { field: 'year', direction: 'desc' }
    ]
  },
  // Only findings + critical
  {
    id: 'composite-only-findings-critical',
    name: 'Composite - Only Critical Findings',
    priority: 30,
    regex: /(?:only\s+findings?|actual\s+findings?)\s+critical/i,
    parameterExtractors: [],
    filterBuilder: () => [
      { field: 'code', operator: '!=', value: '' },
      { field: 'nilai', operator: '>=', value: 15 }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  }
];

/**
 * All query patterns combined
 */
export const allPatterns: QueryPattern[] = [
  ...compositeFindingTypePatterns, // Highest priority for finding type composites
  ...compositePatterns,
  ...temporalPatterns,
  ...departmentPatterns,
  ...riskPatterns,
  ...projectPatterns,
  ...subholdingPatterns,
  ...findingTypePatterns
];

/**
 * Get patterns by category
 */
export function getPatternsByCategory(category: string): QueryPattern[] {
  switch (category.toLowerCase()) {
    case 'composite':
      return compositePatterns;
    case 'composite-finding-type':
      return compositeFindingTypePatterns;
    case 'temporal':
      return temporalPatterns;
    case 'department':
      return departmentPatterns;
    case 'risk':
      return riskPatterns;
    case 'project':
      return projectPatterns;
    case 'subholding':
      return subholdingPatterns;
    case 'finding-type':
      return findingTypePatterns;
    default:
      return [];
  }
}

/**
 * Get a pattern by ID
 */
export function getPatternById(id: string): QueryPattern | undefined {
  return allPatterns.find(p => p.id === id);
}
