#!/usr/bin/env node
/**
 * Enhance Audit Tags with More Specific Tags
 * Adds detailed tags so auditors can understand findings at a glance
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

// More specific tags for auditor clarity
const SPECIFIC_TAGS = {
  // === FACILITIES & AMENITIES ===
  'Kolam Renang': [/kolam renang/i, /swimming pool/i, /pool/i],
  'Club House': [/club house/i, /clubhouse/i, /family club/i],
  'Water Park': [/water park/i, /waterpark/i],
  'Gym': [/\bgym\b/i, /fitness/i, /fitness center/i],
  'SPA': [/\bspa\b/i, /massage/i, /pijat/i],
  'Playground': [/playground/i, /taman bermain/i, /area bermain/i],
  
  // === WATER QUALITY ===
  'Kualitas Air Kolam': [/kadar.*ph/i, /ph.*kolam/i, /kualitas air/i, /chemical.*kolam/i, /kadar.*cl/i],
  
  // === HOTEL SPECIFIC ===
  'Kamar Hotel': [/kamar/i, /room/i, /guest room/i],
  'Extra Bed': [/extra bed/i],
  'Check In/Out': [/check.?in/i, /check.?out/i],
  'Concierge': [/concierge/i, /bell boy/i, /porter/i],
  'Business Center': [/business cent/i],
  'Grab & Go': [/grab.*go/i, /grab and go/i],
  'Breakfast': [/breakfast/i, /sarapan/i],
  
  // === PARKING ===
  'Parkir Tamu': [/parkir.*tamu/i, /guest parking/i, /valet/i],
  'Parkir Gratis': [/parkir gratis/i, /free parking/i],
  
  // === STOCK & INVENTORY ===
  'Stock Opname': [/stock opname/i, /opname.*stock/i, /opname.*barang/i],
  'Selisih Stock': [/selisih.*stock/i, /selisih kurang/i, /selisih lebih/i],
  'Chemical': [/chemical/i, /bahan kimia/i],
  'Linen': [/linen/i, /handuk/i, /towel/i, /sprei/i],
  'Chinaware': [/chinaware/i, /silverware/i, /glassware/i, /peralatan makan/i],
  
  // === EQUIPMENT ===
  'Loker': [/loker/i, /locker/i],
  'Kran': [/kran/i, /keran/i, /faucet/i],
  'Tangki': [/tangki/i, /tank/i],
  'Solar': [/solar/i, /bbm/i, /bahan bakar/i],
  
  // === MEMBERSHIP ===
  'Member Fitness': [/member.*fitness/i, /member.*gym/i, /membership/i],
  'Member Kolam': [/member.*kolam/i, /member.*renang/i],
  
  // === CONSIGNMENT ===
  'Consignment': [/consignment/i, /konsinyasi/i, /titip jual/i],
  
  // === CONDITION/DAMAGE ===
  'Kerusakan': [/kerusakan/i, /rusak/i, /damage/i, /broken/i],
  'Berlumut': [/lumut/i, /berlumut/i, /moss/i],
  'Tekanan Tidak Normal': [/tekanan.*tidak normal/i, /over pressure/i, /under pressure/i],
  
  // === LOGBOOK & RECORDS ===
  'Logbook': [/logbook/i, /log book/i, /buku catatan/i],
  'Catatan Pengunjung': [/catatan.*pengunjung/i, /visitor log/i, /daftar pengunjung/i],
  
  // === PRICING & TARIFF ===
  'Tarif Tidak Sesuai': [/tarif.*tidak sesuai/i, /harga.*tidak sesuai/i],
  'Implementasi Tarif': [/implementasi tarif/i, /penerapan tarif/i],
  
  // === HAZARD & SAFETY ===
  'Hazard Risk': [/hazard/i, /bahaya/i, /risiko keselamatan/i],
  'Good Environment': [/good environment/i, /lingkungan baik/i],
  
  // === PRASARANA ===
  'Prasarana': [/prasarana/i, /infrastruktur/i, /infrastructure/i],
  
  // === SPECIFIC AREAS ===
  'Area Publik': [/area publik/i, /public area/i, /area umum/i],
  'Cluster': [/cluster/i, /perumahan/i],
  
  // === DOCUMENTS ===
  'Kartu Stock': [/kartu stock/i, /stock card/i],
  'Berita Acara': [/berita acara/i, /ba\b/i, /minutes/i],
  
  // === SPECIFIC FINDINGS ===
  'Tidak Terpasang': [/tidak terpasang/i, /belum terpasang/i],
  'Tidak Tercatat': [/tidak tercatat/i, /tidak dicatat/i, /belum dicatat/i],
  'Tidak Lengkap': [/tidak lengkap/i, /belum lengkap/i, /kurang lengkap/i],
  'Tidak Sesuai': [/tidak sesuai/i, /belum sesuai/i],
  'Tidak Berfungsi': [/tidak berfungsi/i, /tidak dapat/i, /rusak/i],
};

function extractAdditionalTags(riskArea, description) {
  const text = `${riskArea || ''} ${description || ''}`;
  if (!text.trim()) return [];
  
  const tags = new Set();
  
  for (const [tag, patterns] of Object.entries(SPECIFIC_TAGS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        tags.add(tag);
        break;
      }
    }
  }
  
  return Array.from(tags);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  console.log('=== Enhance Audit Tags ===\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE UPDATE'}\n`);
  
  const snapshot = await db.collection('audit-results').get();
  console.log(`Processing ${snapshot.size} records...\n`);
  
  const stats = { processed: 0, enhanced: 0, newTagCounts: {} };
  const batches = [];
  let currentBatch = db.batch();
  let batchCount = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const existingTags = data.tags || [];
    const newTags = extractAdditionalTags(data.riskArea, data.description);
    
    // Merge existing and new tags
    const allTags = [...new Set([...existingTags, ...newTags])].sort();
    const addedTags = newTags.filter(t => !existingTags.includes(t));
    
    if (addedTags.length > 0) {
      addedTags.forEach(tag => {
        stats.newTagCounts[tag] = (stats.newTagCounts[tag] || 0) + 1;
      });
      
      if (!dryRun) {
        currentBatch.update(doc.ref, { tags: allTags });
        batchCount++;
        
        if (batchCount >= 500) {
          batches.push(currentBatch);
          currentBatch = db.batch();
          batchCount = 0;
        }
      }
      
      stats.enhanced++;
      
      if (stats.enhanced <= 10) {
        console.log(`${stats.enhanced}. ${data.projectName}`);
        console.log(`   Added: ${addedTags.join(', ')}\n`);
      }
    }
    
    stats.processed++;
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
  console.log(`Enhanced: ${stats.enhanced}`);
  
  console.log('\n=== NEW TAGS ADDED ===');
  Object.entries(stats.newTagCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tag, count]) => console.log(`  ${tag}: ${count}`));
}

main().then(() => process.exit(0)).catch(console.error);
