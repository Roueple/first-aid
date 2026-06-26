export interface QueryFilter {
  field: string;
  operator: '==' | '!=' | '>' | '>=' | '<' | '<=' | 'array-contains' | 'in' | 'array-contains-any' | 'contains' | 'contains-any' | 'not-in';
  value: string | number | boolean | string[] | number[];
}

export interface AggregationResult {
  groupBy: string | string[];
  groupValue: string | number | Record<string, string | number>;
  count: number;
  sum?: number;
  avg?: number;
  min?: number;
  max?: number;
}

export interface QueryResult {
  success: boolean;
  message: string;
  results?: any[];
  aggregatedResults?: AggregationResult[];
  resultsCount: number;
  table?: string;
  needsConfirmation: boolean;
  suggestions?: Array<{ name: string; score: number }>;
  originalQuery?: string;
  isAggregated?: boolean;
  aggregationType?: string;
  groupByField?: string | string[];
}

export interface WaSession {
  phone: string;
  history: Array<{ role: 'user' | 'assistant'; content: string; ts: number }>;
  updatedAt: FirebaseFirestore.FieldValue | Date;
}

export interface WaWhitelist {
  name: string;
  addedBy: string;
  tier: 'tier-1' | 'tier-2';
}
