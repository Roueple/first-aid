#!/usr/bin/env node
import admin from 'firebase-admin';
import XLSX from 'xlsx';
import { createHash } from 'crypto';
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
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log('🔥 FIRST-AID Database Migration Tool\n');
console.log('This will:');
console.log('1. DROP existing projects and audit_results collections');
console.log('2. IMPORT new data from Master Proyek.xlsx and master_audit_2022_2025.xlsx\n');

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
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
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
  console.log('\n📊 Importing Master Proyek...');
  
  const filePath = join(rootDir, 'Master Proyek.xlsx');
  const buffer = readFileSync(filePath);
  const wb = XLSX.read(buffer);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws);

  console.log(`   Found ${data.length} projects to import`);

  const batch = db.batch();
  let count = 0;
  const batchSize = 500;

  for (const row of data) {
    const projectData = {
      projectName: row.Proyek || '',
      sh: row.SH || '',
      tbk: row.TBK || '',
      industry: row.Indtr || '',
      category: row.Category || '',
      location: row.Location || '',
      tags: row.Tag ? row.Tag.split(',').map(t => t.trim()) : [],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      isActive: true
    };

    const docRef = db.collection('projects').doc();
    batch.set(docRef, projectData);
    count++;

    if (count % batchSize === 0) {
      await batch.commit();
      console.log(`   Imported ${count} projects...`);
    }
  }

  if (count % batchSize !== 0) {
    await batch.commit();
  }

  console.log(`✅ Imported ${count} projects`);
  return count;
}

// Step 3: Import Audit Results
async function importAuditResults() {
  console.log('\n📊 Importing Master Audit...');
  
  const filePath = join(rootDir, 'master_audit_2022_2025.xlsx');
  const buffer = readFileSync(filePath);
  const wb = XLSX.read(buffer);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws);

  console.log(`   Found ${data.length} audit results to import`);

  let count = 0;
  const batchSize = 500;
  let batch = db.batch();

  for (const row of data) {
    // Generate unique ID using SHA-256
    const uniqueString = `${row.Proyek}-${row.Year}-${row.Departemen}-${row['Risk Area']}-${row.Deskripsi}`;
    const uniqueId = createHash('sha256').update(uniqueString).digest('hex').substring(0, 16);

    const auditData = {
      projectName: row.Proyek || '',
      subholding: row.Subholding || '',
      year: parseInt(row.Year) || 0,
      department: row.Departemen || '',
      riskArea: row['Risk Area'] || '',
      description: row.Deskripsi || '',
      code: row.Kode || '',
      weight: parseInt(row.Bobot) || 0,
      severity: parseInt(row.Kadar) || 0,
      value: parseInt(row.Nilai) || 0,
      isRepeat: parseInt(row['Temuan Ulangan']) || 0,
      uniqueId,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
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
