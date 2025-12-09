import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkProjectsDetails() {
  try {
    console.log('Fetching all projects with full details...\n');
    
    const projectsSnapshot = await db.collection('projects').get();
    
    console.log(`Total projects: ${projectsSnapshot.size}\n`);
    
    // Check for empty fields
    const emptyNames = [];
    const emptyCodes = [];
    const emptyDepartments = [];
    
    // Track duplicates
    const initialsMap = new Map();
    
    projectsSnapshot.forEach(doc => {
      const data = doc.data();
      const project = {
        id: doc.id,
        name: data.name || '',
        initials: data.initials || '',
        projectCode: data.projectCode || '',
        department: data.department || '',
        createdAt: data.createdAt?.toDate?.() || null,
        ...data
      };
      
      // Check for empty fields
      if (!project.name || project.name.trim() === '') {
        emptyNames.push(project);
      }
      if (!project.projectCode || project.projectCode.trim() === '') {
        emptyCodes.push(project);
      }
      if (!project.department || project.department.trim() === '') {
        emptyDepartments.push(project);
      }
      
      // Track by initials
      const initialsKey = project.initials.toUpperCase().trim();
      if (initialsKey) {
        if (!initialsMap.has(initialsKey)) {
          initialsMap.set(initialsKey, []);
        }
        initialsMap.get(initialsKey).push(project);
      }
    });
    
    // Show projects with empty names
    console.log('=== PROJECTS WITH EMPTY NAMES ===');
    console.log(`Count: ${emptyNames.length}\n`);
    emptyNames.forEach(p => {
      console.log(`ID: ${p.id}`);
      console.log(`  Initials: ${p.initials}`);
      console.log(`  Code: ${p.projectCode}`);
      console.log(`  Department: ${p.department}`);
      console.log(`  Created: ${p.createdAt}`);
      console.log('');
    });
    
    // Show duplicate initials with full details
    console.log('\n=== DUPLICATE INITIALS (FULL DETAILS) ===');
    let dupCount = 0;
    for (const [initials, projects] of initialsMap.entries()) {
      if (projects.length > 1) {
        dupCount++;
        console.log(`\nInitials: "${initials}" (${projects.length} occurrences)`);
        projects.forEach((p, idx) => {
          console.log(`  [${idx + 1}] ID: ${p.id}`);
          console.log(`      Name: "${p.name}"`);
          console.log(`      Code: "${p.projectCode}"`);
          console.log(`      Dept: "${p.department}"`);
          console.log(`      Created: ${p.createdAt}`);
        });
      }
    }
    console.log(`\nTotal duplicate initials groups: ${dupCount}`);
    
    // Statistics
    console.log('\n=== STATISTICS ===');
    console.log(`Total projects: ${projectsSnapshot.size}`);
    console.log(`Projects with empty names: ${emptyNames.length}`);
    console.log(`Projects with empty codes: ${emptyCodes.length}`);
    console.log(`Projects with empty departments: ${emptyDepartments.length}`);
    console.log(`Duplicate initials groups: ${dupCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkProjectsDetails();
