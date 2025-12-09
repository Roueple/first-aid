#!/usr/bin/env node

/**
 * Script to normalize and index all departments from audit results
 * This processes the raw department data and creates normalized, searchable entries
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceaccountKey.json'), 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// Stopwords to filter out
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
 * Normalize department name
 */
function normalizeName(rawName) {
  return rawName
    .trim()
    .replace(/[\/\-,\(\)&]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^(Departemen|Department|Departement)\s+/i, '')
    .trim();
}

/**
 * Generate searchable keywords
 */
function generateKeywords(name) {
  const normalized = name.toLowerCase();
  const words = normalized.match(/\w+/g) || [];
  
  const keywords = words.filter(
    (word) => word.length > 2 && !STOPWORDS.has(word)
  );

  const fullKeyword = normalized.replace(/\s+/g, '_');
  if (fullKeyword.length > 2) {
    keywords.push(fullKeyword);
  }

  return [...new Set(keywords)];
}

/**
 * Categorize department with real estate and business domain knowledge
 * Order matters: more specific categories first
 */
function categorize(name) {
  const lower = name.toLowerCase();

  // Outsourcing & Third Party (check very early)
  if (
    lower.includes('outsource') ||
    lower.includes('third party') ||
    lower.includes('pihak ketiga') ||
    lower.includes('vendor') ||
    lower.includes('suplemen')
  ) {
    return 'Outsourcing & Third Party';
  }

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
    lower.includes('villa')
  ) {
    return 'Hospitality & F&B';
  }

  // IT & Technology (check before Audit to catch "Audit IT")
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

  // Audit & Risk Management (after IT check)
  if (
    lower.includes('audit') ||
    lower.includes('risk') ||
    lower.includes('risiko') ||
    lower.match(/\bapu\b/) ||
    lower.match(/\bppt\b/) ||
    lower.includes('internal control')
  ) {
    return 'Audit & Risk';
  }

  // Finance & Accounting
  if (
    lower.includes('finance') ||
    lower.includes('keuangan') ||
    lower.includes('accounting') ||
    lower.match(/\bfad\b/) ||
    lower.includes('treasury') ||
    lower.includes('investasi') ||
    lower.includes('investment')
  ) {
    return 'Finance';
  }

  // HR & People Management
  if (
    lower.match(/\bhr\b/) ||
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
    lower.includes('building') ||
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
    lower.match(/\bqs\b/) ||
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

  // Planning & Development
  if (
    lower.includes('perencanaan') ||
    lower.includes('planning') ||
    lower.includes('development') ||
    lower.match(/\bfsd\b/) ||
    lower.match(/\bfdd\b/)
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
    lower.match(/\bicd\b/) ||
    lower.includes('penunjang') ||
    lower.match(/\bfeh\b/) ||
    lower.includes('environmental health')
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
    lower.includes('sortasi') ||
    lower.includes('penerimaan')
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
    lower.includes('biro')
  ) {
    return 'Academic & Administration';
  }

  // Operations & General Affairs (check last as it's most general)
  if (
    lower.includes('operation') ||
    lower.includes('operasi') ||
    lower.includes('umum') ||
    lower.includes('general affairs') ||
    lower.match(/\bga\b/) ||
    lower.includes('housekeeping') ||
    lower.includes('house keeping') ||
    lower.includes('front office') ||
    lower.includes('customer service') ||
    lower.includes('layanan pelanggan') ||
    lower.includes('pusat layanan')
  ) {
    return 'Operations';
  }

  // Catch-all for unknown departments
  return 'Other';
}

/**
 * Main processing function
 */
async function normalizeDepartments() {
  console.log('🔍 Fetching all audit results...');
  
  const auditResultsSnapshot = await db.collection('audit-results').get();
  console.log(`📊 Found ${auditResultsSnapshot.size} audit results`);

  // Collect all unique raw department names
  const rawDepartments = new Set();
  auditResultsSnapshot.forEach((doc) => {
    const dept = doc.data().department;
    if (dept && dept.trim()) {
      rawDepartments.add(dept.trim());
    }
  });

  console.log(`📋 Found ${rawDepartments.size} unique raw department names`);

  // Group by normalized name
  const departmentMap = new Map();
  
  for (const rawName of rawDepartments) {
    const normalized = normalizeName(rawName);
    
    if (!departmentMap.has(normalized)) {
      departmentMap.set(normalized, {
        name: normalized,
        originalNames: [],
        keywords: generateKeywords(normalized),
        category: categorize(normalized),
      });
    }
    
    departmentMap.get(normalized).originalNames.push(rawName);
  }

  console.log(`✨ Normalized to ${departmentMap.size} unique departments`);

  // Write to Firestore
  const batch = db.batch();
  const departmentsRef = db.collection('departments');
  let count = 0;

  for (const [normalized, deptData] of departmentMap) {
    const docRef = departmentsRef.doc();
    batch.set(docRef, {
      ...deptData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    count++;

    // Commit in batches of 500
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`💾 Saved ${count} departments...`);
    }
  }

  // Commit remaining
  if (count % 500 !== 0) {
    await batch.commit();
  }

  console.log(`✅ Successfully normalized and indexed ${count} departments`);

  // Print summary by category
  console.log('\n📊 Department Summary by Category:');
  const categoryCount = new Map();
  for (const dept of departmentMap.values()) {
    categoryCount.set(dept.category, (categoryCount.get(dept.category) || 0) + 1);
  }
  
  for (const [category, count] of [...categoryCount.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${category}: ${count}`);
  }

  // Show some examples
  console.log('\n🔍 Sample Normalized Departments:');
  let sampleCount = 0;
  for (const [normalized, data] of departmentMap) {
    if (sampleCount++ >= 10) break;
    console.log(`   "${normalized}" [${data.category}]`);
    console.log(`      Original: ${data.originalNames.join(', ')}`);
    console.log(`      Keywords: ${data.keywords.join(', ')}`);
  }
}

// Run the script
normalizeDepartments()
  .then(() => {
    console.log('\n✅ Department normalization complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
