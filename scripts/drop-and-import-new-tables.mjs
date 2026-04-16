#!/usr/bin/env node
import admin from 'firebase-admin';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(join(rootDir, 'serviceaccountKey.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

console.log('🔥 FIRST-AID Database Migration Tool\n');
console.log('This will:');
console.log('1. DROP existing projects and audit_results collections');
console.log('2. IMPORT new data from Project_Master.xlsx and Master_Audit_Data.xlsx\n');

// Step 1: Drop existing collections
async function dropCollection(collectionName) {
  console.log(`\n🗑️  Dropping ${collectionName} collection...`);
  const collectionRef = db.collection(collectionName);
  const batchSize = 500;
  let deletedCount = 0;

  async function deleteQueryBatch() {
    const snapshot = await collectionRef.limit(batchSize).get();
    if (snapshot.size === 0) return 0;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    deletedCount += snapshot.size;
    console.log(`   Deleted ${deletedCount} documents...`);

    return snapshot.size;
  }

  let numDeleted = 0;
  do {
    numDeleted = await deleteQueryBatch();
  } while (numDeleted > 0);

  console.log(`✅ Dropped ${collectionName}: ${deletedCount} documents deleted`);
  return deletedCount;
}

// Step 2: Import Projects
async function importProjects() {
  console.log('\n📊 Importing Project_Master...');

  const filePath = join(rootDir, 'Project_Master.xlsx');
  const buffer = readFileSync(filePath);
  const wb = XLSX.read(buffer);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws);

  console.log(`   Found ${data.length} projects to import`);

  let batch = db.batch();
  let count = 0;
  const batchSize = 500;

  for (const row of data) {
    const projectData = {
      // Core fields (Bernard compatibility)
      projectName: row.Proyek || '',
      sh: row.SH || '',
      tbk: row.TBK || '',
      industry: row.Indtr || '',
      category: row.Category || '',
      location: row.Location || '',
      tags: row.Tag ? row.Tag.split(',').map((t) => t.trim()) : [],

      // Additional fields from Excel
      auditedYears: row['Audited Years'] || '',

      // 2025 data
      grade2025: row['Grade 2025'] || '',
      total2025: parseInt(row['Total 2025']) || 0,
      f2025: parseInt(row['F 2025']) || 0,
      nf2025: parseInt(row['NF 2025']) || 0,

      // 2024 data
      grade2024: row['Grade 2024'] || '',
      total2024: parseInt(row['Total 2024']) || 0,
      f2024: parseInt(row['F 2024']) || 0,
      nf2024: parseInt(row['NF 2024']) || 0,

      // 2023 data
      grade2023: row['Grade 2023'] || '',
      total2023: parseInt(row['Total 2023']) || 0,
      f2023: parseInt(row['F 2023']) || 0,
      nf2023: parseInt(row['NF 2023']) || 0,

      // 2022 data
      grade2022: row['Grade 2022'] || '',
      total2022: parseInt(row['Total 2022']) || 0,
      f2022: parseInt(row['F 2022']) || 0,
      nf2022: parseInt(row['NF 2022']) || 0,

      // Historical grades (2021-2010)
      grade2021: row['Grade 2021'] || '',
      grade2020: row['Grade 2020'] || '',
      grade2019: row['Grade 2019'] || '',
      grade2018: row['Grade 2018'] || '',
      grade2017: row['Grade 2017'] || '',
      grade2016: row['Grade 2016'] || '',
      grade2015: row['Grade 2015'] || '',
      grade2014: row['Grade 2014'] || '',
      grade2013: row['Grade 2013'] || '',
      grade2012: row['Grade 2012'] || '',
      grade2011: row['Grade 2011'] || '',
      grade2010: row['Grade 2010'] || '',

      // Totals
      grandTotal: parseInt(row['Grand Total']) || 0,
      totalFindings: parseInt(row['Total Findings']) || 0,
      totalNF: parseInt(row['Total NF']) || 0,

      // Metadata
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      isActive: true,
    };

    const docRef = db.collection('projects').doc();
    batch.set(docRef, projectData);
    count++;

    if (count % batchSize === 0) {
      await batch.commit();
      console.log(`   Imported ${count} projects...`);
      batch = db.batch(); // Create new batch after commit
    }
  }

  if (count % batchSize !== 0) {
    await batch.commit();
  }

  console.log(`✅ Imported ${count} projects`);
  return count;
}

// Step 3: Import Audit Results (1:1 mirror of Master_Audit_Data.xlsx)
async function importAuditResults() {
  console.log('\n📊 Importing Master_Audit_Data...');

  const filePath = join(rootDir, 'Master_Audit_Data.xlsx');
  const buffer = readFileSync(filePath);
  const wb = XLSX.read(buffer);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws);

  console.log(`   Found ${data.length} audit results to import`);

  let count = 0;
  const batchSize = 500;
  let batch = db.batch();

  for (const row of data) {
    /**
     * 1:1 mapping from Excel columns to Firestore fields:
     *
     * Excel Column          → Firestore Field
     * ─────────────────────────────────────────
     * Unique ID             → auditResultId
     * Filename              → filename
     * Proyek                → proyek
     * Category              → category
     * Subholding            → subholding
     * Year                  → year
     * Department            → department
     * Department(ori)       → departmentOri
     * Risk Area             → riskArea
     * Deskripsi             → deskripsi
     * Kode                  → kode
     * Bobot                 → bobot
     * Kadar                 → kadar
     * Nilai                 → nilai
     * Kategori              → kategori
     * Temuan Ulangan Count  → temuanUlanganCount
     */
    const auditData = {
      // All 16 columns from Master_Audit_Data.xlsx - 1:1 mirror
      auditResultId: row['Unique ID'] || '',
      filename: row.Filename || '',
      proyek: row.Proyek || '',
      category: row.Category || '',
      subholding: row.Subholding || '',
      year: parseInt(row.Year) || 0,
      department: row.Department || '',
      departmentOri: row['Department(ori)'] || '',
      riskArea: row['Risk Area'] || '',
      deskripsi: row.Deskripsi || '',
      kode: row.Kode || '',
      bobot: parseFloat(row.Bobot) || 0,
      kadar: parseFloat(row.Kadar) || 0,
      nilai: parseFloat(row.Nilai) || 0,
      kategori: row.Kategori || null,
      temuanUlanganCount: parseInt(row['Temuan Ulangan Count']) || 0,

      // Firestore metadata
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    const docRef = db.collection('audit_results').doc();
    batch.set(docRef, auditData);
    count++;

    if (count % batchSize === 0) {
      await batch.commit();
      console.log(`   Imported ${count} audit results...`);
      batch = db.batch();
    }
  }

  if (count % batchSize !== 0) {
    await batch.commit();
  }

  console.log(`✅ Imported ${count} audit results`);
  return count;
}

// Main execution
async function main() {
  try {
    // Step 1: Drop old collections
    await dropCollection('projects');
    await dropCollection('audit_results');

    // Step 2: Import new data
    const projectsCount = await importProjects();
    const auditCount = await importAuditResults();

    console.log('\n✅ Migration Complete!');
    console.log(`   Projects: ${projectsCount}`);
    console.log(`   Audit Results: ${auditCount}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
