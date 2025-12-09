import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

const snap = await db.collection('audit-results').where('year', '==', 2024).get();
const depts = new Set();
snap.forEach(doc => depts.add(doc.data().department));

console.log(`Total 2024 records: ${snap.size}`);
console.log('\n2024 Departments:');
Array.from(depts).sort().forEach(d => console.log(`- ${d}`));

process.exit(0);
