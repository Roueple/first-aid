#!/usr/bin/env node
/**
 * Tag remaining untagged records using department context and expanded patterns
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceaccountKey.json'), 'utf8')
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Extended patterns for previously untagged records
const EXTENDED_PATTERNS = {
  // Asset Management
  'Pengelolaan Asset': [/pengelolaan.*asset/i, /pengamanan.*asset/i, /asset.*perusahaan/i, /pengelolaan asset/i],
  'Opname Asset': [/opname/i, /stock opname/i],
  
  // Cash & Bank
  'Cash Management': [/cash.*bank/i, /cash dan bank/i, /opname berkala/i, /berita acara/i, /mutasi/i],
  
  // Estate/Property
  'Pengeluaran Estate': [/pengeluaran estate/i, /pembelanjaan/i, /pengeluaran/i],
  
  // Front Office (Hotel)
  'Front Office': [/front office/i, /penerimaan kas/i, /pertanggungjawaban/i],
  'Complimentary': [/complimentary/i, /voucher/i, /gratis/i],
  
  // Housekeeping
  'Housekeeping': [/observasi lapangan/i, /kamar/i, /lost and found/i],
  
  // Gudang/Warehouse
  'Gudang': [/gudang/i, /stock/i, /material/i, /perputaran/i, /warehouse/i],
  
  // ICT/IT
  'Asset ICT': [/asset ict/i, /pengelolaan.*ict/i, /it asset/i],
  
  // Production (F&B)
  'Production': [/production sheet/i, /cost/i, /produksi/i],
  
  // Komplain/Customer Service
  'Komplain': [/komplain/i, /complaint/i, /keluhan/i],
  
  // Transportasi
  'Transportasi': [/transportasi/i, /kendaraan/i, /ambulance/i, /operasional/i],
  
  // Appraisal/Performance
  'Appraisal': [/appraisal/i, /penilaian/i, /evaluasi/i, /feed back/i, /feedback/i],
  
  // Maintenance
  'Maintenance': [/maintenance/i, /pemeliharaan/i, /perawatan/i],
  
  // Golf specific
  'Golf': [/golf/i, /course/i, /gcm/i],
  
  // Kavling/Land
  'Kavling': [/kavling/i, /cluster/i, /hunian/i],
  
  // Rumah Stock
  'Rumah Stock': [/rumah stock/i, /stock.*tinggi/i],
  
  // Kehilangan/Loss
  'Kehilangan': [/kehilangan/i, /hilang/i, /loss/i],
  
  // Observasi
  'Observasi': [/observasi/i, /keadaan/i, /kondisi/i],
  
  // Franchise
  'Franchise': [/franchise/i, /fsd/i, /fdd/i],
  
  // Underwriting (Insurance)
  'Underwriting': [/underwriting/i, /actuary/i, /aktuaria/i],
  
  // APU PPT (Anti Money Laundering)
  'APU PPT': [/apu.*ppt/i, /anti.*pencucian/i],
  
  // Akademik (Education)
  'Akademik': [/akademik/i, /administrasi akademik/i, /biro/i],
};

// Department-based default tags when no pattern matches
const DEPT_DEFAULT_TAGS = {
  'Departemen Keuangan & Accounting': ['Keuangan'],
  'Departemen Finance Accounting': ['Keuangan'],
  'Finance & Accounting': ['Keuangan'],
  'Departement Finance & Accounting': ['Keuangan'],
  'Departemen Finance & Accounting': ['Keuangan'],
  'Departemen Estate (City Management)': ['Estate'],
  'Departemen HCM': ['HCM'],
  'Departemen HRD': ['HRD'],
  'HCM': ['HCM'],
  'Departemen Front Office': ['Front Office'],
  'Departemen Sales & Marketing': ['Sales Marketing'],
  'Departemen Tanah': ['Tanah'],
  'Departemen Umum': ['Umum'],
  'Engineering': ['Engineering'],
  'Departemen Engineering': ['Engineering'],
  'Departemen Food & Beverage': ['F&B'],
  'Departemen ICT': ['ICT'],
  'Departemen Pusat Layanan Pelanggan': ['Customer Service'],
  'Departemen General Property': ['Property'],
  'Departemen QS': ['QS'],
  'Departemen Teknik/konstruksi': ['Konstruksi'],
  'Departemen Marketing': ['Marketing'],
  'Biro Administrasi Akademik': ['Akademik'],
  'Building Operation': ['Building Operation'],
  'Unit Pendidikan': ['Pendidikan'],
  'Departemen House Keeping': ['Housekeeping'],
  'Departemen Penunjang Medis': ['Medis'],
  'Departement Golf Course Maintenance (GCM)': ['Golf', 'Maintenance'],
  'Departemen Franchise Support Development (FSD)': ['Franchise'],
  'Departemen Golf Operation': ['Golf'],
  'Marketing & Admission': ['Marketing', 'Akademik'],
  'Building Management': ['Building Management'],
  'Departemen Keperawatan dan Pelayanan Medik': ['Medis', 'Keperawatan'],
  'Property Management': ['Property'],
  'Departemen Building Management': ['Building Management'],
  'Departemen Actuary': ['Aktuaria'],
  'Audit IT - Asset Teknologi Informasi': ['IT Audit'],
  'Departemen Marketing/ HBD': ['Marketing'],
  'Departemen Franchise Development Department (FDD)': ['Franchise'],
  'Information & Service (Marketing)': ['Marketing'],
  'Departemen APU PPT': ['APU PPT', 'Compliance'],
  'Departemen Underwriting': ['Underwriting'],
  'Departemen Legal': ['Legal'],
};

function extractTags(riskArea, description, department) {
  const text = `${riskArea || ''} ${description || ''}`;
  const tags = new Set();
  
  // Try extended patterns first
  for (const [tag, patterns] of Object.entries(EXTENDED_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        tags.add(tag);
        break;
      }
    }
  }
  
  // If still no tags, use department default
  if (tags.size === 0 && department && DEPT_DEFAULT_TAGS[department]) {
    DEPT_DEFAULT_TAGS[department].forEach(t => tags.add(t));
  }
  
  // Final fallback - generic tag based on department category
  if (tags.size === 0) {
    if (department?.toLowerCase().includes('keuangan') || department?.toLowerCase().includes('finance')) {
      tags.add('Keuangan');
    } else if (department?.toLowerCase().includes('hcm') || department?.toLowerCase().includes('hrd')) {
      tags.add('HCM');
    } else if (department?.toLowerCase().includes('marketing') || department?.toLowerCase().includes('sales')) {
      tags.add('Marketing');
    } else if (department?.toLowerCase().includes('engineering')) {
      tags.add('Engineering');
    } else if (department?.toLowerCase().includes('estate')) {
      tags.add('Estate');
    } else {
      tags.add('Lain-lain');
    }
  }
  
  return Array.from(tags).sort();
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  console.log('=== Tag Untagged Records ===\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE UPDATE'}\n`);
  
  // Get all records without tags
  const snapshot = await db.collection('audit-results').get();
  
  const untagged = [];
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (!data.tags || data.tags.length === 0) {
      untagged.push({ doc, data });
    }
  });
  
  console.log(`Found ${untagged.length} untagged records\n`);
  
  const stats = { processed: 0, updated: 0, tagCounts: {} };
  const batches = [];
  let currentBatch = db.batch();
  let batchCount = 0;
  
  for (const { doc, data } of untagged) {
    const tags = extractTags(data.riskArea, data.description, data.department);
    
    tags.forEach(tag => {
      stats.tagCounts[tag] = (stats.tagCounts[tag] || 0) + 1;
    });
    
    if (!dryRun) {
      currentBatch.update(doc.ref, { tags });
      batchCount++;
      
      if (batchCount >= 500) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        batchCount = 0;
      }
    }
    
    stats.processed++;
    stats.updated++;
    
    if (stats.processed <= 20) {
      console.log(`${stats.processed}. [${data.department}]`);
      console.log(`   Risk: ${data.riskArea?.substring(0, 60) || '(empty)'}...`);
      console.log(`   Tags: ${tags.join(', ')}\n`);
    }
  }
  
  if (!dryRun && batchCount > 0) {
    batches.push(currentBatch);
  }
  
  if (!dryRun) {
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      console.log(`Committed batch ${i + 1}/${batches.length}`);
    }
  }
  
  console.log('\n=== STATISTICS ===');
  console.log(`Processed: ${stats.processed}`);
  console.log(`Updated: ${stats.updated}`);
  
  console.log('\n=== NEW TAG DISTRIBUTION ===');
  Object.entries(stats.tagCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tag, count]) => console.log(`  ${tag}: ${count}`));
}

main().then(() => process.exit(0)).catch(console.error);
