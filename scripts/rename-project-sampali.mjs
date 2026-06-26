#!/usr/bin/env node
/**
 * Rename "CitraLand Sampali Kedamean Medan" → "CitraLand City Sampali"
 * across all Firestore collections.
 *
 * Collections touched:
 *   - audit_results  (field: proyek)
 *   - projects       (fields: projectName, tags)
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const OLD_NAME = 'CitraLand Sampali Kedamean Medan';
const NEW_NAME = 'CitraLand City Sampali';

const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

// Helper: commit in chunks to stay under Firestore's 500-op batch limit
async function commitInChunks(updates) {
  const CHUNK_SIZE = 400;
  let committed = 0;
  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    const chunk = updates.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();
    for (const { ref, data } of chunk) {
      batch.update(ref, data);
    }
    await batch.commit();
    committed += chunk.length;
    console.log(`  committed ${committed}/${updates.length}`);
  }
}

async function renameInAuditResults() {
  console.log('\n📋 [1/2] Updating audit_results.proyek ...');

  const snapshot = await db.collection('audit_results')
    .where('proyek', '==', OLD_NAME)
    .get();

  console.log(`  Found ${snapshot.size} documents`);

  if (snapshot.size === 0) {
    console.log('  ✅ Nothing to update.');
    return 0;
  }

  const updates = [];
  snapshot.forEach(doc => {
    updates.push({ ref: doc.ref, data: { proyek: NEW_NAME } });
  });

  await commitInChunks(updates);
  console.log(`  ✅ Updated ${updates.length} audit_results documents.`);

  // Verify
  const verify = await db.collection('audit_results').where('proyek', '==', OLD_NAME).get();
  if (verify.size > 0) {
    console.error(`  ⚠️  ${verify.size} documents still have the old name!`);
  } else {
    console.log('  ✅ Verification passed — no documents with old name remain.');
  }

  return updates.length;
}

async function renameInProjects() {
  console.log('\n🏗️  [2/2] Updating projects collection ...');

  const snapshot = await db.collection('projects')
    .where('projectName', '==', OLD_NAME)
    .get();

  console.log(`  Found ${snapshot.size} project document(s)`);

  if (snapshot.size === 0) {
    console.log('  ⚠️  No project document found with that name. Skipping.');
    return 0;
  }

  const updates = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    const newData = { projectName: NEW_NAME };

    // Also update tags array if the old name appears there
    if (Array.isArray(data.tags)) {
      const updatedTags = data.tags.map(tag =>
        tag === OLD_NAME ? NEW_NAME : tag
      );
      if (JSON.stringify(updatedTags) !== JSON.stringify(data.tags)) {
        newData.tags = updatedTags;
        console.log('  → Also updating tags array');
      }
    }

    updates.push({ ref: doc.ref, data: newData });
  });

  await commitInChunks(updates);
  console.log(`  ✅ Updated ${updates.length} project document(s).`);

  // Verify
  const verify = await db.collection('projects').where('projectName', '==', OLD_NAME).get();
  const verifyNew = await db.collection('projects').where('projectName', '==', NEW_NAME).get();
  if (verify.size > 0) {
    console.error(`  ⚠️  ${verify.size} project(s) still have the old name!`);
  } else {
    console.log(`  ✅ Verification passed — ${verifyNew.size} project(s) now have the new name.`);
  }

  return updates.length;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Project rename migration');
  console.log(`  OLD: "${OLD_NAME}"`);
  console.log(`  NEW: "${NEW_NAME}"`);
  console.log('='.repeat(60));

  try {
    const auditCount = await renameInAuditResults();
    const projectCount = await renameInProjects();

    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration complete.');
    console.log(`   audit_results updated : ${auditCount}`);
    console.log(`   projects updated      : ${projectCount}`);
    console.log('='.repeat(60));
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  }
}

main();
