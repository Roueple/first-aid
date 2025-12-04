#!/usr/bin/env node

/**
 * Update all project initials to be unique 3-4 letter codes
 * Run with: node scripts/update-all-project-initials.mjs
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
  credential: cert(serviceAccount),
});

const db = getFirestore();

/**
 * Generate smart initials from project name
 * Prioritizes meaningful abbreviations over simple truncation
 */
function generateSmartInitials(projectName) {
  // Clean the name
  const cleaned = projectName.trim();
  
  // Split into words
  const words = cleaned.split(/[\s\-_\/]+/).filter(w => w.length > 0);
  
  if (words.length === 1) {
    // Single word: take first 3-4 letters
    const word = words[0].replace(/[^a-zA-Z]/g, '');
    return word.substring(0, 4).toUpperCase();
  }
  
  if (words.length === 2) {
    // Two words: take first 2 letters of each
    const word1 = words[0].replace(/[^a-zA-Z]/g, '');
    const word2 = words[1].replace(/[^a-zA-Z]/g, '');
    return (word1.substring(0, 2) + word2.substring(0, 2)).toUpperCase();
  }
  
  if (words.length === 3) {
    // Three words: take first letter of each, plus extra from first word
    const initials = words.map(w => w.replace(/[^a-zA-Z]/g, '')[0] || '').join('');
    if (initials.length >= 3) {
      return initials.toUpperCase();
    }
  }
  
  // Four or more words: take first letter of first 4 words
  if (words.length >= 4) {
    const initials = words.slice(0, 4).map(w => w.replace(/[^a-zA-Z]/g, '')[0] || '').join('');
    if (initials.length >= 3) {
      return initials.toUpperCase();
    }
  }
  
  // Fallback: remove all non-letters and take first 4
  const fallback = cleaned.replace(/[^a-zA-Z]/g, '');
  return fallback.substring(0, 4).toUpperCase() || 'PROJ';
}

/**
 * Make initials unique by appending letters if needed
 */
function makeUnique(baseInitials, usedInitials) {
  if (!usedInitials.has(baseInitials)) {
    return baseInitials;
  }
  
  // Try appending A-Z
  for (let i = 65; i <= 90; i++) {
    const candidate = baseInitials + String.fromCharCode(i);
    if (!usedInitials.has(candidate)) {
      return candidate;
    }
  }
  
  // Try appending numbers 1-99
  for (let i = 1; i <= 99; i++) {
    const candidate = baseInitials + i;
    if (!usedInitials.has(candidate)) {
      return candidate;
    }
  }
  
  // Ultimate fallback
  return baseInitials + Math.random().toString(36).substring(2, 5).toUpperCase();
}

async function updateAllInitials() {
  try {
    console.log('🔄 Updating all project initials...\n');

    // Get all projects
    const projectsSnapshot = await db.collection('projects').get();
    
    if (projectsSnapshot.empty) {
      console.log('⚠️  No projects found in database');
      return;
    }

    console.log(`📊 Found ${projectsSnapshot.size} projects\n`);

    // Collect all projects
    const projects = [];
    projectsSnapshot.forEach(doc => {
      projects.push({
        id: doc.id,
        ref: doc.ref,
        ...doc.data()
      });
    });

    // Sort by name for consistent processing
    projects.sort((a, b) => (a.projectName || '').localeCompare(b.projectName || ''));

    // Generate new unique initials for all
    const usedInitials = new Set();
    const updates = [];

    console.log('📝 Generating new initials:\n');
    console.log('─'.repeat(80));

    for (const project of projects) {
      const oldInitials = project.initials || 'N/A';
      const baseInitials = generateSmartInitials(project.projectName);
      const newInitials = makeUnique(baseInitials, usedInitials);
      
      usedInitials.add(newInitials);
      
      const changed = oldInitials !== newInitials;
      const symbol = changed ? '🔄' : '✓';
      
      console.log(`${symbol} ${project.projectName}`);
      console.log(`   ${oldInitials} → ${newInitials}`);
      
      if (changed) {
        updates.push({
          ref: project.ref,
          projectName: project.projectName,
          oldInitials,
          newInitials
        });
      }
    }

    console.log('─'.repeat(80));
    console.log(`\n📊 Summary: ${updates.length} projects need updating\n`);

    if (updates.length === 0) {
      console.log('✅ All initials are already optimal!');
      return;
    }

    // Confirm before updating
    console.log('⚠️  This will update initials in Firestore.');
    console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Perform updates
    console.log('🚀 Updating Firestore...\n');
    
    let successCount = 0;
    let errorCount = 0;

    for (const update of updates) {
      try {
        await update.ref.update({
          initials: update.newInitials,
          updatedAt: new Date()
        });
        
        console.log(`✅ ${update.projectName}: ${update.oldInitials} → ${update.newInitials}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to update ${update.projectName}:`, error.message);
        errorCount++;
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('📈 Update Complete:');
    console.log('='.repeat(80));
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📊 Total projects: ${projects.length}`);
    console.log(`🎯 Unique initials: ${usedInitials.size}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the update
updateAllInitials()
  .then(() => {
    console.log('\n✨ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
