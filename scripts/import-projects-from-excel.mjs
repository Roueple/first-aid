#!/usr/bin/env node

/**
 * Import Projects from Excel (Proyek sheet)
 * 
 * This script reads the "Proyek" sheet from raw_data.xlsx and imports projects
 * into the Firestore 'projects' collection.
 * 
 * Excel columns: No, SH, Project, Total Finding, Non-Finding, Type, Subtype, Description
 * 
 * Note: Total Finding and Non-Finding will be recalculated from actual findings data
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, connectAuthEmulator } from 'firebase/auth';
import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Initialize Firebase with client SDK
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Connect to emulator if using local development
if (process.env.VITE_USE_EMULATOR === 'true') {
  console.log('🔧 Connecting to Firebase Emulator...');
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
}

/**
 * Generate a 7-digit project ID from SH-ProjectName-Type
 */
function generateProjectId(sh, projectName, projectType) {
  const combined = `${sh}-${projectName}-${projectType}`;

  // Create a simple hash
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to positive 7-digit number
  const positiveHash = Math.abs(hash);
  const sevenDigit = (positiveHash % 9000000) + 1000000; // Ensures 7 digits (1000000-9999999)

  return sevenDigit.toString();
}

/**
 * Generate base initials from project name (3-4 characters)
 * Simple rule: Take first 3-4 letters from the name
 */
function generateBaseInitials(projectName) {
  // Remove all non-alphanumeric characters
  const cleaned = projectName.replace(/[^a-zA-Z0-9]/g, '');
  
  // Take first 4 letters (or less if name is shorter)
  const initials = cleaned.substring(0, 4).toUpperCase();
  
  // Ensure at least 3 characters
  return initials.padEnd(3, 'X');
}

/**
 * Generate unique initials by checking against used initials
 */
async function generateUniqueInitials(projectName, usedInitials) {
  const baseInitials = generateBaseInitials(projectName);
  
  // Check if base initials are unique
  if (!usedInitials.has(baseInitials)) {
    return baseInitials;
  }
  
  // If collision, append number (1-99)
  for (let i = 1; i <= 99; i++) {
    const candidate = baseInitials + i;
    
    if (!usedInitials.has(candidate)) {
      return candidate;
    }
  }
  
  // Fallback: use hash if all numbers exhausted
  const hash = Math.abs(projectName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  return baseInitials + (hash % 1000);
}

/**
 * Count findings for a project
 */
async function countFindings(projectName) {
  try {
    const findingsRef = collection(db, 'findings');
    const q = query(findingsRef, where('projectName', '==', projectName));
    const findingsSnapshot = await getDocs(q);

    let totalFinding = 0;
    let nonFinding = 0;

    findingsSnapshot.forEach(doc => {
      const data = doc.data();
      // Count as finding if it has a findingTotal > 0
      if (data.findingTotal && data.findingTotal > 0) {
        totalFinding++;
      } else {
        nonFinding++;
      }
    });

    return { totalFinding, nonFinding, total: findingsSnapshot.size };
  } catch (error) {
    console.error(`Error counting findings for ${projectName}:`, error);
    return { totalFinding: 0, nonFinding: 0, total: 0 };
  }
}

/**
 * Authenticate user before import
 */
async function authenticate() {
  try {
    // Load test credentials
    const credPath = join(__dirname, '..', '.test-credentials.json');
    const credentials = JSON.parse(readFileSync(credPath, 'utf8'));
    
    console.log('🔐 Authenticating...');
    await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    console.log('✅ Authentication successful!\n');
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    console.error('\nPlease make sure:');
    console.error('1. Firebase emulator is running (npm run emulator)');
    console.error('2. Or you have valid credentials in .test-credentials.json');
    throw error;
  }
}

/**
 * Import projects from Excel
 */
async function importProjects() {
  console.log('📊 Starting project import from Excel...\n');

  // Track used initials for uniqueness
  const usedInitials = new Set();
  
  // Load existing initials from database
  const existingProjectsSnapshot = await getDocs(collection(db, 'projects'));
  existingProjectsSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.initials) {
      usedInitials.add(data.initials);
    }
  });
  
  console.log(`📋 Found ${usedInitials.size} existing initials in database\n`);

  // Read Excel file
  const excelPath = join(__dirname, '..', 'project.xlsx');

  let workbook;
  try {
    // Try reading with different options for Windows compatibility
    console.log(`📂 Reading file: ${excelPath}`);
    
    // First try: standard read
    try {
      workbook = XLSX.readFile(excelPath);
    } catch (err1) {
      console.log('⚠️  Standard read failed, trying with cellDates option...');
      // Second try: with cellDates option
      try {
        workbook = XLSX.readFile(excelPath, { cellDates: true });
      } catch (err2) {
        console.log('⚠️  cellDates read failed, trying with FS option...');
        // Third try: read as buffer first
        const fs = await import('fs');
        const buffer = fs.readFileSync(excelPath);
        workbook = XLSX.read(buffer, { type: 'buffer' });
      }
    }
    
    console.log('✅ File read successfully!');
  } catch (error) {
    console.error('\n❌ Cannot read Excel file. Please make sure:');
    console.error('   1. The file "project.xlsx" exists in the project root');
    console.error('   2. The file is NOT open in Excel or another program');
    console.error('   3. You have read permissions for the file');
    console.error('   4. Try closing Excel completely and run the script again\n');
    console.error('Error details:', error.message);
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
      // Map Excel columns to project fields
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

      // Determine projectType (assuming it's the same as 'type' or default to 'Audit')
      const projectType = type || 'Audit';

      // Generate 7-digit project ID
      const projectId = generateProjectId(sh, projectName, projectType);
      
      // Generate unique 3-character initials
      const initials = await generateUniqueInitials(projectName, usedInitials);
      usedInitials.add(initials); // Track for next iteration

      // Use Excel data for initial import
      // We'll recalculate from actual findings later using recalculate-project-stats.mjs
      const total = excelTotal;
      const totalFinding = excelFinding;
      const nonFinding = excelNonFinding;

      // Check if project already exists
      const projectsRef = collection(db, 'projects');
      const q = query(projectsRef, where('projectName', '==', projectName));
      const existingQuery = await getDocs(q);

      const projectData = {
        projectId,
        sh,
        projectName,
        projectType,
        initials,
        type: type || projectType,
        subtype: subtype || '',
        description: description || '',
        total: total,
        finding: totalFinding,
        nonFinding: nonFinding,
        isActive: true,
        updatedAt: Timestamp.now(),
      };

      if (!existingQuery.empty) {
        // Update existing project
        const docId = existingQuery.docs[0].id;
        const docRef = doc(db, 'projects', docId);
        await updateDoc(docRef, projectData);
        console.log(`✅ Updated: ${projectName} (${initials}) - ID: ${projectId}`);
        updated++;
      } else {
        // Create new project
        projectData.createdAt = Timestamp.now();
        projectData.createdBy = 'excel-import';

        await addDoc(collection(db, 'projects'), projectData);
        console.log(`✨ Created: ${projectName} (${initials}) - ID: ${projectId}`);
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

// Run import with authentication
authenticate()
  .then(() => importProjects())
  .then(() => {
    console.log('\n✅ Import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });
