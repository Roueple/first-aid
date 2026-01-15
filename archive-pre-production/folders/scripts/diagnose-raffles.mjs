#!/usr/bin/env node

/**
 * Diagnose why Hotel Raffles Jakarta has 0 counts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync('./serviceaccountKey.json', 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function diagnose() {
  console.log('🔍 Diagnosing Hotel Raffles Jakarta...\n');

  // Get the project
  const projectsSnapshot = await db
    .collection('projects')
    .where('projectName', '==', 'Hotel Raffles Jakarta')
    .get();

  if (projectsSnapshot.empty) {
    console.log('❌ Project not found in projects table');
    return;
  }

  const projectDoc = projectsSnapshot.docs[0];
  const project = projectDoc.data();

  console.log('📊 Project data:');
  console.log('  ID:', projectDoc.id);
  console.log('  projectName:', project.projectName);
  console.log('  projectName type:', typeof project.projectName);
  console.log('  projectName length:', project.projectName.length);
  console.log('  finding:', project.finding);
  console.log('  nonFinding:', project.nonFinding);
  console.log('  total:', project.total);
  console.log();

  // Get audit results using exact match
  console.log('🔍 Querying audit-results with exact match...');
  const auditResultsSnapshot = await db
    .collection('audit-results')
    .where('projectName', '==', 'Hotel Raffles Jakarta')
    .get();

  console.log('  Found:', auditResultsSnapshot.size, 'records');
  console.log();

  // Try with the project's actual projectName value
  console.log('🔍 Querying audit-results with project.projectName value...');
  const auditResultsSnapshot2 = await db
    .collection('audit-results')
    .where('projectName', '==', project.projectName)
    .get();

  console.log('  Found:', auditResultsSnapshot2.size, 'records');
  console.log();

  // Get a sample audit result to compare
  const sampleAuditSnapshot = await db
    .collection('audit-results')
    .limit(1)
    .get();

  if (!sampleAuditSnapshot.empty) {
    const sampleAudit = sampleAuditSnapshot.docs[0].data();
    
    // Find one with Raffles
    const rafflesSnapshot = await db
      .collection('audit-results')
      .limit(100)
      .get();

    const rafflesDoc = rafflesSnapshot.docs.find(doc => {
      const data = doc.data();
      return data.projectName && data.projectName.includes('Raffles');
    });

    if (rafflesDoc) {
      const rafflesData = rafflesDoc.data();
      console.log('📋 Sample audit-result with Raffles:');
      console.log('  ID:', rafflesDoc.id);
      console.log('  projectName:', rafflesData.projectName);
      console.log('  projectName type:', typeof rafflesData.projectName);
      console.log('  projectName length:', rafflesData.projectName.length);
      console.log('  code:', rafflesData.code);
      console.log();

      // Character-by-character comparison
      console.log('🔤 Character comparison:');
      console.log('  Project:', [...project.projectName].map((c, i) => `[${i}]='${c}' (${c.charCodeAt(0)})`).join(' '));
      console.log('  Audit:  ', [...rafflesData.projectName].map((c, i) => `[${i}]='${c}' (${c.charCodeAt(0)})`).join(' '));
      console.log();

      // Check if they're equal
      console.log('  Are they equal?', project.projectName === rafflesData.projectName);
      console.log('  Trimmed equal?', project.projectName.trim() === rafflesData.projectName.trim());
    }
  }

  // Count manually
  console.log('📊 Manual count from all audit-results:');
  const allAuditResults = await db.collection('audit-results').get();
  
  let findingCount = 0;
  let nonFindingCount = 0;
  const matchingDocs = [];

  allAuditResults.docs.forEach(doc => {
    const data = doc.data();
    if (data.projectName === 'Hotel Raffles Jakarta') {
      matchingDocs.push(doc.id);
      const code = (data.code || '').toUpperCase();
      if (code.startsWith('NF')) {
        nonFindingCount++;
      } else if (code.startsWith('F')) {
        findingCount++;
      }
    }
  });

  console.log('  Matching documents:', matchingDocs.length);
  console.log('  Findings:', findingCount);
  console.log('  Non-Findings:', nonFindingCount);
  console.log('  Total:', findingCount + nonFindingCount);
  console.log();

  if (matchingDocs.length > 0) {
    console.log('  Sample matching doc IDs:', matchingDocs.slice(0, 5));
  }
}

diagnose()
  .then(() => {
    console.log('✨ Diagnosis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
