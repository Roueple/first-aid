/**
 * Utility to clear old findings and reseed with new schema
 * Run this from browser console after logging in
 */

import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { seedNewFindings } from './seedDataNew';

/**
 * Clear all findings from the database
 */
export async function clearAllFindings(): Promise<void> {
  console.log('🗑️  Starting to clear all findings...');
  
  try {
    const findingsCollection = collection(db, 'findings');
    const snapshot = await getDocs(findingsCollection);
    
    let deleteCount = 0;
    const deletePromises = snapshot.docs.map(async (document) => {
      await deleteDoc(doc(db, 'findings', document.id));
      deleteCount++;
      console.log(`   Deleted: ${document.id}`);
    });
    
    await Promise.all(deletePromises);
    
    console.log(`✅ Cleared ${deleteCount} findings from database`);
  } catch (error) {
    console.error('❌ Error clearing findings:', error);
    throw error;
  }
}

/**
 * Clear old data and seed new data
 */
export async function clearAndReseed(): Promise<void> {
  console.log('🔄 Starting clear and reseed process...\n');
  
  try {
    // Step 1: Clear old data
    await clearAllFindings();
    
    console.log('\n⏳ Waiting 2 seconds before seeding...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 2: Seed new data
    await seedNewFindings();
    
    console.log('\n✨ Clear and reseed complete!');
    console.log('💡 Refresh your page to see the new data.');
  } catch (error) {
    console.error('❌ Error during clear and reseed:', error);
    throw error;
  }
}

/**
 * Expose functions globally for console access
 */
if (typeof window !== 'undefined') {
  (window as any).clearAllFindings = clearAllFindings;
  (window as any).clearAndReseed = clearAndReseed;
}
