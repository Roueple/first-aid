/**
 * Type definitions for audit result categorization
 */

export interface CategoryDefinition {
  tipe: string;
  departemen: string;
  kategori: string;
}

export interface CategorizationResult {
  categories: string[];
  confidence: number;
  reasoning?: string;
}

export interface CachedCategorization {
  riskArea: string;
  description: string;
  result: CategorizationResult;
  timestamp: Date;
}
