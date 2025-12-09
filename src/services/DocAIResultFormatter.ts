/**
 * DocAI Result Formatter
 * 
 * Formats query results for display and export
 */

import { AuditResult } from './AuditResultService';
import * as XLSX from 'xlsx';

/**
 * Format results as text table for chat display
 */
export function formatResultsAsText(
  results: AuditResult[],
  description: string,
  limit: number
): string {
  if (results.length === 0) {
    return `Tidak ditemukan hasil untuk: ${description}`;
  }

  const displayCount = Math.min(results.length, limit);
  const hasMore = results.length > limit;

  let text = `Ditemukan ${results.length} hasil untuk: ${description}\n\n`;
  text += `Menampilkan ${displayCount} hasil teratas:\n\n`;

  // Table header
  text += '```\n';
  text += 'No | Proyek | Thn | Dept | Nilai | Deskripsi\n';
  text += '---|--------|-----|------|-------|----------\n';

  // Table rows
  for (let i = 0; i < displayCount; i++) {
    const r = results[i];
    const no = String(i + 1).padEnd(2);
    const project = truncate(r.projectName, 20);
    const year = String(r.year);
    const dept = truncate(r.department, 15);
    const nilai = String(r.nilai).padStart(2);
    const desc = truncate(r.descriptions, 35);
    
    text += `${no} | ${project} | ${year} | ${dept} | ${nilai} | ${desc}\n`;
  }

  text += '```\n';

  if (hasMore) {
    text += `\n... dan ${results.length - displayCount} hasil lainnya.\n`;
    text += `\nUnduh file Excel untuk melihat semua hasil.`;
  }

  return text;
}

/**
 * Truncate string to max length with ellipsis
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) {
    return str.padEnd(maxLen);
  }
  return str.substring(0, maxLen - 2) + '..';
}

/**
 * Format results as Excel file
 */
export function formatResultsAsExcel(
  results: AuditResult[],
  description: string
): Buffer {
  // Prepare data for Excel
  const data = results.map((r) => ({
    'Audit Result ID': r.auditResultId,
    Tahun: r.year,
    SH: r.sh,
    'Nama Proyek': r.projectName,
    Departemen: r.department,
    'Area Risiko': r.riskArea,
    Deskripsi: r.descriptions,
    Kode: r.code,
    Bobot: r.bobot,
    Kadar: r.kadar,
    Nilai: r.nilai,
  }));

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // Audit Result ID
    { wch: 8 }, // Tahun
    { wch: 8 }, // SH
    { wch: 30 }, // Nama Proyek
    { wch: 20 }, // Departemen
    { wch: 25 }, // Area Risiko
    { wch: 50 }, // Deskripsi
    { wch: 8 }, // Kode
    { wch: 8 }, // Bobot
    { wch: 8 }, // Kadar
    { wch: 8 }, // Nilai
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Hasil Query');

  // Add metadata sheet
  const metadata = [
    ['Query Description', description],
    ['Total Results', results.length],
    ['Generated At', new Date().toISOString()],
  ];
  const wsMetadata = XLSX.utils.aoa_to_sheet(metadata);
  XLSX.utils.book_append_sheet(wb, wsMetadata, 'Metadata');

  // Generate buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

/**
 * Generate filename for Excel export
 */
export function generateExcelFilename(description: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const cleanDescription = description
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 30);

  return `docai_${cleanDescription}_${timestamp}.xlsx`;
}

/**
 * Format confirmation message for user
 */
export function formatConfirmation(
  query: string,
  description: string,
  filterCount: number
): string {
  let text = `Saya akan mencari: ${description}\n\n`;
  text += `Berdasarkan query Anda: "${query}"\n`;
  text += `Menggunakan ${filterCount} filter.\n\n`;
  text += `Apakah ini yang Anda maksud? (Ya/Tidak)`;

  return text;
}

/**
 * Format statistics summary
 */
export function formatStatistics(results: AuditResult[]): string {
  if (results.length === 0) {
    return 'Tidak ada data untuk ditampilkan.';
  }

  // Count by nilai score ranges
  const score15Plus = results.filter((r) => r.nilai >= 15).length;
  const score10to14 = results.filter((r) => r.nilai >= 10 && r.nilai < 15).length;
  const score5to9 = results.filter((r) => r.nilai >= 5 && r.nilai < 10).length;
  const scoreLess5 = results.filter((r) => r.nilai < 5).length;

  // Count by year
  const byYear = results.reduce(
    (acc, r) => {
      const year = String(r.year);
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Count by department
  const byDept = results.reduce(
    (acc, r) => {
      acc[r.department] = (acc[r.department] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  let text = `📊 Statistik Hasil:\n\n`;
  text += `Total: ${results.length} hasil\n\n`;

  text += `Distribusi Nilai:\n`;
  text += `Nilai ≥15: ${score15Plus}\n`;
  text += `Nilai 10-14: ${score10to14}\n`;
  text += `Nilai 5-9: ${score5to9}\n`;
  text += `Nilai <5: ${scoreLess5}\n\n`;

  text += `Per Tahun:\n`;
  Object.entries(byYear)
    .sort(([a], [b]) => b.localeCompare(a))
    .forEach(([year, count]) => {
      text += `${year}: ${count}\n`;
    });

  text += `\nTop 5 Departemen:\n`;
  Object.entries(byDept)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .forEach(([dept, count]) => {
      text += `${dept}: ${count}\n`;
    });

  return text;
}
