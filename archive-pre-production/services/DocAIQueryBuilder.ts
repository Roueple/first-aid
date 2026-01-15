/**
 * DocAI Query Builder
 * 
 * Builds Firebase queries from extracted filters
 * Handles year as string, department lookups, and complex filters
 */

import { QueryFilter, QuerySort } from './DatabaseService';
import departmentService from './DepartmentService';

export interface ExtractedFilters {
  year?: string | string[]; // Always string: "2024"
  department?: string | string[];
  projectName?: string;
  minNilai?: number;
  maxNilai?: number;
  minBobot?: number;
  maxBobot?: number;
  minKadar?: number;
  maxKadar?: number;
  sh?: string;
  code?: string;
  riskArea?: string;
  onlyFindings?: boolean; // Exclude non-findings (code != '')
}

export interface QueryBuildResult {
  filters: QueryFilter[];
  sorts: QuerySort[];
  limit?: number;
  description: string; // Human-readable description of the query
}

/**
 * Build Firebase query from extracted filters
 */
export async function buildQuery(
  extracted: ExtractedFilters,
  limit: number = 10
): Promise<QueryBuildResult> {
  const filters: QueryFilter[] = [];
  const sorts: QuerySort[] = [];
  const descriptions: string[] = [];

  // Year filter (always as string)
  if (extracted.year) {
    if (Array.isArray(extracted.year)) {
      filters.push({
        field: 'year',
        operator: 'in',
        value: extracted.year,
      });
      descriptions.push(`tahun ${extracted.year.join(', ')}`);
    } else {
      filters.push({
        field: 'year',
        operator: '==',
        value: extracted.year,
      });
      descriptions.push(`tahun ${extracted.year}`);
    }
  }

  // Department filter (with normalization)
  if (extracted.department) {
    const deptNames = Array.isArray(extracted.department)
      ? extracted.department
      : [extracted.department];

    // Lookup normalized departments
    const allOriginalNames = new Set<string>();
    for (const deptName of deptNames) {
      const depts = await departmentService.searchByName(deptName);
      depts.forEach((dept) => {
        dept.originalNames.forEach((name) => allOriginalNames.add(name));
      });
    }

    if (allOriginalNames.size > 0) {
      const namesArray = Array.from(allOriginalNames);
      if (namesArray.length === 1) {
        filters.push({
          field: 'department',
          operator: '==',
          value: namesArray[0],
        });
        descriptions.push(`departemen ${namesArray[0]}`);
      } else {
        // Limit to 10 for Firestore 'in' operator
        const limitedNames = namesArray.slice(0, 10);
        filters.push({
          field: 'department',
          operator: 'in',
          value: limitedNames,
        });
        descriptions.push(`departemen ${limitedNames.join(', ')}`);
      }
    }
  }

  // Project name filter
  if (extracted.projectName) {
    filters.push({
      field: 'projectName',
      operator: '==',
      value: extracted.projectName,
    });
    descriptions.push(`proyek ${extracted.projectName}`);
  }

  // SH filter
  if (extracted.sh) {
    filters.push({
      field: 'sh',
      operator: '==',
      value: extracted.sh,
    });
    descriptions.push(`SH ${extracted.sh}`);
  }

  // Risk area filter
  if (extracted.riskArea) {
    filters.push({
      field: 'riskArea',
      operator: '==',
      value: extracted.riskArea,
    });
    descriptions.push(`area risiko ${extracted.riskArea}`);
  }

  // Code filter
  if (extracted.code) {
    filters.push({
      field: 'code',
      operator: '==',
      value: extracted.code,
    });
    descriptions.push(`kode ${extracted.code}`);
  }

  // Only findings filter (code starts with "F", exclude "NF")
  if (extracted.onlyFindings) {
    filters.push({
      field: 'code',
      operator: '>=',
      value: 'F',
    });
    filters.push({
      field: 'code',
      operator: '<',
      value: 'G',
    });
    descriptions.push('hanya temuan');
  }

  // Nilai (risk score) filters
  if (extracted.minNilai !== undefined && extracted.maxNilai !== undefined) {
    filters.push({
      field: 'nilai',
      operator: '>=',
      value: extracted.minNilai,
    });
    filters.push({
      field: 'nilai',
      operator: '<=',
      value: extracted.maxNilai,
    });
    descriptions.push(`nilai ${extracted.minNilai}-${extracted.maxNilai}`);
    sorts.push({ field: 'nilai', direction: 'desc' });
  } else if (extracted.minNilai !== undefined) {
    filters.push({
      field: 'nilai',
      operator: '>=',
      value: extracted.minNilai,
    });
    descriptions.push(`nilai ≥ ${extracted.minNilai}`);
    sorts.push({ field: 'nilai', direction: 'desc' });
  } else if (extracted.maxNilai !== undefined) {
    filters.push({
      field: 'nilai',
      operator: '<=',
      value: extracted.maxNilai,
    });
    descriptions.push(`nilai ≤ ${extracted.maxNilai}`);
    sorts.push({ field: 'nilai', direction: 'desc' });
  }

  // Bobot (weight) filters
  if (extracted.minBobot !== undefined) {
    filters.push({
      field: 'bobot',
      operator: '>=',
      value: extracted.minBobot,
    });
    descriptions.push(`bobot ≥ ${extracted.minBobot}`);
  }
  if (extracted.maxBobot !== undefined) {
    filters.push({
      field: 'bobot',
      operator: '<=',
      value: extracted.maxBobot,
    });
    descriptions.push(`bobot ≤ ${extracted.maxBobot}`);
  }

  // Kadar (severity) filters
  if (extracted.minKadar !== undefined) {
    filters.push({
      field: 'kadar',
      operator: '>=',
      value: extracted.minKadar,
    });
    descriptions.push(`kadar ≥ ${extracted.minKadar}`);
  }
  if (extracted.maxKadar !== undefined) {
    filters.push({
      field: 'kadar',
      operator: '<=',
      value: extracted.maxKadar,
    });
    descriptions.push(`kadar ≤ ${extracted.maxKadar}`);
  }

  // Default sort if no sort specified
  if (sorts.length === 0) {
    if (extracted.year) {
      sorts.push({ field: 'year', direction: 'desc' });
    }
    sorts.push({ field: 'nilai', direction: 'desc' });
  }

  // Build description
  const description =
    descriptions.length > 0
      ? descriptions.join(', ')
      : 'semua hasil audit';

  return {
    filters,
    sorts,
    limit,
    description,
  };
}

