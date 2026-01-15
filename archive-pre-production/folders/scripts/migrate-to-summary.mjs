import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

// Firebase config
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Generate a 7-digit project ID from SH-ProjectName-Type
 */
function generateProjectId(sh, projectName, projectType) {
  const combined = `${sh}-${projectName}-${projectType}`;

  // Create a simple hash
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to positive 7-digit number
  const positiveHash = Math.abs(hash);
  const sevenDigit = (positiveHash % 9000000) + 1000000; // Ensures 7 digits (1000000-9999999)

  return sevenDigit.toString();
}

async function createProjectsFromFindings() {
  console.log('🚀 Creating Projects table from Findings...');

  try {
    // Get all findings
    const findingsRef = collection(db, 'findings');
    const findingsSnapshot = await getDocs(findingsRef);
    
    console.log(`📊 Found ${findingsSnapshot.size} findings`);

    // Group findings by project
    const projectMap = new Map();

    for (const doc of findingsSnapshot.docs) {
      const finding = doc.data();
      const projectKey = `${finding.projectName}|${finding.projectType}`;

      if (!projectMap.has(projectKey)) {
        projectMap.set(projectKey, {
          projectName: finding.projectName,
          projectType: finding.projectType,
          sh: finding.subholding,
          findings: [],
        });
      }

      projectMap.get(projectKey).findings.push(finding);
    }

    console.log(`📦 Found ${projectMap.size} unique projects`);

    // Create project records
    const projectsRef = collection(db, 'projects');

    for (const [, projectData] of projectMap.entries()) {
      const findings = projectData.findings;
      
      // Calculate aggregated stats
      const total = findings.reduce((sum, f) => sum + (f.findingTotal || 0), 0);
      const findingCount = findings.length;

      // Generate 7-digit project ID
      const projectId = generateProjectId(
        projectData.sh,
        projectData.projectName,
        projectData.projectType
      );

      const projectRecord = {
        projectId,
        sh: projectData.sh || '',
        projectName: projectData.projectName || '',
        projectType: projectData.projectType || '',
        total: total,
        finding: findingCount,
        nonFinding: 0,
        type: projectData.projectType || '',
        subtype: '', // You can customize this
        description: `${projectData.projectType} project with ${findingCount} findings`,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: 'migration-script',
      };

      await addDoc(projectsRef, projectRecord);
      console.log(`✅ Created project: ${projectRecord.projectName} (ID: ${projectId})`);
    }

    console.log(`\n✨ Migration complete! Created ${projectMap.size} project records.`);
    console.log(`\n📋 Summary:`);
    console.log(`   - Total findings: ${findingsSnapshot.size}`);
    console.log(`   - Unique projects: ${projectMap.size}`);
    console.log(`   - Average findings per project: ${(findingsSnapshot.size / projectMap.size).toFixed(1)}`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

createProjectsFromFindings();
