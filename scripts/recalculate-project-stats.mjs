#!/usr/bin/env node

/**
 * Recalculate Project Statistics
 * 
 * This script recalculates finding and non-finding counts for all projects
 * by querying the actual findings data.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';

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
    
    return { 
      totalFinding, 
      nonFinding, 
      total: findingsSnapshot.size 
    };
  } catch (error) {
    console.error(`Error counting findings for ${projectName}:`, error);
    return { totalFinding: 0, nonFinding: 0, total: 0 };
  }
}

/**
 * Recalculate stats for all projects
 */
async function recalculateAllStats() {
  console.log('🔄 Starting project statistics recalculation...\n');
  
  try {
    // Get all projects
    const projectsRef = collection(db, 'projects');
    const projectsSnapshot = await getDocs(projectsRef);
    
    if (projectsSnapshot.empty) {
      console.log('⚠️  No projects found in database');
      return;
    }
    
    console.log(`📋 Found ${projectsSnapshot.size} projects\n`);
    
    let updated = 0;
    let errors = 0;
    
    for (const docSnap of projectsSnapshot.docs) {
      const project = docSnap.data();
      const projectName = project.projectName;
      
      try {
        console.log(`🔍 Processing: ${projectName}...`);
        
        // Count findings
        const { totalFinding, nonFinding, total } = await countFindings(projectName);
        
        // Update project
        const docRef = doc(db, 'projects', docSnap.id);
        await updateDoc(docRef, {
          finding: totalFinding,
          nonFinding: nonFinding,
          total: total,
          updatedAt: Timestamp.now(),
        });
        
        console.log(`   ✅ Updated: ${totalFinding} findings, ${nonFinding} non-findings`);
        updated++;
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Recalculation Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📋 Total: ${projectsSnapshot.size}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  }
}

// Run recalculation
recalculateAllStats()
  .then(() => {
    console.log('\n✅ Recalculation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Recalculation failed:', error);
    process.exit(1);
  });