/**
 * Validate extracted filters
 */
export function validateFilters(extracted: ExtractedFilters): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate year format
  if (extracted.year) {
    const years = Array.isArray(extracted.year)
      ? extracted.year
      : [extracted.year];
    for (const year of years) {
      if (!/^\d{4}$/.test(year)) {
        errors.push(`Format tahun tidak valid: ${year} (harus YYYY)`);
      }
    }
  }

  // Validate nilai range
  if (
    extracted.minNilai !== undefined &&
    extracted.maxNilai !== undefined &&
    extracted.minNilai > extracted.maxNilai
  ) {
    errors.push(
      `Range nilai tidak valid: min (${extracted.minNilai}) > max (${extracted.maxNilai})`
    );
  }

  // Validate bobot range
  if (
    extracted.minBobot !== undefined &&
    extracted.maxBobot !== undefined &&
    extracted.minBobot > extracted.maxBobot
  ) {
    errors.push(
      `Range bobot tidak valid: min (${extracted.minBobot}) > max (${extracted.maxBobot})`
    );
  }

  // Validate kadar range
  if (
    extracted.minKadar !== undefined &&
    extracted.maxKadar !== undefined &&
    extracted.minKadar > extracted.maxKadar
  ) {
    errors.push(
      `Range kadar tidak valid: min (${extracted.minKadar}) > max (${extracted.maxKadar})`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
