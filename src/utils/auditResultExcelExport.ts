/**
 * Audit Result Excel Export Utility
 *
 * Exports audit results data to Excel (.xlsx) format using xlsx library.
 * Exports 1:1 mirror of Master_Audit_Data.xlsx structure.
 */

import * as XLSX from 'xlsx';
import { AuditResult, FIELD_TO_EXCEL_COLUMN } from '../types/auditResult.types';
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
 * Mirrors Master_Audit_Data.xlsx column structure exactly
 */
function auditResultsToExcelData(results: AuditResult[]): any[] {
  return results.map((result) => ({
    // 1:1 mirror of Master_Audit_Data.xlsx columns
    'Unique ID': result.auditResultId,
    Filename: result.filename,
    Proyek: result.proyek,
    Category: result.category,
    Subholding: result.subholding,
    Year: result.year,
    Department: result.department,
    'Department(ori)': result.departmentOri,
    'Risk Area': result.riskArea,
    Deskripsi: result.deskripsi,
    Kode: result.kode,
    Bobot: result.bobot,
    Kadar: result.kadar,
    Nilai: result.nilai,
    Kategori: result.kategori || '',
    'Temuan Ulangan Count': result.temuanUlanganCount,
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

    // Set column widths for better readability (matches Master_Audit_Data.xlsx)
    const columnWidths = [
      { wch: 20 }, // Unique ID
      { wch: 40 }, // Filename
      { wch: 35 }, // Proyek
      { wch: 15 }, // Category
      { wch: 12 }, // Subholding
      { wch: 8 }, // Year
      { wch: 25 }, // Department
      { wch: 40 }, // Department(ori)
      { wch: 60 }, // Risk Area
      { wch: 80 }, // Deskripsi
      { wch: 8 }, // Kode
      { wch: 8 }, // Bobot
      { wch: 8 }, // Kadar
      { wch: 8 }, // Nilai
      { wch: 15 }, // Kategori
      { wch: 20 }, // Temuan Ulangan Count
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
          row[col.header] = value ?? '';
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
