#!/usr/bin/env node

/**
 * Upload Projects from projects-export.xlsx to Firebase
 * 
 * This script reads projects-export.xlsx and uploads to Firestore 'projects' collection.
 * Uses Firebase Admin SDK to bypass security rules.
 * 
 * File location: C:\Users\IA-GERALDI\WORKPAPER\Proyek\Ongoing\IA2025\FIRST-AID\projects-export.xlsx
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
 * Generate base initials from project name (3-4 characters)
 */
function generateBaseInitials(projectName) {
  const cleaned = projectName.replace(/[^a-zA-Z0-9]/g, '');
  const initials = cleaned.substring(0, 4).toUpperCase();
  return initials.padEnd(3, 'X');
}

/**
 * Generate unique initials by checking against used initials
 */
function generateUniqueInitials(projectName, usedInitials) {
  const baseInitials = generateBaseInitials(projectName);
  
  if (!usedInitials.has(baseInitials)) {
    return baseInitials;
  }
  
  for (let i = 1; i <= 99; i++) {
    const candidate = baseInitials + i;
    if (!usedInitials.has(candidate)) {
      return candidate;
    }
  }
  
  const hash = Math.abs(projectName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  return baseInitials + (hash % 1000);
}

/**
 * Upload projects from Excel
 */
async function uploadProjects() {
  console.log('📊 Starting project upload from projects-export.xlsx...\n');

  // Track used initials for uniqueness
  const usedInitials = new Set();
  
  // Load existing initials from database
  const existingProjectsSnapshot = await db.collection('projects').get();
  existingProjectsSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.initials) {
      usedInitials.add(data.initials);
    }
  });
  
  console.log(`📋 Found ${usedInitials.size} existing initials in database\n`);

  // Read Excel file from specified path
  const excelPath = join(__dirname, '..', 'projects-export.xlsx');

  let workbook;
  try {
    console.log(`📂 Reading file: ${excelPath}`);
    const buffer = readFileSync(excelPath);
    workbook = XLSX.read(buffer, { type: 'buffer' });
    console.log('✅ File read successfully!');
  } catch (error) {
    console.error('\n❌ Cannot read Excel file:', error.message);
    console.error('\nPlease make sure:');
    console.error('   1. The file "projects-export.xlsx" exists in the project root');
    console.error('   2. The file is NOT open in Excel');
    console.error('   3. You have read permissions\n');
    throw error;
  }

  // Get first sheet (assuming projects are in the first sheet)
  const sheetName = workbook.SheetNames[0];
  console.log(`📄 Reading sheet: ${sheetName}`);
  
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`📋 Found ${data.length} projects in Excel\n`);

  let imported = 0;
  let skipped = 0;
  let updated = 0;

  for (const row of data) {
    try {
      // Map Excel columns - adjust these based on your actual column names
      const sh = row['SH'] || row['sh'] || '';
      const projectName = row['Project'] || row['project'] || row['projectName'] || '';
      const type = row['Type'] || row['type'] || row['projectType'] || '';
      const subtype = row['Subtype'] || row['subtype'] || '';
      const description = row['Description'] || row['description'] || '';
      const initials = row['Initials'] || row['initials'] || '';

      // Extract stats from Excel
      const excelTotal = parseInt(row['Total'] || row['total'] || '0');
      const excelFinding = parseInt(row['Finding'] || row['finding'] || '0');
      const excelNonFinding = parseInt(row['Non-Finding'] || row['non-finding'] || row['nonFinding'] || '0');

      // Skip if essential fields are missing
      if (!sh || !projectName) {
        console.log(`⚠️  Skipping row - missing SH or Project name`);
        skipped++;
        continue;
      }

      const projectType = type || 'Audit';
      const projectId = generateProjectId(sh, projectName, projectType);
      
      // Use existing initials or generate new ones
      let finalInitials = initials;
      if (!finalInitials) {
        finalInitials = generateUniqueInitials(projectName, usedInitials);
      }
      usedInitials.add(finalInitials);

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
        initials: finalInitials,
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
        console.log(`✅ Updated: ${projectName} (${finalInitials}) - ID: ${projectId}`);
        updated++;
      } else {
        // Create new project
        projectData.createdAt = admin.firestore.Timestamp.now();
        projectData.createdBy = 'excel-import';

        await projectsRef.add(projectData);
        console.log(`✨ Created: ${projectName} (${finalInitials}) - ID: ${projectId}`);
        imported++;
      }

    } catch (error) {
      console.error(`❌ Error processing row:`, error.message);
      skipped++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Upload Summary:');
  console.log(`   ✨ Created: ${imported}`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
  console.log(`   📋 Total: ${data.length}`);
  console.log('='.repeat(60));
}

// Run upload
uploadProjects()
  .then(() => {
    console.log('\n✅ Upload completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Upload failed:', error);
    process.exit(1);
  });
