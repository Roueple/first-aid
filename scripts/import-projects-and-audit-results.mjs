#!/usr/bin/env node

/**
 * Import Projects and Audit Results from Excel
 * 
 * This script imports:
 * 1. Projects from projects-export.xlsx
 * 2. Audit results from audit-result.xlsx
 * 
 * Relationship: projectName (projects) = "Project Name" (audit-results)
 * 
 * For each project, calculates:
 * - finding: count of audit results where code = 'F'
 * - nonFinding: count of audit results where code = 'NF'
 * - total: finding + nonFinding
 */

import admin from 'firebase-admin';
import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
const serviceAccountPath = join(__dirname, '..', 'serviceaccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
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
 * Generate unique initials
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
 * Generate SHA-256 hash for audit result unique ID
 */
function generateAuditResultHash(year, sh, projectName, department, riskArea, descriptions, code) {
  const combined = `${year}|${sh}|${projectName}|${department}|${riskArea}|${descriptions}|${code}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

/**
 * Step 1: Import Projects from projects-export.xlsx
 */
async function importProjects() {
  console.log('📊 Step 1: Importing projects from projects-export.xlsx...\n');

  const excelPath = join(__dirname, '..', 'projects-export.xlsx');
  
  let workbook;
  try {
    // Try multiple read methods for Windows compatibility
    try {
      workbook = XLSX.readFile(excelPath);
    } catch (err1) {
      console.log('⚠️  Standard read failed, trying buffer method...');
      const fs = await import('fs');
      const buffer = fs.readFileSync(excelPath);
      workbook = XLSX.read(buffer, { type: 'buffer' });
    }
  } catch (error) {
    console.error('❌ Cannot read projects-export.xlsx');
    console.error('   Make sure the file exists and is not open in Excel');
    throw error;
  }

  // Use "projects" sheet
  const sheetName = 'projects';
  if (!workbook.SheetNames.includes(sheetName)) {
    console.error(`❌ Sheet "${sheetName}" not found`);
    console.log('Available sheets:', workbook.SheetNames);
    throw new Error(`Sheet "${sheetName}" not found`);
  }
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  console.log(`📋 Found ${data.length} projects in Excel\n`);

  const usedInitials = new Set();
  const projectMap = new Map(); // projectName -> projectId
  let imported = 0;
  let updated = 0;

  for (const row of data) {
    try {
      const sh = row['sh'] || row['SH'] || '';
      const projectName = row['projectName'] || row['Project Name'] || '';
      const type = row['type'] || row['Type'] || 'Audit';
      const subtype = row['subtype'] || row['Subtype'] || '';
      const description = row['description'] || row['Description'] || '';

      if (!sh || !projectName) {
        console.log(`⚠️  Skipping project - missing SH or Project Name`);
        continue;
      }

      const projectId = generateProjectId(sh, projectName, type);
      const initials = generateUniqueInitials(projectName, usedInitials);
      usedInitials.add(initials);
      projectMap.set(projectName, projectId);

      // Check if project exists
      const projectsRef = db.collection('projects');
      const existingQuery = await projectsRef
        .where('projectId', '==', projectId)
        .limit(1)
        .get();

      const projectData = {
        projectId,
        sh,
        projectName,
        projectType: type,
        initials,
        type,
        subtype,
        description,
        finding: 0, // Will be calculated after audit results import
        nonFinding: 0,
        total: 0,
        isActive: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (!existingQuery.empty) {
        const docId = existingQuery.docs[0].id;
        await projectsRef.doc(docId).update(projectData);
        console.log(`✅ Updated: ${projectName} (${initials})`);
        updated++;
      } else {
        projectData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        projectData.createdBy = 'excel-import';
        await projectsRef.add(projectData);
        console.log(`✨ Created: ${projectName} (${initials})`);
        imported++;
      }

    } catch (error) {
      console.error(`❌ Error processing project:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Projects Import Summary:');
  console.log(`   ✨ Created: ${imported}`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log('='.repeat(60) + '\n');

  return projectMap;
}

/**
 * Step 2: Import Audit Results from audit-result.xlsx
 */
async function importAuditResults(projectMap) {
  console.log('📊 Step 2: Importing audit results from audit-result.xlsx...\n');

  const excelPath = join(__dirname, '..', 'audit-result.xlsx');
  
  let workbook;
  try {
    // Try multiple read methods for Windows compatibility
    try {
      workbook = XLSX.readFile(excelPath);
    } catch (err1) {
      console.log('⚠️  Standard read failed, trying buffer method...');
      const fs = await import('fs');
      const buffer = fs.readFileSync(excelPath);
      workbook = XLSX.read(buffer, { type: 'buffer' });
    }
  } catch (error) {
    console.error('❌ Cannot read audit-result.xlsx');
    console.error('   Make sure the file exists and is not open in Excel');
    throw error;
  }

  // Use "Audit Results" sheet
  const sheetName = 'Audit Results';
  if (!workbook.SheetNames.includes(sheetName)) {
    console.error(`❌ Sheet "${sheetName}" not found`);
    console.log('Available sheets:', workbook.SheetNames);
    throw new Error(`Sheet "${sheetName}" not found`);
  }
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  console.log(`📋 Found ${data.length} audit results in Excel\n`);

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of data) {
    try {
      const year = parseInt(row['Year']) || 0;
      const sh = row['SH'] || '';
      const projectName = row['Project Name'] || '';
      const department = row['Department'] || '';
      const riskArea = row['Risk Area'] || '';
      const descriptions = row['Description'] || row['Descriptions'] || '';
      const code = row['Code'] || '';
      const bobot = parseFloat(row['Bobot']) || 0;
      const kadar = parseFloat(row['Kadar']) || 0;
      const nilai = bobot * kadar;

      if (!sh || !projectName) {
        skipped++;
        continue;
      }

      // Generate unique ID using SHA-256
      const auditResultId = generateAuditResultHash(year, sh, projectName, department, riskArea, descriptions, code);
      
      // Get linked project ID
      const projectId = projectMap.get(projectName) || null;

      // Check if audit result exists
      const auditResultsRef = db.collection('audit-results');
      const existingQuery = await auditResultsRef
        .where('auditResultId', '==', auditResultId)
        .limit(1)
        .get();

      const auditResultData = {
        auditResultId,
        year,
        sh,
        projectName,
        projectId,
        department,
        riskArea,
        descriptions,
        code,
        bobot,
        kadar,
        nilai,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (!existingQuery.empty) {
        const docId = existingQuery.docs[0].id;
        await auditResultsRef.doc(docId).update(auditResultData);
        updated++;
      } else {
        auditResultData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        auditResultData.createdBy = 'excel-import';
        await auditResultsRef.add(auditResultData);
        imported++;
      }

      // Progress indicator every 100 records
      if ((imported + updated) % 100 === 0) {
        console.log(`   Processed ${imported + updated} audit results...`);
      }

    } catch (error) {
      console.error(`❌ Error processing audit result:`, error.message);
      skipped++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Audit Results Import Summary:');
  console.log(`   ✨ Created: ${imported}`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Step 3: Calculate counts for each project
 */
async function calculateProjectCounts() {
  console.log('📊 Step 3: Calculating finding counts for each project...\n');

  const projectsRef = db.collection('projects');
  const projectsSnapshot = await projectsRef.get();

  let processed = 0;

  for (const projectDoc of projectsSnapshot.docs) {
    const projectData = projectDoc.data();
    const projectName = projectData.projectName;

    // Count audit results for this project
    const auditResultsRef = db.collection('audit-results');
    const auditResultsSnapshot = await auditResultsRef
      .where('projectName', '==', projectName)
      .get();

    let findingCount = 0;
    let nonFindingCount = 0;

    auditResultsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.code === 'F') {
        findingCount++;
      } else if (data.code === 'NF') {
        nonFindingCount++;
      }
    });

    const total = findingCount + nonFindingCount;

    // Update project with counts
    await projectsRef.doc(projectDoc.id).update({
      finding: findingCount,
      nonFinding: nonFindingCount,
      total: total,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ ${projectName}: F=${findingCount}, NF=${nonFindingCount}, Total=${total}`);
    processed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Count Calculation Summary:');
  console.log(`   ✅ Processed: ${processed} projects`);
  console.log('='.repeat(60));
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting import process...\n');
  console.log('This will:');
  console.log('1. Import projects from projects-export.xlsx');
  console.log('2. Import audit results from audit-result.xlsx');
  console.log('3. Calculate F/NF counts for each project\n');
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: Import projects
    const projectMap = await importProjects();

    // Step 2: Import audit results
    await importAuditResults(projectMap);

    // Step 3: Calculate counts
    await calculateProjectCounts();

    console.log('\n✅ Import completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

main();
