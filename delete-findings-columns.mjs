/**
 * Delete Specific Columns from Findings Table
 * 
 * Removes the following fields from all findings documents:
 * - managementResponse
 * - recommendation
 * - dateDue
 * - dateIdentified
 * - actionPlan
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, writeBatch, doc, deleteField } from 'firebase/firestore';
import * as fs from 'fs';

// Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyBt1JoukjkIGvFhvEvf5B648QrvR41uKS8',
  authDomain: 'first-aid-101112.firebaseapp.com',
  projectId: 'first-aid-101112',
  storageBucket: 'first-aid-101112.firebasestorage.app',
  messagingSenderId: '162068922013',
  appId: '1:162068922013:web:24eff9fb9dee72744a1e74'
};

// Load test credentials
const credentials = JSON.parse(fs.readFileSync('.test-credentials.json', 'utf8'));

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Fields to delete
const FIELDS_TO_DELETE = [
  'managementResponse',
  'recommendation',
  'dateDue',
  'dateIdentified',
  'actionPlan'
];

async function deleteColumns() {
  console.log('\n🗑️  Deleting columns from findings table...\n');
  console.log('=' .repeat(80));
  console.log('Fields to delete:', FIELDS_TO_DELETE.join(', '));
  console.log('=' .repeat(80));
  
  try {
    // Authenticate
    console.log(`\nAuthenticating as ${credentials.email}...`);
    await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    console.log('✅ Authenticated\n');
    
    // Get all findings
    console.log('Fetching all findings...');
    const findingsRef = collection(db, 'findings');
    const snapshot = await getDocs(findingsRef);
    console.log(`✅ Found ${snapshot.size} findings\n`);
    
    if (snapshot.size === 0) {
      console.log('⚠️  No findings to update');
      return;
    }
    
    // Analyze which documents have these fields
    let docsWithFields = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const hasFields = FIELDS_TO_DELETE.filter(field => field in data);
      if (hasFields.length > 0) {
        docsWithFields.push({
          id: docSnap.id,
          title: data.title || data.findingTitle || 'Untitled',
          fields: hasFields
        });
      }
    });
    
    console.log(`📊 Analysis:`);
    console.log(`   Total documents: ${snapshot.size}`);
    console.log(`   Documents with fields to delete: ${docsWithFields.length}`);
    
    if (docsWithFields.length === 0) {
      console.log('\n✅ No documents have these fields. Nothing to delete!');
      return;
    }
    
    console.log(`\n📋 Documents that will be updated:`);
    docsWithFields.forEach((doc, idx) => {
      console.log(`   ${idx + 1}. ${doc.title} (${doc.id})`);
      console.log(`      Fields: ${doc.fields.join(', ')}`);
    });
    
    // Confirm deletion
    console.log(`\n⚠️  WARNING: This will delete the above fields from ${docsWithFields.length} documents!`);
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Delete fields in batches (Firestore limit is 500 operations per batch)
    console.log('🔄 Deleting fields...\n');
    
    const batchSize = 500;
    let processed = 0;
    let batches = 0;
    
    for (let i = 0; i < docsWithFields.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = docsWithFields.slice(i, i + batchSize);
      
      batchDocs.forEach(docInfo => {
        const docRef = doc(db, 'findings', docInfo.id);
        const updateData = {};
        
        // Use deleteField() to properly remove fields
        FIELDS_TO_DELETE.forEach(field => {
          updateData[field] = deleteField();
        });
        
        batch.update(docRef, updateData);
      });
      
      await batch.commit();
      processed += batchDocs.length;
      batches++;
      
      console.log(`   ✅ Batch ${batches}: Updated ${batchDocs.length} documents (${processed}/${docsWithFields.length})`);
    }
    
    console.log(`\n✅ Successfully deleted fields from ${processed} documents!`);
    console.log('=' .repeat(80));
    
    // Verify deletion
    console.log('\n🔍 Verifying deletion...');
    const verifySnapshot = await getDocs(findingsRef);
    let remainingFields = 0;
    
    verifySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      const hasFields = FIELDS_TO_DELETE.filter(field => field in data && data[field] !== null);
      if (hasFields.length > 0) {
        remainingFields++;
        console.log(`   ⚠️  ${docSnap.id} still has: ${hasFields.join(', ')}`);
      }
    });
    
    if (remainingFields === 0) {
      console.log('   ✅ All fields successfully deleted!');
    } else {
      console.log(`   ⚠️  ${remainingFields} documents still have some fields`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
  
  process.exit(0);
}

deleteColumns();
