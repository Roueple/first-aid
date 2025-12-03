/**
 * Excel Export Utility
 * 
 * Exports findings data to Excel (.xlsx) format using xlsx library.
 * Includes all finding fields with proper formatting.
 */

import * as XLSX from 'xlsx';
import { Finding } from '../types/finding.types';
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
 * Convert findings to Excel-friendly format
 */
function findingsToExcelData(findings: Finding[]): any[] {
  return findings.map((finding) => ({
    'Finding ID': finding.id,
    'Audit Year': finding.auditYear,
    'Title': finding.findingTitle,
    'Description': finding.findingDescription,
    'Priority Level': finding.priorityLevel,
    'Status': finding.status,
    'Score (Total)': finding.findingTotal,
    'Bobot (Weight)': finding.findingBobot,
    'Kadar (Degree)': finding.findingKadar,
    'Subholding': finding.subholding,
    'Project Type': finding.projectType,
    'Project Name': finding.projectName,
    'Department': finding.findingDepartment,
    'Process Area': finding.processArea,
    'Control Category': finding.controlCategory,
    'Primary Tag': finding.primaryTag,
    'Secondary Tags': finding.secondaryTags?.join(', ') || '',
    'Executor': finding.executor,
    'Reviewer': finding.reviewer,
    'Manager': finding.manager,
    'Root Cause': finding.rootCause,
    'Impact': finding.impactDescription,
    'Recommendation': finding.recommendation,
    'Management Response': finding.managementResponse || '',
    'Action Plan': finding.actionPlan || '',
    'Date Identified': formatDate(finding.dateIdentified),
    'Date Due': formatDate(finding.dateDue),
    'Date Completed': formatDate(finding.dateCompleted),
    'Notes': finding.notes || '',
    'Original Source': finding.originalSource,
  }));
}

/**
 * Export findings to Excel file
 * 
 * @param findings - Array of findings to export
 * @param filename - Output filename (default: findings-export.xlsx)
 * @param sheetName - Sheet name (default: Findings)
 */
export function exportToExcel(
  findings: Finding[],
  filename: string = 'findings-export.xlsx',
  sheetName: string = 'Findings'
): void {
  try {
    // Convert findings to Excel data
    const excelData = findingsToExcelData(findings);

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 15 }, // Finding ID
      { wch: 10 }, // Audit Year
      { wch: 40 }, // Title
      { wch: 60 }, // Description
      { wch: 12 }, // Priority Level
      { wch: 12 }, // Status
      { wch: 10 }, // Score
      { wch: 10 }, // Bobot
      { wch: 10 }, // Kadar
      { wch: 20 }, // Subholding
      { wch: 20 }, // Project Type
      { wch: 30 }, // Project Name
      { wch: 20 }, // Department
      { wch: 20 }, // Process Area
      { wch: 15 }, // Control Category
      { wch: 20 }, // Primary Tag
      { wch: 30 }, // Secondary Tags
      { wch: 20 }, // Executor
      { wch: 20 }, // Reviewer
      { wch: 20 }, // Manager
      { wch: 50 }, // Root Cause
      { wch: 50 }, // Impact
      { wch: 50 }, // Recommendation
      { wch: 50 }, // Management Response
      { wch: 50 }, // Action Plan
      { wch: 15 }, // Date Identified
      { wch: 15 }, // Date Due
      { wch: 15 }, // Date Completed
      { wch: 40 }, // Notes
      { wch: 20 }, // Original Source
    ];
    worksheet['!cols'] = columnWidths;

    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, filename);

    console.log(`✅ Exported ${findings.length} findings to ${filename}`);
  } catch (error) {
    console.error('Failed to export to Excel:', error);
    throw new Error('Failed to export findings to Excel');
  }
}

/**
 * Export findings with custom columns
 * 
 * @param findings - Array of findings to export
 * @param columns - Array of column definitions { key: string, header: string, width?: number }
 * @param filename - Output filename
 * @param sheetName - Sheet name
 */
export function exportToExcelCustom(
  findings: Finding[],
  columns: Array<{ key: keyof Finding; header: string; width?: number }>,
  filename: string = 'findings-export.xlsx',
  sheetName: string = 'Findings'
): void {
  try {
    // Convert findings to custom format
    const excelData = findings.map((finding) => {
      const row: any = {};
      columns.forEach((col) => {
        const value = finding[col.key];
        
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

    console.log(`✅ Exported ${findings.length} findings to ${filename}`);
  } catch (error) {
    console.error('Failed to export to Excel:', error);
    throw new Error('Failed to export findings to Excel');
  }
}
