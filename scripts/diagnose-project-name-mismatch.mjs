import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import ExcelJS from 'exceljs';
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

async function diagnoseProjectNameMismatch() {
  console.log('🔍 DIAGNOSING PROJECT NAME MISMATCHES\n');
  console.log('='.repeat(70));
  
  // 1. Get all project names from Firestore
  console.log('\n📊 Loading projects from Firestore...');
  const projectsSnapshot = await db.collection('projects').get();
  const firestoreProjects = new Map();
  
  projectsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    firestoreProjects.set(data.projectName, {
      id: doc.id,
      name: data.projectName,
      initials: data.initials
    });
  });
  
  console.log(`✅ Loaded ${firestoreProjects.size} projects from Firestore`);
  
  // 2. Get all project names from Excel
  console.log('\n📄 Loading project names from Excel...');
  const excelPath = join(__dirname, '..', 'Master-finding.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const worksheet = workbook.worksheets[0];
  
  const excelProjects = new Set();
  const projectCounts = new Map();
  
  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const projectName = row.getCell(3).value?.toString().trim();
    
    if (projectName) {
      excelProjects.add(projectName);
      projectCounts.set(projectName, (projectCounts.get(projectName) || 0) + 1);
    }
  }
  
  console.log(`✅ Found ${excelProjects.size} unique project names in Excel`);
  console.log(`   Total rows: ${worksheet.rowCount - 1}`);
  
  // 3. Find mismatches
  console.log('\n' + '='.repeat(70));
  console.log('🔍 ANALYZING MISMATCHES');
  console.log('='.repeat(70));
  
  const notInFirestore = [];
  const notInExcel = [];
  const matched = [];
  
  // Check Excel projects against Firestore
  for (const excelProject of excelProjects) {
    if (firestoreProjects.has(excelProject)) {
      matched.push({
        name: excelProject,
        count: projectCounts.get(excelProject),
        id: firestoreProjects.get(excelProject).id
      });
    } else {
      notInFirestore.push({
        name: excelProject,
        count: projectCounts.get(excelProject)
      });
    }
  }
  
  // Check Firestore projects against Excel
  for (const [firestoreName, data] of firestoreProjects) {
    if (!excelProjects.has(firestoreName)) {
      notInExcel.push({
        name: firestoreName,
        id: data.id,
        initials: data.initials
      });
    }
  }
  
  // 4. Report matched projects
  console.log(`\n✅ MATCHED PROJECTS: ${matched.length}`);
  console.log('-'.repeat(70));
  if (matched.length > 0) {
    console.log('(Showing first 10)');
    matched.slice(0, 10).forEach((project, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${project.name.padEnd(45)} (${project.count} rows)`);
    });
    if (matched.length > 10) {
      console.log(`... and ${matched.length - 10} more matched projects`);
    }
  }
  
  // 5. Report projects in Excel but NOT in Firestore
  console.log(`\n❌ IN EXCEL BUT NOT IN FIRESTORE: ${notInFirestore.length}`);
  console.log('-'.repeat(70));
  if (notInFirestore.length > 0) {
    notInFirestore.sort((a, b) => b.count - a.count);
    notInFirestore.forEach((project, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${project.name.padEnd(45)} (${project.count} rows)`);
    });
    
    const totalAffectedRows = notInFirestore.reduce((sum, p) => sum + p.count, 0);
    console.log(`\n⚠️  Total affected rows: ${totalAffectedRows}`);
  }
  
  // 6. Report projects in Firestore but NOT in Excel
  console.log(`\n⚠️  IN FIRESTORE BUT NOT IN EXCEL: ${notInExcel.length}`);
  console.log('-'.repeat(70));
  if (notInExcel.length > 0) {
    console.log('(Showing first 20)');
    notInExcel.slice(0, 20).forEach((project, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${project.name.padEnd(45)} [${project.initials}]`);
    });
    if (notInExcel.length > 20) {
      console.log(`... and ${notInExcel.length - 20} more`);
    }
  }
  
  // 7. Look for similar names (fuzzy matching)
  console.log('\n' + '='.repeat(70));
  console.log('🔍 POTENTIAL NAME VARIATIONS (Fuzzy Match)');
  console.log('='.repeat(70));
  
  const suggestions = [];
  
  for (const excelProject of notInFirestore) {
    for (const [firestoreName, data] of firestoreProjects) {
      // Simple similarity check
      const excelLower = excelProject.name.toLowerCase();
      const firestoreLower = firestoreName.toLowerCase();
      
      // Check if one contains the other or very similar
      if (excelLower.includes(firestoreLower) || 
          firestoreLower.includes(excelLower) ||
          levenshteinDistance(excelLower, firestoreLower) < 5) {
        suggestions.push({
          excel: excelProject.name,
          firestore: firestoreName,
          count: excelProject.count,
          similarity: calculateSimilarity(excelLower, firestoreLower)
        });
      }
    }
  }
  
  if (suggestions.length > 0) {
    suggestions.sort((a, b) => b.similarity - a.similarity);
    console.log('\nPossible matches found:');
    suggestions.slice(0, 20).forEach((sugg, index) => {
      console.log(`\n${index + 1}. Excel:     "${sugg.excel}"`);
      console.log(`   Firestore: "${sugg.firestore}"`);
      console.log(`   Rows affected: ${sugg.count}`);
      console.log(`   Similarity: ${(sugg.similarity * 100).toFixed(1)}%`);
    });
  } else {
    console.log('\nNo similar names found.');
  }
  
  // 8. Summary and recommendations
  console.log('\n' + '='.repeat(70));
  console.log('📋 SUMMARY & RECOMMENDATIONS');
  console.log('='.repeat(70));
  
  console.log(`\n📊 Statistics:`);
  console.log(`   Total Excel projects: ${excelProjects.size}`);
  console.log(`   Total Firestore projects: ${firestoreProjects.size}`);
  console.log(`   Matched: ${matched.length}`);
  console.log(`   Not in Firestore: ${notInFirestore.length}`);
  console.log(`   Not in Excel: ${notInExcel.length}`);
  
  if (notInFirestore.length > 0) {
    const totalAffectedRows = notInFirestore.reduce((sum, p) => sum + p.count, 0);
    console.log(`\n⚠️  ${totalAffectedRows} audit result rows will have NULL projectId`);
    
    console.log(`\n💡 RECOMMENDATIONS:`);
    console.log(`\n1. Add missing projects to Firestore:`);
    console.log(`   - Create ${notInFirestore.length} new project records`);
    console.log(`   - Use project names exactly as they appear in Excel`);
    
    console.log(`\n2. Or update Excel project names to match Firestore:`);
    console.log(`   - Review the fuzzy matches above`);
    console.log(`   - Update Excel to use exact Firestore names`);
    
    console.log(`\n3. Or accept NULL projectId for unmatched projects:`);
    console.log(`   - Import will continue with projectId = null`);
    console.log(`   - Can be fixed later with update script`);
  } else {
    console.log(`\n✅ All Excel projects exist in Firestore!`);
  }
  
  // 9. Generate SQL-like update statements
  if (suggestions.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('🔧 SUGGESTED FIXES (Copy-paste ready)');
    console.log('='.repeat(70));
    console.log('\nIf Excel names should match Firestore, update Excel with:');
    suggestions.slice(0, 10).forEach((sugg, index) => {
      console.log(`\n${index + 1}. Find: "${sugg.excel}"`);
      console.log(`   Replace with: "${sugg.firestore}"`);
      console.log(`   (${sugg.count} rows affected)`);
    });
  }
}

// Helper: Levenshtein distance
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Helper: Calculate similarity percentage
function calculateSimilarity(str1, str2) {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - (distance / maxLength);
}

diagnoseProjectNameMismatch()
  .then(() => {
    console.log('\n✅ Diagnosis complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Diagnosis failed:', error);
    process.exit(1);
  });
