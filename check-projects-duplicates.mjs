import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkProjectsDuplicates() {
  try {
    console.log('Fetching all projects...\n');
    
    const projectsSnapshot = await db.collection('projects').get();
    const totalCount = projectsSnapshot.size;
    
    console.log(`Total projects count: ${totalCount}\n`);
    
    // Track potential duplicates
    const projectsByName = new Map();
    const projectsByInitials = new Map();
    const projectsByCode = new Map();
    
    const projects = [];
    
    projectsSnapshot.forEach(doc => {
      const data = doc.data();
      const project = {
        id: doc.id,
        name: data.name || '',
        initials: data.initials || '',
        projectCode: data.projectCode || '',
        department: data.department || '',
        createdAt: data.createdAt?.toDate?.() || null
      };
      
      projects.push(project);
      
      // Track by name
      const nameLower = project.name.toLowerCase().trim();
      if (nameLower) {
        if (!projectsByName.has(nameLower)) {
          projectsByName.set(nameLower, []);
        }
        projectsByName.get(nameLower).push(project);
      }
      
      // Track by initials
      const initialsUpper = project.initials.toUpperCase().trim();
      if (initialsUpper) {
        if (!projectsByInitials.has(initialsUpper)) {
          projectsByInitials.set(initialsUpper, []);
        }
        projectsByInitials.get(initialsUpper).push(project);
      }
      
      // Track by project code
      const codeUpper = project.projectCode.toUpperCase().trim();
      if (codeUpper) {
        if (!projectsByCode.has(codeUpper)) {
          projectsByCode.set(codeUpper, []);
        }
        projectsByCode.get(codeUpper).push(project);
      }
    });
    
    // Find duplicates by name
    console.log('=== DUPLICATE NAMES ===');
    let nameDuplicates = 0;
    for (const [name, projs] of projectsByName.entries()) {
      if (projs.length > 1) {
        nameDuplicates++;
        console.log(`\n"${name}" (${projs.length} occurrences):`);
        projs.forEach(p => {
          console.log(`  - ID: ${p.id}, Initials: ${p.initials}, Code: ${p.projectCode}, Dept: ${p.department}`);
        });
      }
    }
    if (nameDuplicates === 0) {
      console.log('No duplicate names found.\n');
    } else {
      console.log(`\nTotal duplicate name groups: ${nameDuplicates}\n`);
    }
    
    // Find duplicates by initials
    console.log('=== DUPLICATE INITIALS ===');
    let initialsDuplicates = 0;
    for (const [initials, projs] of projectsByInitials.entries()) {
      if (projs.length > 1) {
        initialsDuplicates++;
        console.log(`\n"${initials}" (${projs.length} occurrences):`);
        projs.forEach(p => {
          console.log(`  - ID: ${p.id}, Name: ${p.name}, Code: ${p.projectCode}, Dept: ${p.department}`);
        });
      }
    }
    if (initialsDuplicates === 0) {
      console.log('No duplicate initials found.\n');
    } else {
      console.log(`\nTotal duplicate initials groups: ${initialsDuplicates}\n`);
    }
    
    // Find duplicates by project code
    console.log('=== DUPLICATE PROJECT CODES ===');
    let codeDuplicates = 0;
    for (const [code, projs] of projectsByCode.entries()) {
      if (projs.length > 1) {
        codeDuplicates++;
        console.log(`\n"${code}" (${projs.length} occurrences):`);
        projs.forEach(p => {
          console.log(`  - ID: ${p.id}, Name: ${p.name}, Initials: ${p.initials}, Dept: ${p.department}`);
        });
      }
    }
    if (codeDuplicates === 0) {
      console.log('No duplicate project codes found.\n');
    } else {
      console.log(`\nTotal duplicate code groups: ${codeDuplicates}\n`);
    }
    
    // Summary
    console.log('=== SUMMARY ===');
    console.log(`Total projects: ${totalCount}`);
    console.log(`Duplicate name groups: ${nameDuplicates}`);
    console.log(`Duplicate initials groups: ${initialsDuplicates}`);
    console.log(`Duplicate code groups: ${codeDuplicates}`);
    
    // Show sample of projects
    console.log('\n=== SAMPLE PROJECTS (first 10) ===');
    projects.slice(0, 10).forEach(p => {
      console.log(`${p.name} | ${p.initials} | ${p.projectCode} | ${p.department}`);
    });
    
  } catch (error) {
    console.error('Error checking projects:', error);
  } finally {
    process.exit(0);
  }
}

checkProjectsDuplicates();
