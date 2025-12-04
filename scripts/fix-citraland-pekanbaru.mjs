import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  await import('fs').then(fs => 
    fs.promises.readFile(join(__dirname, '..', 'serviceaccountKey.json'), 'utf8')
  )
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function fixCitralandPekanbaru() {
  console.log('🔧 Fixing Citraland Pekanbaru project name mismatch...\n');
  
  // Find the project with "CitraLand Pekanbaru"
  const projectsSnapshot = await db.collection('projects')
    .where('projectName', '==', 'CitraLand Pekanbaru')
    .get();
  
  if (projectsSnapshot.empty) {
    console.log('❌ Project "CitraLand Pekanbaru" not found in Firestore');
    return;
  }
  
  const projectDoc = projectsSnapshot.docs[0];
  const projectId = projectDoc.id;
  const projectData = projectDoc.data();
  
  console.log(`Found project: ${projectData.projectName} [${projectData.initials}]`);
  console.log(`Project ID: ${projectId}\n`);
  
  // Update audit-results that have "Citraland Pekanbaru" to link to this project
  const auditResultsSnapshot = await db.collection('audit-results')
    .where('projectName', '==', 'Citraland Pekanbaru')
    .get();
  
  console.log(`Found ${auditResultsSnapshot.size} audit results with "Citraland Pekanbaru"\n`);
  
  if (auditResultsSnapshot.size === 0) {
    console.log('✅ No audit results need updating');
    return;
  }
  
  // Update in batches
  const batchSize = 500;
  let updated = 0;
  
  for (let i = 0; i < auditResultsSnapshot.docs.length; i += batchSize) {
    const batch = db.batch();
    const batchDocs = auditResultsSnapshot.docs.slice(i, i + batchSize);
    
    batchDocs.forEach(doc => {
      batch.update(doc.ref, {
        projectId: projectId,
        updatedAt: new Date().toISOString()
      });
    });
    
    await batch.commit();
    updated += batchDocs.length;
    console.log(`Updated ${updated} / ${auditResultsSnapshot.size} records...`);
  }
  
  console.log(`\n✅ Successfully linked ${updated} audit results to project "${projectData.projectName}"`);
}

fixCitralandPekanbaru()
  .then(() => {
    console.log('\n✅ Fix completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fix failed:', error);
    process.exit(1);
  });
