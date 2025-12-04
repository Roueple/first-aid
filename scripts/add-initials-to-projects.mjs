#!/usr/bin/env node

/**
 * Migration script to add 3-character initials to all existing projects
 * Run with: node scripts/add-initials-to-projects.mjs
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
 * Generate unique initials by checking against used initials
 */
function generateUniqueInitials(projectName, usedInitials) {
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

async function addInitialsToProjects() {
  try {
    console.log('🚀 Starting migration: Adding unique initials to all projects...\n');

    // Get all projects
    const projectsSnapshot = await db.collection('projects').get();
    
    if (projectsSnapshot.empty) {
      console.log('⚠️  No projects found in database');
      return;
    }

    console.log(`📊 Found ${projectsSnapshot.size} projects\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let collisions = 0;

    // Track used initials to ensure uniqueness
    const usedInitials = new Set();
    
    // First pass: collect existing initials
    for (const doc of projectsSnapshot.docs) {
      const project = doc.data();
      if (project.initials) {
        usedInitials.add(project.initials);
      }
    }

    console.log(`📋 Found ${usedInitials.size} existing initials\n`);

    // Second pass: generate and assign unique initials
    for (const doc of projectsSnapshot.docs) {
      const project = doc.data();
      const projectName = project.projectName;

      try {
        // Check if initials already exist and are valid
        if (project.initials) {
          console.log(`⏭️  Skipped: ${projectName} (already has initials: ${project.initials})`);
          skipped++;
          continue;
        }

        // Generate unique initials
        const initials = generateUniqueInitials(projectName, usedInitials);
        
        // Track if there was a collision
        const baseInitials = generateBaseInitials(projectName);
        if (initials !== baseInitials) {
          console.log(`⚠️  Collision detected for ${projectName}: ${baseInitials} → ${initials}`);
          collisions++;
        }

        // Add to used set
        usedInitials.add(initials);

        // Update the document
        await doc.ref.update({
          initials: initials,
          updatedAt: new Date(),
        });

        console.log(`✅ Updated: ${projectName} → ${initials}`);
        updated++;

      } catch (error) {
        console.error(`❌ Error updating ${projectName}:`, error.message);
        errors++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Updated: ${updated} projects`);
    console.log(`⚠️  Collisions resolved: ${collisions} projects`);
    console.log(`⏭️  Skipped: ${skipped} projects (already had initials)`);
    console.log(`❌ Errors: ${errors} projects`);
    console.log(`📊 Total: ${projectsSnapshot.size} projects`);
    console.log(`🎯 Unique initials: ${usedInitials.size}`);
    console.log('='.repeat(60));

    if (errors === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with some errors. Please review the logs above.');
    }

  } catch (error) {
    console.error('❌ Fatal error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
addInitialsToProjects()
  .then(() => {
    console.log('\n✨ Script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
