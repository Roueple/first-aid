import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  await fs.readFile(join(__dirname, '..', 'serviceaccountKey.json'), 'utf8')
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function backupAuditResults() {
  console.log('🔄 Creating backup of audit-results collection...\n');
  
  const snapshot = await db.collection('audit-results').get();
  const backup = [];
  
  snapshot.docs.forEach(doc => {
    backup.push({
      id: doc.id,
      data: doc.data()
    });
  });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = join(__dirname, '..', `audit-results-backup-${timestamp}.json`);
  
  await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));
  
  console.log(`✅ Backup created: ${backup.length} documents`);
  console.log(`📁 File: ${backupPath}`);
  
  return backupPath;
}

backupAuditResults()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  });
