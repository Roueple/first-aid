#!/usr/bin/env node

/**
 * Import Projects from Excel using Firebase Admin SDK
 * 
 * This script uses Admin SDK which bypasses Firestore security rules.
 * Reads the "Proyek" sheet from project.xlsx and imports to Firestore.
 */

import admin from 'firebase-admin';
import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceAccountKey.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});

const db = admin.firestore();

/**
 * Generate a 7-digit project ID from SH-ProjectName-Type
 */
function generateProjectId(sh, projectName, projectType) {
  const combined = `${sh}-${projectName}-${projectType}`;

  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const positiveHash = Math.abs(hash);
  const sevenDigit = (positiveHash % 9000000) + 1000000;

  return sevenDigit.toString();
}

/**
 * Import projects from Excel
 */
async function importProjects() {
  console.log('📊 Starting project import from Excel (Admin SDK)...\n');

  // Read Excel file
  const excelPath = join(__dirname, '..', 'project.xlsx');

  let workbook;
  try {
    console.log(`📂 Reading file: ${excelPath}`);
    const buffer = readFileSync(excelPath);
    workbook = XLSX.read(buffer, { type: 'buffer' });
    console.log('✅ File read successfully!');
  } catch (error) {
    console.error('\n❌ Cannot read Excel file:', error.message);
    throw error;
  }

  // Get "Proyek" sheet
  const sheetName = 'Proyek';
  if (!workbook.SheetNames.includes(sheetName)) {
    console.error(`❌ Sheet "${sheetName}" not found in Excel file`);
    console.log('Available sheets:', workbook.SheetNames);
    return;
  }

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`📋 Found ${data.length} projects in Excel\n`);

  let imported = 0;
  let skipped = 0;
  let updated = 0;

  for (const row of data) {
    try {
      // Map Excel columns
      const sh = row['SH'] || row['sh'] || '';
      const projectName = row['Project'] || row['project'] || '';
      const type = row['Type'] || row['type'] || '';
      const subtype = row['Subtype'] || row['subtype'] || '';
      const description = row['Description'] || row['description'] || '';

      // Extract stats from Excel
      const excelTotal = parseInt(row['Total'] || row['total'] || '0');
      const excelFinding = parseInt(row['Finding'] || row['finding'] || '0');
      const excelNonFinding = parseInt(row['Non-Finding'] || row['non-finding'] || '0');

      // Skip if essential fields are missing
      if (!sh || !projectName) {
        console.log(`⚠️  Skipping row - missing SH or Project name`);
        skipped++;
        continue;
      }

      const projectType = type || 'Audit';
      const projectId = generateProjectId(sh, projectName, projectType);

      // Check if project already exists
      const projectsRef = db.collection('projects');
      const existingQuery = await projectsRef
        .where('projectName', '==', projectName)
        .get();

      const projectData = {
        projectId,
        sh,
        projectName,
        projectType,
        subtype: subtype || '',
        description: description || '',
        total: excelTotal,
        finding: excelFinding,
        nonFinding: excelNonFinding,
        isActive: true,
        updatedAt: admin.firestore.Timestamp.now(),
      };

      if (!existingQuery.empty) {
        // Update existing project
        const docId = existingQuery.docs[0].id;
        await projectsRef.doc(docId).update(projectData);
        console.log(`✅ Updated: ${projectName} (ID: ${projectId})`);
        updated++;
      } else {
        // Create new project
        projectData.createdAt = admin.firestore.Timestamp.now();
        projectData.createdBy = 'excel-import';

        await projectsRef.add(projectData);
        console.log(`✨ Created: ${projectName} (ID: ${projectId})`);
        imported++;
      }

    } catch (error) {
      console.error(`❌ Error processing row:`, error.message);
      skipped++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Import Summary:');
  console.log(`   ✨ Created: ${imported}`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
  console.log(`   📋 Total: ${data.length}`);
  console.log('='.repeat(60));
}

// Run import
importProjects()
  .then(() => {
    console.log('\n✅ Import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });
