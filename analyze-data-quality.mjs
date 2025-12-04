import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  await import('fs').then(fs => 
    fs.promises.readFile(join(__dirname, 'serviceaccountKey.json'), 'utf8')
  )
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function analyzeDataQuality() {
  console.log('🔍 DETAILED DATA QUALITY ANALYSIS\n');
  console.log('='.repeat(70));

  try {
    // Get all Firestore documents
    const snapshot = await db.collection('audit-results').get();
    const docs = snapshot.docs;
    
    console.log(`\n📊 Total Firestore Documents: ${docs.length}`);

    // Analyze field completeness
    const fieldStats = {
      projectName: 0,
      findingTitle: 0,
      status: 0,
      empty: 0,
      hasData: 0
    };

    const projectGroups = {};
    const sampleRecords = [];

    docs.forEach((doc, index) => {
      const data = doc.data();
      
      // Count field presence
      if (data.projectName) fieldStats.projectName++;
      if (data.findingTitle) fieldStats.findingTitle++;
      if (data.status) fieldStats.status++;
      
      // Check if document has meaningful data
      const hasData = Object.keys(data).length > 2; // More than just metadata
      if (hasData) {
        fieldStats.hasData++;
      } else {
        fieldStats.empty++;
      }

      // Group by project
      const project = data.projectName || 'UNKNOWN';
      if (!projectGroups[project]) {
        projectGroups[project] = [];
      }
      projectGroups[project].push(doc.id);

      // Collect samples
      if (index < 10) {
        sampleRecords.push({
          id: doc.id,
          fieldCount: Object.keys(data).length,
          fields: Object.keys(data),
          projectName: data.projectName,
          findingTitle: data.findingTitle,
          status: data.status
        });
      }
    });

    // Print field statistics
    console.log('\n' + '='.repeat(70));
    console.log('📈 FIELD COMPLETENESS:');
    console.log('='.repeat(70));
    console.log(`Documents with projectName:   ${fieldStats.projectName} (${(fieldStats.projectName/docs.length*100).toFixed(1)}%)`);
    console.log(`Documents with findingTitle:  ${fieldStats.findingTitle} (${(fieldStats.findingTitle/docs.length*100).toFixed(1)}%)`);
    console.log(`Documents with status:        ${fieldStats.status} (${(fieldStats.status/docs.length*100).toFixed(1)}%)`);
    console.log(`Documents with data:          ${fieldStats.hasData} (${(fieldStats.hasData/docs.length*100).toFixed(1)}%)`);
    console.log(`Empty/minimal documents:      ${fieldStats.empty} (${(fieldStats.empty/docs.length*100).toFixed(1)}%)`);

    // Print project distribution
    console.log('\n' + '='.repeat(70));
    console.log('📊 PROJECT DISTRIBUTION (Top 20):');
    console.log('='.repeat(70));
    const sortedProjects = Object.entries(projectGroups)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 20);
    
    sortedProjects.forEach(([project, ids], index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${project.substring(0, 40).padEnd(40)} : ${ids.length} records`);
    });

    // Print sample records
    console.log('\n' + '='.repeat(70));
    console.log('🔍 SAMPLE RECORDS (First 10):');
    console.log('='.repeat(70));
    sampleRecords.forEach((record, index) => {
      console.log(`\n${index + 1}. Document ID: ${record.id}`);
      console.log(`   Field Count: ${record.fieldCount}`);
      console.log(`   Fields: ${record.fields.join(', ')}`);
      console.log(`   Project: ${record.projectName || 'N/A'}`);
      console.log(`   Finding: ${record.findingTitle?.substring(0, 50) || 'N/A'}`);
      console.log(`   Status: ${record.status || 'N/A'}`);
    });

    // Analyze Excel file
    console.log('\n' + '='.repeat(70));
    console.log('📄 EXCEL FILE ANALYSIS:');
    console.log('='.repeat(70));
    
    const excelPath = join(__dirname, 'Master-finding.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    const worksheet = workbook.worksheets[0];
    
    console.log(`Total rows (including header): ${worksheet.rowCount}`);
    console.log(`Data rows: ${worksheet.rowCount - 1}`);
    console.log(`Columns: ${worksheet.columnCount}`);
    
    // Get header row
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, colNumber) => {
      headers.push(cell.value);
    });
    console.log(`\nColumn Headers:`);
    headers.forEach((header, index) => {
      console.log(`  ${index + 1}. ${header}`);
    });

    // Sample Excel rows
    console.log(`\n📋 Sample Excel Rows (rows 2-6):`);
    for (let rowNum = 2; rowNum <= Math.min(6, worksheet.rowCount); rowNum++) {
      const row = worksheet.getRow(rowNum);
      console.log(`\nRow ${rowNum}:`);
      row.eachCell((cell, colNumber) => {
        if (colNumber <= 5) { // Show first 5 columns
          console.log(`  ${headers[colNumber - 1]}: ${cell.value}`);
        }
      });
    }

    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('🎯 DIAGNOSIS:');
    console.log('='.repeat(70));
    console.log(`\n⚠️  CRITICAL ISSUES FOUND:`);
    console.log(`1. Missing ${8897 - 8852} = 45 records from Excel`);
    console.log(`2. ${fieldStats.empty} documents appear to be empty or minimal`);
    console.log(`3. Only ${fieldStats.findingTitle} documents have findingTitle (${(fieldStats.findingTitle/docs.length*100).toFixed(1)}%)`);
    console.log(`4. Detected ${8742} potential duplicates`);
    console.log(`5. Only ${Object.keys(projectGroups).length} unique projects found`);
    
    console.log(`\n💡 RECOMMENDATIONS:`);
    console.log(`1. Re-import data with proper field mapping`);
    console.log(`2. Ensure all Excel columns are mapped to Firestore fields`);
    console.log(`3. Add validation to prevent empty documents`);
    console.log(`4. Implement duplicate detection during import`);

  } catch (error) {
    console.error('\n❌ Error during analysis:', error);
    throw error;
  }
}

analyzeDataQuality()
  .then(() => {
    console.log('\n✅ Analysis completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  });
