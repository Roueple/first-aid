import { QueryResult } from './types';

const MAX_ROWS = 10;
const MAX_DETAIL_ROWS = 5;

export function formatForWhatsApp(result: QueryResult): string {
  if (!result.success) {
    return `❌ ${result.message}`;
  }

  if (result.isAggregated && result.aggregatedResults?.length) {
    return formatAggregation(result);
  }

  if (result.results && result.results.length > 0) {
    return formatResults(result);
  }

  return `ℹ️ ${result.message}`;
}

function formatAggregation(result: QueryResult): string {
  const rows = result.aggregatedResults!;
  const groupField = Array.isArray(result.groupByField) ? result.groupByField.join(' + ') : result.groupByField;
  const lines: string[] = [];

  lines.push(`📊 *${result.message}*`);
  lines.push(`Dikelompokkan berdasarkan: ${groupField}`);
  lines.push('');

  const display = rows.slice(0, MAX_ROWS);
  display.forEach((row, i) => {
    const label = formatGroupValue(row.groupValue);
    const value = row.sum != null ? formatAggValue('Total', row.sum)
      : row.avg != null ? formatAggValue('Rata-rata', row.avg)
      : row.min != null ? formatAggValue('Min', row.min)
      : row.max != null ? formatAggValue('Max', row.max)
      : `${row.count} temuan`;
    lines.push(`${i + 1}. *${label}*: ${value}`);
  });

  if (rows.length > MAX_ROWS) {
    lines.push(`\n_...dan ${rows.length - MAX_ROWS} grup lainnya_`);
  }

  return lines.join('\n');
}

function formatResults(result: QueryResult): string {
  const rows = result.results!;
  const lines: string[] = [];
  const table = result.table || 'audit_results';

  lines.push(`🔍 *${result.message}*`);
  lines.push('');

  if (table === 'projects') {
    const display = rows.slice(0, MAX_ROWS);
    display.forEach((r, i) => {
      const grade = r.grade2024 || r.grade2023 || r.grade2022 || '-';
      lines.push(`${i + 1}. *${r.projectName || r.id}*`);
      lines.push(`   SH: ${r.sh || '-'} | Grade: ${grade} | Temuan: ${r.totalFindings ?? '-'}`);
    });
  } else if (table === 'department_tags') {
    const display = rows.slice(0, MAX_ROWS);
    display.forEach((r, i) => {
      lines.push(`${i + 1}. *${r.departmentName}* [${r.category || '-'}]`);
      if (r.findingsCount) lines.push(`   Temuan: ${r.findingsCount}`);
    });
  } else {
    // audit_results
    const display = rows.slice(0, MAX_DETAIL_ROWS);
    display.forEach((r, i) => {
      const desc = r.deskripsi ? truncate(r.deskripsi, 100) : '-';
      lines.push(`${i + 1}. *[${r.auditResultId || r.id}]*`);
      lines.push(`   Proyek: ${r.proyek || '-'} | Dept: ${r.department || '-'} | Tahun: ${r.year || '-'}`);
      lines.push(`   ${desc}`);
    });

    if (rows.length > MAX_DETAIL_ROWS) {
      lines.push('');
      lines.push(`_...dan ${rows.length - MAX_DETAIL_ROWS} hasil lainnya_`);
      lines.push(`_Total: ${result.resultsCount} hasil_`);
    }
  }

  if (rows.length > MAX_ROWS && table !== 'audit_results') {
    lines.push(`\n_...dan ${rows.length - MAX_ROWS} lainnya_`);
  }

  return lines.join('\n');
}

function formatGroupValue(val: string | number | Record<string, string | number>): string {
  if (typeof val === 'object' && val !== null) {
    return Object.values(val).join(' / ');
  }
  return String(val || '-');
}

function formatAggValue(label: string, val: number): string {
  return `${label}: ${Math.round(val * 100) / 100}`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str;
}

export function formatHelp(): string {
  return [
    '🤖 *Bernard — Audit AI Assistant*',
    '',
    'Saya bisa membantu Anda mencari data audit. Contoh pertanyaan:',
    '',
    '• _temuan IT tahun 2024_',
    '• _temuan APAR semua proyek_',
    '• _jumlah temuan per departemen 2024_',
    '• _proyek dengan grade D atau E tahun 2024_',
    '• _top 10 temuan dengan nilai tertinggi_',
    '• _temuan SH1 2023_',
    '',
    'Ketik pertanyaan Anda dalam Bahasa Indonesia atau Inggris.',
  ].join('\n');
}

export function formatNotAuthorized(): string {
  return '⛔ Nomor Anda tidak terdaftar. Hubungi admin untuk akses.';
}

export function formatError(): string {
  return '⚠️ Terjadi kesalahan. Silakan coba lagi.';
}
