/**
 * Query All Findings - Debug Script
 * 
 * Queries all findings from production database to verify data exists
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';
import * as fs from 'fs';

// Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyBt1JoukjkIGvFhvEvf5B648QrvR41uKS8',
  authDomain: 'first-aid-101112.firebaseapp.com',
  projectId: 'first-aid-101112',
  storageBucket: 'first-aid-101112.firebasestorage.app',
  messagingSenderId: '162068922013',
  appId: '1:162068922013:web:24eff9fb9dee72744a1e74'
};

// Load test credentials
const credentials = JSON.parse(fs.readFileSync('.test-credentials.json', 'utf8'));

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function queryAllFindings() {
  console.log('\n🔍 Querying ALL findings from production database...\n');
  console.log('=' .repeat(80));
  
  try {
    // Authenticate with test credentials
    console.log(`Authenticating as ${credentials.email}...`);
    await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    console.log('✅ Authenticated\n');
    
    // Query all findings (no filters)
    console.log('Fetching findings...');
    const findingsRef = collection(db, 'findings');
    const q = query(findingsRef, limit(100));
    
    const snapshot = await getDocs(q);
    console.log(`✅ Found ${snapshot.size} findings\n`);
    
    if (snapshot.size === 0) {
      console.log('⚠️  No findings in database!');
      return;
    }
    
    // Display all findings
    console.log('=' .repeat(80));
    console.log('ALL FINDINGS:');
    console.log('=' .repeat(80));
    
    let findings = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      findings.push({ id: doc.id, ...data });
    });
    
    // Sort by year and severity
    findings.sort((a, b) => {
      if (a.year !== b.year) return (b.year || 0) - (a.year || 0);
      const severityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
      return (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99);
    });
    
    findings.forEach((f, idx) => {
      console.log(`\n${idx + 1}. [${f.severity || 'N/A'}] ${f.title || 'Untitled'}`);
      console.log(`   ID: ${f.id}`);
      console.log(`   Status: ${f.status || 'N/A'}`);
      console.log(`   Type: ${f.projectType || 'N/A'}`);
      console.log(`   Year: ${f.year || 'N/A'}`);
      console.log(`   Department: ${f.department || 'N/A'}`);
      if (f.dateIdentified) {
        const date = f.dateIdentified.toDate ? f.dateIdentified.toDate() : new Date(f.dateIdentified);
        console.log(`   Date: ${date.toLocaleDateString()}`);
      }
      // Show ALL fields to debug
      console.log(`   RAW DATA:`, JSON.stringify(f, null, 2));
    });
    
    // Summary by filters
    console.log('\n' + '=' .repeat(80));
    console.log('SUMMARY:');
    console.log('=' .repeat(80));
    
    const by2024 = findings.filter(f => f.year === 2024);
    const byCritical = findings.filter(f => f.severity === 'Critical');
    const byCritical2024 = findings.filter(f => f.year === 2024 && f.severity === 'Critical');
    const byOpen = findings.filter(f => f.status === 'Open');
    const byHotel = findings.filter(f => f.projectType === 'Hotel');
    
    console.log(`\nTotal findings: ${findings.length}`);
    console.log(`Year 2024: ${by2024.length}`);
    console.log(`Critical severity: ${byCritical.length}`);
    console.log(`Critical + 2024: ${byCritical2024.length} ⭐`);
    console.log(`Open status: ${byOpen.length}`);
    console.log(`Hotel type: ${byHotel.length}`);
    
    // Show critical 2024 findings specifically
    if (byCritical2024.length > 0) {
      console.log('\n' + '=' .repeat(80));
      console.log('CRITICAL 2024 FINDINGS (What query should find):');
      console.log('=' .repeat(80));
      byCritical2024.forEach((f, idx) => {
        console.log(`\n${idx + 1}. ${f.title}`);
        console.log(`   ID: ${f.id}`);
        console.log(`   Severity: ${f.severity}`);
        console.log(`   Year: ${f.year}`);
        console.log(`   Status: ${f.status}`);
      });
    }
    
    // Write results to file
    const outputDir = 'test-results';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    const outputFile = `${outputDir}/all-findings-raw-data.json`;
    fs.writeFileSync(outputFile, JSON.stringify(findings, null, 2));
    console.log(`\n📄 Raw data exported to: ${outputFile}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
  
  process.exit(0);
}

queryAllFindings();
