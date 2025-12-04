#!/usr/bin/env node

/**
 * Verification and fix script for project initials uniqueness
 * Run with: node scripts/verify-and-fix-initials-uniqueness.mjs
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

async function verifyAndFixInitials() {
  try {
    console.log('🔍 Verifying initials uniqueness...\n');

    // Get all projects
    const projectsSnapshot = await db.collection('projects').get();
    
    if (projectsSnapshot.empty) {
      console.log('⚠️  No projects found in database');
      return;
    }

    console.log(`📊 Found ${projectsSnapshot.size} projects\n`);

    // Build initials map
    const initialsMap = new Map(); // initials -> [projects]
    const projects = [];

    projectsSnapshot.forEach(doc => {
      const project = { id: doc.id, ref: doc.ref, ...doc.data() };
      projects.push(project);
      
      if (project.initials) {
        if (!initialsMap.has(project.initials)) {
          initialsMap.set(project.initials, []);
        }
        initialsMap.get(project.initials).push(project);
      }
    });

    // Find duplicates
    const duplicates = [];
    for (const [initials, projectList] of initialsMap.entries()) {
      if (projectList.length > 1) {
        duplicates.push({ initials, projects: projectList });
      }
    }

    if (duplicates.length === 0) {
      console.log('✅ All initials are unique! No duplicates found.\n');
      console.log(`📊 Total unique initials: ${initialsMap.size}`);
      console.log(`📊 Total projects: ${projects.length}`);
      return;
    }

    // Report duplicates
    console.log(`⚠️  Found ${duplicates.length} duplicate initials:\n`);
    
    for (const dup of duplicates) {
      console.log(`❌ "${dup.initials}" is used by ${dup.projects.length} projects:`);
      dup.projects.forEach(p => {
        console.log(`   - ${p.projectName}`);
      });
      console.log('');
    }

    // Fix duplicates
    console.log('🔧 Fixing duplicates...\n');
    
    const usedInitials = new Set();
    let fixed = 0;

    for (const project of projects) {
      if (!project.initials) {
        console.log(`⚠️  Project "${project.projectName}" has no initials, skipping...`);
        continue;
      }

      // Check if this initial is already used
      if (usedInitials.has(project.initials)) {
        // Duplicate found, generate new unique initials
        const newInitials = generateUniqueInitials(project.projectName, usedInitials);
        
        await project.ref.update({
          initials: newInitials,
          updatedAt: new Date(),
        });

        console.log(`✅ Fixed: ${project.projectName}`);
        console.log(`   ${project.initials} → ${newInitials}`);
        
        usedInitials.add(newInitials);
        fixed++;
      } else {
        // First occurrence, keep it
        usedInitials.add(project.initials);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 Verification & Fix Summary:');
    console.log('='.repeat(60));
    console.log(`❌ Duplicates found: ${duplicates.length}`);
    console.log(`✅ Fixed: ${fixed} projects`);
    console.log(`🎯 Unique initials: ${usedInitials.size}`);
    console.log(`📊 Total projects: ${projects.length}`);
    console.log('='.repeat(60));

    if (fixed > 0) {
      console.log('\n🎉 All duplicates have been resolved!');
    }

  } catch (error) {
    console.error('❌ Fatal error during verification:', error);
    process.exit(1);
  }
}

// Run the verification
verifyAndFixInitials()
  .then(() => {
    console.log('\n✨ Script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
