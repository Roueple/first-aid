#!/usr/bin/env node

/**
 * Test DocAI Query: "show all IT findings 2024"
 * Compare DocAI results with expected database results
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

// Load expected results
const expectedResults = JSON.parse(
  readFileSync(join(__dirname, '..', 'test-results', 'it-findings-2024-2025-12-08T10-21-53-664Z.json'), 'utf8')
);

async function testDocAIQuery() {
  console.log('='.repeat(80));
  console.log('TESTING DOCAI QUERY: "show all IT findings 2024"');
  console.log('='.repeat(80));
  console.log();

  console.log(`Expected Results: ${expectedResults.length} IT findings`);
  console.log();

  // Simulate what DocAI should do:
  // 1. Parse query to extract: department=IT, year=2024
  // 2. Query audit-results with these filters
  // 3. Join with departments collection

  console.log('Executing DocAI-style query...');
  console.log();

  try {
    // Load departments map
    const deptSnapshot = await db.collection('departments').get();
    const deptMap = new Map();
    const itDepartmentNames = [];
    
    deptSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.name && data.category === 'IT') {
        deptMap.set(data.name, data.category);
        itDepartmentNames.push(data.name);
      }
    });

    console.log(`Found ${itDepartmentNames.length} IT departments:`);
    itDepartmentNames.forEach(name => console.log(`  - ${name}`));
    console.log();

    // Query audit-results for 2024
    const auditSnapshot = await db.collection('audit-results')
      .where('year', '==', '2024')
      .get();

    console.log(`Total audit results in 2024: ${auditSnapshot.size}`);
    console.log();

    // Filter for IT departments
    const docaiResults = [];
    auditSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const deptName = data.department;
      
      if (deptMap.has(deptName)) {
        docaiResults.push({
          id: doc.id,
          projectName: data.projectName,
          department: deptName,
          riskArea: data.riskArea,
          descriptions: data.descriptions,
          code: data.code,
          year: data.year,
          sh: data.sh
        });
      }
    });

    console.log('='.repeat(80));
    console.log('DOCAI QUERY RESULTS');
    console.log('='.repeat(80));
    console.log(`Found: ${docaiResults.length} IT findings`);
    console.log();

    if (docaiResults.length > 0) {
      docaiResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.projectName} (${result.sh})`);
        console.log(`   Department: ${result.department}`);
        console.log(`   Risk Area: ${result.riskArea.substring(0, 80)}...`);
        console.log(`   Code: ${result.code}`);
        console.log();
      });
    }

    // Compare results
    console.log('='.repeat(80));
    console.log('COMPARISON');
    console.log('='.repeat(80));
    console.log(`Expected: ${expectedResults.length} findings`);
    console.log(`DocAI:    ${docaiResults.length} findings`);
    console.log();

    if (expectedResults.length === docaiResults.length) {
      console.log('✓ COUNT MATCHES!');
      console.log();

      // Check if IDs match
      const expectedIds = new Set(expectedResults.map(r => r.id));
      const docaiIds = new Set(docaiResults.map(r => r.id));
      
      const missingInDocAI = expectedResults.filter(r => !docaiIds.has(r.id));
      const extraInDocAI = docaiResults.filter(r => !expectedIds.has(r.id));

      if (missingInDocAI.length === 0 && extraInDocAI.length === 0) {
        console.log('✓ ALL RECORDS MATCH!');
        console.log();
        console.log('SUCCESS: DocAI query returns correct results!');
      } else {
        console.log('✗ RECORD MISMATCH');
        if (missingInDocAI.length > 0) {
          console.log(`Missing in DocAI: ${missingInDocAI.length}`);
          missingInDocAI.forEach(r => console.log(`  - ${r.id}: ${r.projectName}`));
        }
        if (extraInDocAI.length > 0) {
          console.log(`Extra in DocAI: ${extraInDocAI.length}`);
          extraInDocAI.forEach(r => console.log(`  - ${r.id}: ${r.projectName}`));
        }
      }
    } else {
      console.log('✗ COUNT MISMATCH!');
      console.log();
      console.log('Difference:', docaiResults.length - expectedResults.length);
    }

    console.log();
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error executing DocAI query:', error);
    throw error;
  }
}

// Run the test
testDocAIQuery()
  .then(() => {
    console.log('Test completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
