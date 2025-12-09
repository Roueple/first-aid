/**
 * Utility functions for department normalization
 * Used across the application for consistent department handling
 */

const STOPWORDS = new Set([
  'departemen',
  'department',
  'departement',
  'dan',
  'dengan',
  'pihak',
  'ketiga',
  'unit',
  'biro',
]);

/**
 * Normalize a raw department name
 */
export function normalizeDepartmentName(rawName: string): string {
  return rawName
    .trim()
    .replace(/[\/\-,\(\)&]/g, ' ') // Replace special chars with space
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/^(Departemen|Department|Departement)\s+/i, '') // Remove prefix
    .trim();
}

/**
 * Generate searchable keywords from department name
 */
export function generateDepartmentKeywords(name: string): string[] {
  const normalized = name.toLowerCase();
  const words = normalized.match(/\w+/g) || [];
  
  // Filter out stopwords and short words
  const keywords = words.filter(
    (word) => word.length > 2 && !STOPWORDS.has(word)
  );

  // Add the full normalized name as a keyword too
  const fullKeyword = normalized.replace(/\s+/g, '_');
  if (fullKeyword.length > 2) {
    keywords.push(fullKeyword);
  }

  return [...new Set(keywords)]; // Remove duplicates
}

/**
 * Check if two department names are likely the same
 */
export function areDepartmentsSimilar(name1: string, name2: string): boolean {
  const norm1 = normalizeDepartmentName(name1).toLowerCase();
  const norm2 = normalizeDepartmentName(name2).toLowerCase();
  
  // Exact match after normalization
  if (norm1 === norm2) return true;
  
  // Check keyword overlap
  const keywords1 = new Set(generateDepartmentKeywords(norm1));
  const keywords2 = new Set(generateDepartmentKeywords(norm2));
  
  // If either has no keywords, not similar
  if (keywords1.size === 0 || keywords2.size === 0) return false;
  
  // Calculate Jaccard similarity
  const intersection = new Set([...keywords1].filter(k => keywords2.has(k)));
  const union = new Set([...keywords1, ...keywords2]);
  
  const similarity = intersection.size / union.size;
  
  // Consider similar if >50% keyword overlap
  return similarity > 0.5;
}

/**
 * Extract department category from name
 */
