#!/usr/bin/env node

/**
 * Regenerate all project initials using the new simple logic
 * Takes first 3-4 letters from project name
 * Run with: node scripts/regenerate-initials-simple.mjs
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
 * Generate unique initials
 */
function generateUniqueInitials(projectName, usedInitials) {
  const baseInitials = generateBaseInitials(projectName);
  
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

async function regenerateInitials() {
  try {
    console.log('🔄 Regenerating all project initials with new simple logic...\n');
    console.log('📝 New rule: First 3-4 letters from project name\n');

    // Get all projects
    const projectsSnapshot = await db.collection('projects').get();
    
    if (projectsSnapshot.empty) {
      console.log('⚠️  No projects found in database');
      return;
    }

    console.log(`📊 Found ${projectsSnapshot.size} projects\n`);

    const usedInitials = new Set();
    let updated = 0;
    let unchanged = 0;
    let errors = 0;

    // Process each project
    for (const doc of projectsSnapshot.docs) {
      const project = doc.data();
      const projectName = project.projectName;
      const oldInitials = project.initials;

      try {
        // Generate new unique initials
        const newInitials = generateUniqueInitials(projectName, usedInitials);
        usedInitials.add(newInitials);

        if (oldInitials === newInitials) {
          console.log(`⏭️  Unchanged: ${projectName} → ${newInitials}`);
          unchanged++;
        } else {
          // Update the document
          await doc.ref.update({
            initials: newInitials,
            updatedAt: new Date(),
          });

          console.log(`✅ Updated: ${projectName}`);
          console.log(`   ${oldInitials || 'N/A'} → ${newInitials}`);
          updated++;
        }

      } catch (error) {
        console.error(`❌ Error updating ${projectName}:`, error.message);
        errors++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 Regeneration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Updated: ${updated} projects`);
    console.log(`⏭️  Unchanged: ${unchanged} projects`);
    console.log(`❌ Errors: ${errors} projects`);
    console.log(`📊 Total: ${projectsSnapshot.size} projects`);
    console.log(`🎯 Unique initials: ${usedInitials.size}`);
    console.log('='.repeat(60));

    if (errors === 0) {
      console.log('\n🎉 Regeneration completed successfully!');
    } else {
      console.log('\n⚠️  Regeneration completed with some errors.');
    }

  } catch (error) {
    console.error('❌ Fatal error during regeneration:', error);
    process.exit(1);
  }
}

// Run the regeneration
regenerateInitials()
  .then(() => {
    console.log('\n✨ Script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
