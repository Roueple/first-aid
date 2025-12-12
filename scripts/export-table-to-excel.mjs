#!/usr/bin/env node

/**
 * Export any Firestore collection to Excel
 * Usage: node scripts/export-table-to-excel.mjs <collection-name>
 * Example: node scripts/export-table-to-excel.mjs projects
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ExcelJS from 'exceljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get collection name from command line
const collectionName = process.argv[2];

if (!collectionName) {
  console.error('❌ Please provide a collection name');
  console.log('Usage: node scripts/export-table-to-excel.mjs <collection-name>');
  console.log('Example: node scripts/export-table-to-excel.mjs projects');
  process.exit(1);
}

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceaccountKey.json'), 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function exportToExcel() {
  try {
    console.log(`📥 Exporting collection: ${collectionName}\n`);

    const snapshot = await db.collection(collectionName).get();
    
    if (snapshot.empty) {
      console.log('⚠️  Collection is empty');
      return;
    }

    console.log(`📊 Found ${snapshot.size} documents\n`);

    // Convert to array of objects
    const data = [];
    snapshot.forEach(doc => {
      const docData = doc.data();
      
      // Convert Firestore Timestamps to dates
      const converted = { id: doc.id };
      for (const [key, value] of Object.entries(docData)) {
        if (value && typeof value === 'object' && value.toDate) {
          converted[key] = value.toDate();
        } else if (Array.isArray(value)) {
          converted[key] = JSON.stringify(value);
        } else if (typeof value === 'object' && value !== null) {
          converted[key] = JSON.stringify(value);
        } else {
          converted[key] = value;
        }
      }
      data.push(converted);
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(collectionName);

    // Get all unique keys for columns
    const allKeys = new Set();
    data.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });
    const columns = Array.from(allKeys);

    // Set columns
    worksheet.columns = columns.map(key => ({
      header: key,
      key: key,
      width: 20
    }));

    // Add rows
    data.forEach(item => {
      worksheet.addRow(item);
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Auto-filter
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length }
    };

    // Write file
    const outputFile = join(__dirname, '..', `${collectionName}-export.xlsx`);
    await workbook.xlsx.writeFile(outputFile);

    console.log(`✅ Exported ${data.length} documents to: ${collectionName}-export.xlsx`);
    console.log(`📊 Columns: ${columns.length}`);
    console.log(`📁 Location: ${outputFile}`);

  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

exportToExcel()
  .then(() => {
    console.log('\n✨ Export complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