export function categorizeDepartment(name: string): string {
  const lower = name.toLowerCase();

  // Hospitality & F&B (check before Operations to catch "golf operation")
  if (
    lower.includes('food') ||
    lower.includes('beverage') ||
    lower.includes('f&b') ||
    lower.includes('fnb') ||
    lower.includes('restaurant') ||
    lower.includes('hotel') ||
    lower.includes('hospitality') ||
    lower.includes('golf') ||
    lower.includes('club') ||
    lower.includes('villa') ||
    lower.includes('food court') ||
    lower.includes('fc')
  ) {
    return 'Hospitality & F&B';
  }

  // Outsourcing & Third Party (check early)
  if (
    lower.includes('outsource') ||
    lower.includes('third party') ||
    lower.includes('pihak ketiga') ||
    lower.includes('vendor') ||
    lower.includes('suplemen')
  ) {
    return 'Outsourcing & Third Party';
  }

  // IT & Technology
  if (
    lower.match(/\bit\b/) ||
    lower.includes('teknologi') ||
    lower.includes('informasi') ||
    lower.includes('technology') ||
    lower.includes('ict') ||
    lower.includes('sistem informasi')
  ) {
    return 'IT';
  }

  // Finance & Accounting
  if (
    lower.includes('finance') ||
    lower.includes('keuangan') ||
    lower.includes('accounting') ||
    lower.includes('fad') ||
    lower.includes('treasury') ||
    lower.includes('investasi') ||
    lower.includes('investment')
  ) {
    return 'Finance';
  }

  // HR & People Management
  if (
    lower.includes('hr') ||
    lower.includes('hrd') ||
    lower.includes('hcm') ||
    lower.includes('sdm') ||
    lower.includes('sumber daya manusia') ||
    lower.includes('people') ||
    lower.includes('talent')
  ) {
    return 'HR';
  }

  // Marketing & Sales
  if (
    lower.includes('marketing') ||
    lower.includes('sales') ||
    lower.includes('hbd') ||
    lower.includes('promotion') ||
    lower.includes('admission') ||
    lower.includes('commercial')
  ) {
    return 'Marketing & Sales';
  }

  // Property & Estate Management
  if (
    lower.includes('estate') ||
    lower.includes('property') ||
    lower.includes('building management') ||
    lower.includes('building operation') ||
    lower.includes('tenant') ||
    lower.includes('leasing') ||
    lower.includes('tanah') ||
    lower.includes('land')
  ) {
    return 'Property Management';
  }

  // Engineering & Construction
  if (
    lower.includes('engineering') ||
    lower.includes('teknik') ||
    lower.includes('konstruksi') ||
    lower.includes('construction') ||
    lower.includes('qs') ||
    lower.includes('quantity surveyor') ||
    lower.includes('maintenance') ||
    lower.includes('gcm')
  ) {
    return 'Engineering & Construction';
  }

  // Legal & Compliance
  if (
    lower.includes('legal') ||
    lower.includes('hukum') ||
    lower.includes('compliance') ||
    lower.includes('regulatory')
  ) {
    return 'Legal & Compliance';
  }

  // Audit & Risk Management
  if (
    lower.includes('audit') ||
    lower.includes('risk') ||
    lower.includes('risiko') ||
    lower.includes('apu') ||
    lower.includes('ppt') ||
    lower.includes('internal control')
  ) {
    return 'Audit & Risk';
  }

  // Planning & Development
  if (
    lower.includes('perencanaan') ||
    lower.includes('planning') ||
    lower.includes('development') ||
    lower.includes('fsd') ||
    lower.includes('fdd')
  ) {
    return 'Planning & Development';
  }

  // Healthcare & Medical
  if (
    lower.includes('medis') ||
    lower.includes('medical') ||
    lower.includes('health') ||
    lower.includes('kesehatan') ||
    lower.includes('keperawatan') ||
    lower.includes('nursing') ||
    lower.includes('icd') ||
    lower.includes('penunjang medis')
  ) {
    return 'Healthcare';
  }

  // Insurance & Actuarial
  if (
    lower.includes('actuary') ||
    lower.includes('actuarial') ||
    lower.includes('underwriting') ||
    lower.includes('insurance') ||
    lower.includes('asuransi') ||
    lower.includes('klaim')
  ) {
    return 'Insurance & Actuarial';
  }

  // CSR & Community
  if (
    lower.includes('csr') ||
    lower.includes('community') ||
    lower.includes('social') ||
    lower.includes('responsibility') ||
    lower.includes('pendidikan') ||
    lower.includes('education')
  ) {
    return 'CSR & Community';
  }

  // Security
  if (lower.includes('security') || lower.includes('keamanan')) {
    return 'Security';
  }

  // Corporate/Executive
  if (
    lower.includes('corporate') ||
    lower.includes('executive') ||
    lower.includes('board') ||
    lower.includes('direksi')
  ) {
    return 'Corporate';
  }

  // Supply Chain & Procurement
  if (
    lower.includes('supply') ||
    lower.includes('procurement') ||
    lower.includes('purchasing') ||
    lower.includes('logistic') ||
    lower.includes('warehouse') ||
    lower.includes('ffb') ||
    lower.includes('tbs') ||
    lower.includes('sortasi')
  ) {
    return 'Supply Chain & Procurement';
  }

  // Academic & Administration
  if (
    lower.includes('akademik') ||
    lower.includes('academic') ||
    lower.includes('mahasiswa') ||
    lower.includes('student') ||
    lower.includes('alumni') ||
    lower.includes('biro administrasi')
  ) {
    return 'Academic & Administration';
  }

  // Operations & General Affairs (check last as it's most general)
  if (
    lower.includes('operation') ||
    lower.includes('operasi') ||
    lower.includes('umum') ||
    lower.includes('general affairs') ||
    lower.includes('ga') ||
    lower.includes('housekeeping') ||
    lower.includes('house keeping') ||
    lower.includes('front office') ||
    lower.includes('customer service') ||
    lower.includes('layanan pelanggan')
  ) {
    return 'Operations';
  }

  if (lower.includes('feh')) {
    return 'Other';
  }

  return 'Other';
}

/**
 * Format department name for display
 */
export function formatDepartmentName(name: string): string {
  const normalized = normalizeDepartmentName(name);
  
  // Capitalize first letter of each word
  return normalized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
