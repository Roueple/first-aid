#!/usr/bin/env node
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function updateDepartmentTags() {
  console.log('🔍 Updating department_tags with originalNames field...\n');
  
  // Get all department tags
  const tagsSnapshot = await db.collection('department_tags').get();
  
  // Get all unique departments from audit_results
  const auditSnapshot = await db.collection('audit_results').get();
  const deptMap = new Map(); // departmentName -> [originalNames]
  
  auditSnapshot.forEach(doc => {
    const dept = doc.data().department;
    if (dept) {
      // For now, map each department to itself
      // Later we can add normalization logic
      if (!deptMap.has(dept)) {
        deptMap.set(dept, [dept]);
      }
    }
  });
  
  console.log(`Found ${deptMap.size} unique departments in audit_results\n`);
  
  const batch = db.batch();
  let updateCount = 0;
  
  // Update existing tags
  tagsSnapshot.forEach(doc => {
    const data = doc.data();
    const deptName = data.departmentName;
    
    if (deptMap.has(deptName)) {
      batch.update(doc.ref, {
        originalNames: deptMap.get(deptName)
      });
      updateCount++;
      deptMap.delete(deptName); // Remove from map
    }
  });
  
  console.log(`Updating ${updateCount} existing department tags...`);
  
  // Add new tags for departments not in department_tags
  let newCount = 0;
  for (const [deptName, originals] of deptMap.entries()) {
    const newDocRef = db.collection('department_tags').doc();
    batch.set(newDocRef, {
      departmentName: deptName,
      originalNames: originals,
      category: 'Uncategorized',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    newCount++;
  }
  
  console.log(`Adding ${newCount} new department tags...\n`);
  
  await batch.commit();
  console.log('✅ All department tags updated successfully!');
  
  // Verify
  const verifySnapshot = await db.collection('department_tags').get();
  let withOriginals = 0;
  verifySnapshot.forEach(doc => {
    if (doc.data().originalNames) withOriginals++;
  });
  
  console.log(`\n✅ ${withOriginals}/${verifySnapshot.size} department tags now have originalNames field`);
}

updateDepartmentTags().catch(console.error);
