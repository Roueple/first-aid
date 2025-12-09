#!/usr/bin/env node

/**
 * Check IT Findings 2024
 * Query all IT findings from 2024 with department and audit-result joins
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function getITFindings2024() {
  console.log('='.repeat(80));
  console.log('QUERYING IT FINDINGS 2024 FROM DATABASE');
  console.log('='.repeat(80));
  console.log();

  try {
    // Query audit-results for IT department in 2024
    const auditResultsRef = db.collection('audit-results');
    
    // Get all audit results for 2024 (year is stored as string)
    const snapshot = await auditResultsRef
      .where('year', '==', '2024')
      .get();

    console.log(`Total audit results in 2024: ${snapshot.size}`);
    console.log();

    // First, load all departments into a map for faster lookup
    console.log('Loading departments...');
    const deptSnapshot = await db.collection('departments').get();
    const deptMap = new Map();
    deptSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.name) {
        deptMap.set(data.name, data.category || 'Unknown');
      }
    });
    console.log(`Loaded ${deptMap.size} departments`);
    console.log();

    const itFindings = [];
    const departmentStats = {};
    const departmentNames = new Set();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Get department info - use department field directly from audit-results
      let departmentName = data.department || 'Unknown';
      let departmentCategory = deptMap.get(departmentName) || 'Unknown';
      
      departmentNames.add(departmentName);

      // Track department stats
      if (!departmentStats[departmentCategory]) {
        departmentStats[departmentCategory] = 0;
      }
      departmentStats[departmentCategory]++;

      // Check if this is an IT finding
      if (departmentCategory === 'IT' || departmentCategory === 'Information Technology') {
        itFindings.push({
          id: doc.id,
          projectName: data.projectName || 'N/A',
          department: departmentName,
          departmentCategory,
          riskArea: data.riskArea || 'N/A',
          descriptions: data.descriptions || 'N/A',
          code: data.code || 'N/A',
          year: data.year,
          sh: data.sh || 'N/A'
        });
      }
    }

    console.log(`Unique department names found: ${departmentNames.size}`);

    console.log('DEPARTMENT DISTRIBUTION:');
    console.log('-'.repeat(80));
    Object.entries(departmentStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`${category}: ${count}`);
      });
    console.log();

    console.log('='.repeat(80));
    console.log(`IT FINDINGS 2024: ${itFindings.length} results`);
    console.log('='.repeat(80));
    console.log();

    if (itFindings.length === 0) {
      console.log('No IT findings found for 2024.');
      console.log();
      console.log('This could mean:');
      console.log('1. No audit results have IT department category');
      console.log('2. Department normalization needs to be run');
      console.log('3. Department links are missing');
      return;
    }

    // Display findings
    itFindings.forEach((finding, index) => {
      console.log(`${index + 1}. ${finding.projectName} (${finding.sh})`);
      console.log(`   Department: ${finding.department} (${finding.departmentCategory})`);
      console.log(`   Risk Area: ${finding.riskArea.substring(0, 80)}${finding.riskArea.length > 80 ? '...' : ''}`);
      console.log(`   Code: ${finding.code}`);
      console.log();
    });

    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total IT Findings 2024: ${itFindings.length}`);
    console.log();

    // Save results to file for comparison
    const fs = await import('fs');
    const resultsFile = join(__dirname, '..', 'test-results', `it-findings-2024-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(itFindings, null, 2));
    console.log(`Results saved to: ${resultsFile}`);
    console.log();

    return itFindings;

  } catch (error) {
    console.error('Error querying IT findings:', error);
    throw error;
  }
}

// Run the query
getITFindings2024()
  .then(() => {
    console.log('Query completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Query failed:', error);
    process.exit(1);
  });
