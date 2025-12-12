/**
 * Audit Result Excel Export Utility
 * 
 * Exports audit results data to Excel (.xlsx) format using xlsx library.
 * Includes all audit result fields with proper formatting.
 */

import * as XLSX from 'xlsx';
import { AuditResult } from '../services/AuditResultService';
import { Timestamp } from 'firebase/firestore';

/**
 * Format Timestamp to readable date string
 */
function formatDate(timestamp: Timestamp | undefined): string {
  if (!timestamp) return '';
  try {
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * Convert audit results to Excel-friendly format
 */
function auditResultsToExcelData(results: AuditResult[]): any[] {
  return results.map((result) => ({
    'Audit Result ID': result.auditResultId,
    'Year': result.year,
    'SH': result.sh,
    'Project Name': result.projectName,
    'Project ID': result.projectId || '',
    'Department': result.department,
    'Risk Area': result.riskArea,
    'Description': result.description,
    'Code': result.code,
    'Bobot': result.bobot,
    'Kadar': result.kadar,
    'Nilai': result.nilai,
    'Created At': formatDate(result.createdAt),
    'Created By': result.createdBy || '',
    'Updated At': formatDate(result.updatedAt),
  }));
}

/**
 * Export audit results to Excel file
 * 
 * @param results - Array of audit results to export
 * @param filename - Output filename (default: audit-results-export.xlsx)
 * @param sheetName - Sheet name (default: Audit Results)
 */
export function exportAuditResultsToExcel(
  results: AuditResult[],
  filename: string = 'audit-results-export.xlsx',
  sheetName: string = 'Audit Results'
): void {
  try {
    // Convert audit results to Excel data
    const excelData = auditResultsToExcelData(results);

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 20 }, // Audit Result ID
      { wch: 10 }, // Year
      { wch: 15 }, // SH
      { wch: 40 }, // Project Name
      { wch: 15 }, // Project ID
      { wch: 25 }, // Department
      { wch: 25 }, // Risk Area
      { wch: 60 }, // Description
      { wch: 10 }, // Code
      { wch: 10 }, // Bobot
      { wch: 10 }, // Kadar
      { wch: 10 }, // Nilai
      { wch: 15 }, // Created At
      { wch: 20 }, // Created By
      { wch: 15 }, // Updated At
    ];
    worksheet['!cols'] = columnWidths;

    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, filename);

    console.log(`✅ Exported ${results.length} audit results to ${filename}`);
  } catch (error) {
    console.error('Failed to export to Excel:', error);
    throw new Error('Failed to export audit results to Excel');
  }
}

/**
 * Export audit results with custom columns
 * 
 * @param results - Array of audit results to export
 * @param columns - Array of column definitions { key: string, header: string, width?: number }
 * @param filename - Output filename
 * @param sheetName - Sheet name
 */
export function exportAuditResultsToExcelCustom(
  results: AuditResult[],
  columns: Array<{ key: keyof AuditResult; header: string; width?: number }>,
  filename: string = 'audit-results-export.xlsx',
  sheetName: string = 'Audit Results'
): void {
  try {
    // Convert audit results to custom format
    const excelData = results.map((result) => {
      const row: any = {};
      columns.forEach((col) => {
        const value = result[col.key];
        
        // Handle special types
        if (value instanceof Timestamp) {
          row[col.header] = formatDate(value);
        } else if (Array.isArray(value)) {
          row[col.header] = value.join(', ');
        } else {
          row[col.header] = value || '';
        }
      });
      return row;
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Set column widths
    if (columns.some((col) => col.width)) {
      worksheet['!cols'] = columns.map((col) => ({ wch: col.width || 20 }));
    }

    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, filename);

    console.log(`✅ Exported ${results.length} audit results to ${filename}`);
  } catch (error) {
    console.error('Failed to export to Excel:', error);
    throw new Error('Failed to export audit results to Excel');
  }
}
