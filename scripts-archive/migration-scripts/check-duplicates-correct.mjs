import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkDuplicates() {
  try {
    console.log('Fetching all projects...\n');
    
    const projectsSnapshot = await db.collection('projects').get();
    
    console.log(`Total projects: ${projectsSnapshot.size}\n`);
    
    // Maps for tracking duplicates
    const byProjectName = new Map();
    const byProjectId = new Map();
    const byInitials = new Map();
    
    projectsSnapshot.forEach(doc => {
      const data = doc.data();
      const project = {
        docId: doc.id,
        projectId: data.projectId || '',
        projectName: data.projectName || '',
        initials: data.initials || '',
        sh: data.sh || '',
        type: data.type || '',
        subtype: data.subtype || ''
      };
      
      // Track by project name
      const nameLower = project.projectName.toLowerCase().trim();
      if (nameLower) {
        if (!byProjectName.has(nameLower)) {
          byProjectName.set(nameLower, []);
        }
        byProjectName.get(nameLower).push(project);
      }
      
      // Track by project ID
      const projId = project.projectId.trim();
      if (projId) {
        if (!byProjectId.has(projId)) {
          byProjectId.set(projId, []);
        }
        byProjectId.get(projId).push(project);
      }
      
      // Track by initials
      const initialsUpper = project.initials.toUpperCase().trim();
      if (initialsUpper) {
        if (!byInitials.has(initialsUpper)) {
          byInitials.set(initialsUpper, []);
        }
        byInitials.get(initialsUpper).push(project);
      }
    });
    
    // Check for duplicate project names
    console.log('=== DUPLICATE PROJECT NAMES ===');
    let nameCount = 0;
    for (const [name, projects] of byProjectName.entries()) {
      if (projects.length > 1) {
        nameCount++;
        console.log(`\n"${name}" (${projects.length} occurrences):`);
        projects.forEach(p => {
          console.log(`  - Doc ID: ${p.docId}`);
          console.log(`    Project ID: ${p.projectId}, Initials: ${p.initials}, SH: ${p.sh}`);
        });
      }
    }
    if (nameCount === 0) {
      console.log('No duplicate project names found.\n');
    } else {
      console.log(`\nTotal duplicate name groups: ${nameCount}\n`);
    }
    
    // Check for duplicate project IDs
    console.log('=== DUPLICATE PROJECT IDs ===');
    let idCount = 0;
    for (const [projId, projects] of byProjectId.entries()) {
      if (projects.length > 1) {
        idCount++;
        console.log(`\n"${projId}" (${projects.length} occurrences):`);
        projects.forEach(p => {
          console.log(`  - Doc ID: ${p.docId}`);
          console.log(`    Name: ${p.projectName}, Initials: ${p.initials}, SH: ${p.sh}`);
        });
      }
    }
    if (idCount === 0) {
      console.log('No duplicate project IDs found.\n');
    } else {
      console.log(`\nTotal duplicate project ID groups: ${idCount}\n`);
    }
    
    // Check for duplicate initials
    console.log('=== DUPLICATE INITIALS ===');
    let initialsCount = 0;
    for (const [initials, projects] of byInitials.entries()) {
      if (projects.length > 1) {
        initialsCount++;
        console.log(`\n"${initials}" (${projects.length} occurrences):`);
        projects.forEach(p => {
          console.log(`  - Doc ID: ${p.docId}`);
          console.log(`    Name: ${p.projectName}`);
          console.log(`    Project ID: ${p.projectId}, SH: ${p.sh}`);
        });
      }
    }
    if (initialsCount === 0) {
      console.log('No duplicate initials found.\n');
    } else {
      console.log(`\nTotal duplicate initials groups: ${initialsCount}\n`);
    }
    
    // Summary
    console.log('=== SUMMARY ===');
    console.log(`Total projects: ${projectsSnapshot.size}`);
    console.log(`Duplicate project name groups: ${nameCount}`);
    console.log(`Duplicate project ID groups: ${idCount}`);
    console.log(`Duplicate initials groups: ${initialsCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkDuplicates();
