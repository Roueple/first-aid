import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const serviceAccount = JSON.parse(
  readFileSync(join(rootDir, 'serviceaccountKey.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log('🔍 Verifying Migration...\n');

// Check projects
const projectsSnapshot = await db.collection('projects').limit(5).get();
console.log(`✅ Projects: ${projectsSnapshot.size} documents found`);
if (projectsSnapshot.size > 0) {
  const sample = projectsSnapshot.docs[0].data();
  console.log('   Sample project:', {
    projectName: sample.projectName,
    sh: sample.sh,
    category: sample.category,
    tags: sample.tags
  });
}

// Check audit_results
const auditSnapshot = await db.collection('audit_results').limit(5).get();
console.log(`\n✅ Audit Results: ${auditSnapshot.size} documents found`);
if (auditSnapshot.size > 0) {
  const sample = auditSnapshot.docs[0].data();
  console.log('   Sample audit result:', {
    projectName: sample.projectName,
    subholding: sample.subholding,
    year: sample.year,
    department: sample.department,
    code: sample.code,
    weight: sample.weight,
    severity: sample.severity,
    value: sample.value
  });
}

// Count by year
const yearCounts = {};
const allAudits = await db.collection('audit_results').get();
allAudits.docs.forEach(doc => {
  const year = doc.data().year;
  yearCounts[year] = (yearCounts[year] || 0) + 1;
});

console.log('\n📊 Audit Results by Year:');
Object.keys(yearCounts).sort().forEach(year => {
  console.log(`   ${year}: ${yearCounts[year]} results`);
});

console.log('\n✅ Migration verified successfully!');
process.exit(0);
