import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function markProjectsInactive() {
  try {
    // Project IDs to mark as inactive
    const projectIdsToDeactivate = ['6745767', '4870130', '2480363', '6549869'];
    
    console.log('Finding projects to mark as inactive...\n');
    
    // Get all projects
    const projectsSnapshot = await db.collection('projects').get();
    
    const projectsToUpdate = [];
    
    projectsSnapshot.forEach(doc => {
      const data = doc.data();
      if (projectIdsToDeactivate.includes(data.projectId)) {
        projectsToUpdate.push({
          docId: doc.id,
          projectId: data.projectId,
          projectName: data.projectName,
          initials: data.initials,
          currentStatus: data.isActive
        });
      }
    });
    
    console.log(`Found ${projectsToUpdate.length} projects to update:\n`);
    
    projectsToUpdate.forEach(p => {
      console.log(`- ${p.projectName} (ID: ${p.projectId}, Initials: ${p.initials})`);
      console.log(`  Current isActive: ${p.currentStatus}`);
    });
    
    console.log('\nUpdating projects...\n');
    
    // Update each project
    const batch = db.batch();
    
    for (const project of projectsToUpdate) {
      const docRef = db.collection('projects').doc(project.docId);
      batch.update(docRef, {
        isActive: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✓ Marked ${project.projectName} as inactive`);
    }
    
    await batch.commit();
    
    console.log('\n=== SUCCESS ===');
    console.log(`${projectsToUpdate.length} projects marked as inactive`);
    
    // Verify the changes
    console.log('\nVerifying changes...\n');
    
    for (const project of projectsToUpdate) {
      const doc = await db.collection('projects').doc(project.docId).get();
      const data = doc.data();
      console.log(`${project.projectName}: isActive = ${data.isActive}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

markProjectsInactive();
