#!/usr/bin/env node
/**
 * Generate Tags for Audit Results
 * 
 * Tags are extracted from riskArea and description fields only.
 * Comprehensive Indonesian real estate domain tags.
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

// ============================================================================
// COMPREHENSIVE TAG DEFINITIONS - Indonesian Real Estate Domain
// ============================================================================

const TAG_PATTERNS = {
  // === LEGAL & COMPLIANCE ===
  'PPJB': [/ppjb/i, /perjanjian pengikatan jual beli/i, /sppjb/i],
  'AJB': [/\bajb\b/i, /akta jual beli/i, /proses ajb/i],
  'SHM': [/\bshm\b/i, /sertifikat hak milik/i],
  'SHGB': [/shgb/i, /sertifikat hak guna bangunan/i],
  'HGB': [/\bhgb\b/i, /hak guna bangunan/i],
  'IMB': [/\bimb\b/i, /izin mendirikan bangunan/i],
  'PBG': [/\bpbg\b/i, /persetujuan bangunan gedung/i],
  'PBB': [/\bpbb\b/i, /pajak bumi dan bangunan/i],
  'BPHTB': [/bphtb/i, /bea perolehan hak/i],
  'PPATK': [/ppatk/i, /pencucian uang/i, /anti money laundering/i],
  'Sertifikat': [/sertifikat/i, /certificate/i],
  'Perijinan': [/perijinan/i, /perizinan/i, /ijin/i, /izin/i, /permit/i],
  'Ganti Nama': [/ganti nama/i, /balik nama/i, /alih nama/i],
  'Alih Hak': [/alih hak/i, /pengalihan hak/i, /transfer hak/i],
  'Kontrak': [/kontrak/i, /perjanjian/i, /agreement/i, /mou/i, /surat konfirmasi/i],
  'Klausul': [/klausul/i, /clause/i, /ketentuan/i],
  
  // === SALES & MARKETING ===
  'NPV': [/\bnpv\b/i, /net present value/i],
  'Discount': [/discount/i, /diskon/i, /potongan harga/i, /koridor discount/i],
  'Komisi': [/komisi/i, /commission/i, /fee marketing/i, /insentif/i],
  'Rate': [/\brate\b/i, /tarif/i, /harga/i, /pricing/i],
  'Promosi': [/promosi/i, /promotion/i, /promo/i, /iklan/i],
  'Digital Marketing': [/digital marketing/i, /sosmed/i, /social media/i],
  'Barang Promosi': [/barang promosi/i, /merchandise/i, /souvenir/i, /gimmick/i],
  'Rumah Contoh': [/rumah contoh/i, /show unit/i, /mock up/i, /display/i],
  'Data Konsumen': [/data konsumen/i, /customer data/i, /database pelanggan/i],
  'Booking': [/booking/i, /reservasi/i, /pemesanan unit/i],
  'Cancellation': [/cancel/i, /batal/i, /pembatalan/i, /refund/i],
  
  // === FINANCE & ACCOUNTING ===
  'Cash Opname': [/cash opname/i, /kas opname/i, /opname kas/i, /cash count/i],
  'Cheque': [/cheque/i, /cek/i, /giro/i],
  'Time Deposit': [/time deposit/i, /deposito/i],
  'Escrow': [/escrow/i, /rekening penampungan/i],
  'KPR': [/\bkpr\b/i, /kredit pemilikan rumah/i, /mortgage/i, /cicilan/i],
  'Retensi': [/retensi/i, /retention/i],
  'Aging': [/aging/i, /umur piutang/i, /outstanding/i],
  'Titipan': [/titipan/i, /deposit/i, /uang muka/i, /dp\b/i],
  'Penyusutan': [/penyusutan/i, /depresiasi/i, /depreciation/i],
  'Jurnal': [/jurnal/i, /journal/i, /pencatatan/i, /posting/i],
  'Rekonsiliasi': [/rekonsiliasi/i, /reconciliation/i, /pencocokan/i],
  'Billing': [/billing/i, /penagihan/i, /tagihan/i, /invoice/i],
  'Pembayaran': [/pembayaran/i, /payment/i, /pelunasan/i],
  'Termin': [/termin/i, /installment/i, /angsuran/i],
  'Piutang': [/piutang/i, /receivable/i],
  'Hutang': [/hutang/i, /payable/i, /kewajiban/i],
  
  // === CONSTRUCTION & QS ===
  'Tender': [/tender/i, /lelang/i, /bidding/i, /pengadaan/i],
  'SPK': [/\bspk\b/i, /surat perintah kerja/i, /work order/i],
  'Pekerjaan Tambah': [/pekerjaan tambah/i, /variation order/i, /vo\b/i, /addendum/i],
  'Spesifikasi': [/spesifikasi/i, /specification/i, /spec/i],
  'Volume': [/volume/i, /kuantitas/i, /quantity/i],
  'Progress': [/progress/i, /kemajuan/i, /perkembangan/i],
  'Bobot': [/bobot/i, /weight/i, /persentase/i],
  'Kualitas Bangunan': [/kualitas bangunan/i, /mutu/i, /quality/i, /defect/i],
  'Kontraktor': [/kontraktor/i, /contractor/i, /vendor/i, /subkon/i],
  'PPH': [/pph/i, /pajak penghasilan/i, /withholding/i],
  'SBU': [/\bsbu\b/i, /sertifikat badan usaha/i],
  'RAB': [/\brab\b/i, /rencana anggaran/i, /budget/i],
  
  // === PROPERTY MANAGEMENT ===
  'Serah Terima': [/serah terima/i, /\bst\b/i, /handover/i, /bast/i],
  'IPL': [/\bipl\b/i, /iuran pengelolaan/i, /service charge/i, /maintenance fee/i],
  'Air': [/\bair\b/i, /water/i, /pdam/i, /tunggakan air/i, /tarif air/i],
  'Listrik': [/listrik/i, /electricity/i, /pln/i, /kwh/i],
  'Gas': [/\bgas\b/i, /pgn/i],
  'Utilities': [/utilities/i, /utilitas/i],
  'Renovasi': [/renovasi/i, /renovation/i, /ubah design/i, /ubah desain/i, /remodel/i],
  'Kawasan': [/kawasan/i, /area/i, /lingkungan/i, /observasi kawasan/i],
  'Tenant': [/tenant/i, /penyewa/i, /occupant/i],
  'Sewa': [/\bsewa\b/i, /rent/i, /lease/i],
  'Bagi Hasil': [/bagi hasil/i, /revenue sharing/i, /profit sharing/i],
  
  // === HR & HCM ===
  'Kontrak Kerja': [/kontrak kerja/i, /perjanjian kerja/i, /employment/i, /pkwt/i, /pkwtt/i],
  'BPJS': [/bpjs/i, /jamsostek/i, /jaminan sosial/i],
  'Asuransi': [/asuransi/i, /insurance/i, /inhealth/i],
  'Medical': [/medical/i, /kesehatan/i, /pengobatan/i, /klaim medis/i],
  'Tanda Kasih': [/tanda kasih/i, /bonus/i, /thr/i, /insentif/i],
  'Clearance': [/clearance/i, /resign/i, /pengunduran/i, /exit/i],
  'Ijazah': [/ijazah/i, /sertifikat/i, /training/i, /pelatihan/i],
  'Opname Asset': [/opname asset/i, /stock opname/i, /inventaris/i, /fixed asset/i],
  'Lembur': [/lembur/i, /overtime/i],
  'Cuti': [/\bcuti\b/i, /leave/i, /izin/i],
  
  // === BUILDING OPERATIONS ===
  'Parkir': [/parkir/i, /parking/i],
  'Security': [/security/i, /keamanan/i, /satpam/i, /guard/i],
  'APAR': [/apar/i, /pemadam/i, /fire extinguisher/i],
  'Hydrant': [/hydrant/i, /hidran/i],
  'Heat Detector': [/heat detector/i, /smoke detector/i, /fire alarm/i],
  'CCTV': [/cctv/i, /kamera/i, /surveillance/i],
  'Lift': [/\blift\b/i, /elevator/i],
  'Escalator': [/escalator/i, /eskalator/i],
  'AC': [/\bac\b/i, /air conditioning/i, /pendingin/i, /hvac/i],
  'Genset': [/genset/i, /generator/i],
  'Kebersihan': [/kebersihan/i, /cleaning/i, /housekeeping/i, /sanitasi/i],
  'Landscape': [/landscape/i, /lanskap/i, /taman/i, /pertamanan/i],
  
  // === MALL & RETAIL ===
  'Leasing': [/leasing/i, /penyewaan/i],
  'Fit Out': [/fit out/i, /fitout/i, /interior/i],
  'Grace Period': [/grace period/i, /masa tenggang/i],
  'Early Termination': [/early termination/i, /pemutusan dini/i],
  'Food Court': [/food court/i, /fc\b/i, /kantin/i],
  'Pameran': [/pameran/i, /exhibition/i, /event/i, /bazaar/i],
  'Member': [/\bmember\b/i, /loyalty/i, /membership/i],
  'Barter': [/barter/i, /tukar/i, /exchange/i],
  
  // === HOTEL & F&B ===
  'Room Rate': [/room rate/i, /tarif kamar/i, /rack rate/i],
  'Occupancy': [/occupancy/i, /okupansi/i, /tingkat hunian/i],
  'F&B': [/f&b/i, /food.*beverage/i, /makanan.*minuman/i],
  'Kitchen': [/kitchen/i, /dapur/i],
  'Banquet': [/banquet/i, /ballroom/i, /meeting room/i],
  'Laundry': [/laundry/i, /linen/i],
  'Minibar': [/minibar/i, /mini bar/i],
  'Room Service': [/room service/i, /in-room/i],
  
  // === HOSPITAL & MEDICAL ===
  'Jadwal Dokter': [/jadwal.*dokter/i, /praktek dokter/i, /schedule/i],
  'Perawat': [/perawat/i, /nurse/i, /keperawatan/i],
  'Alat Kesehatan': [/alat.*kesehatan/i, /medical equipment/i, /alkes/i],
  'Farmasi': [/farmasi/i, /pharmacy/i, /obat/i, /apotek/i],
  'Laboratorium': [/laboratorium/i, /lab\b/i],
  'Radiologi': [/radiologi/i, /rontgen/i, /x-ray/i, /ct scan/i, /mri/i],
  'Rawat Inap': [/rawat inap/i, /inpatient/i, /kamar pasien/i],
  'Rawat Jalan': [/rawat jalan/i, /outpatient/i, /poliklinik/i],
  'IGD': [/\bigd\b/i, /ugd/i, /emergency/i, /gawat darurat/i],
  'Rekam Medis': [/rekam medis/i, /medical record/i],
  
  // === SCHOOL & EDUCATION ===
  'Kurikulum': [/kurikulum/i, /curriculum/i],
  'SPP': [/\bspp\b/i, /uang sekolah/i, /tuition/i],
  'Siswa': [/siswa/i, /murid/i, /student/i, /pelajar/i],
  'Guru': [/\bguru\b/i, /teacher/i, /pengajar/i, /dosen/i],
  'Ekstrakurikuler': [/ekstrakurikuler/i, /ekskul/i, /extracurricular/i],
  
  // === INTERNAL CONTROL ===
  'Internal Control': [/internal control/i, /pengendalian internal/i, /kontrol internal/i],
  'SOP': [/\bsop\b/i, /prosedur/i, /procedure/i, /flow/i],
  'Otorisasi': [/otorisasi/i, /authorization/i, /approval/i, /persetujuan/i],
  'Koridor': [/koridor/i, /wewenang/i, /authority/i, /limit/i],
  'Segregation': [/segregation/i, /pemisahan tugas/i, /sod\b/i],
  'Monitoring': [/monitoring/i, /pengawasan/i, /supervisi/i],
  'Audit Trail': [/audit trail/i, /jejak audit/i, /log/i],
  'Compliance': [/compliance/i, /kepatuhan/i],
  
  // === IT & SYSTEM ===
  'Sistem': [/sistem/i, /system/i, /aplikasi/i, /software/i],
  'Database': [/database/i, /data/i, /input data/i],
  'Backup': [/backup/i, /cadangan/i],
  'Access Control': [/access control/i, /hak akses/i, /user access/i, /password/i],
  'Cyber Security': [/cyber/i, /keamanan informasi/i, /information security/i],
  
  // === GENERAL ===
  'Transaksi': [/transaksi/i, /transaction/i],
  'Dokumen': [/dokumen/i, /document/i, /berkas/i, /arsip/i],
  'Verifikasi': [/verifikasi/i, /verification/i, /validasi/i],
  'Laporan': [/laporan/i, /report/i, /reporting/i],
  'Deadline': [/deadline/i, /tenggat/i, /jatuh tempo/i, /due date/i],
  'Keterlambatan': [/terlambat/i, /delay/i, /keterlambatan/i, /overdue/i],
  'Selisih': [/selisih/i, /variance/i, /perbedaan/i, /discrepancy/i],
  'Kelengkapan': [/kelengkapan/i, /completeness/i, /lengkap/i],
};

// ============================================================================
// TAG EXTRACTION
// ============================================================================

function extractTags(riskArea, description) {
  const text = `${riskArea || ''} ${description || ''}`;
  if (!text.trim()) return [];
  
  const tags = new Set();
  
  for (const [tag, patterns] of Object.entries(TAG_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        tags.add(tag);
        break;
      }
    }
  }
  
  return Array.from(tags).sort();
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0');
  
  console.log('=== Audit Result Tag Generator ===\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
  if (limit > 0) console.log(`Limit: ${limit} documents`);
  console.log('');
  
  let query = db.collection('audit-results');
  if (limit > 0) query = query.limit(limit);
  
  const snapshot = await query.get();
  console.log(`Found ${snapshot.size} audit results\n`);
  
  const stats = { processed: 0, updated: 0, tagCounts: {} };
  const batches = [];
  let currentBatch = db.batch();
  let batchCount = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const tags = extractTags(data.riskArea, data.description);
    
    tags.forEach(tag => {
      stats.tagCounts[tag] = (stats.tagCounts[tag] || 0) + 1;
    });
    
    if (!dryRun && tags.length > 0) {
      currentBatch.update(doc.ref, { tags });
      batchCount++;
      
      if (batchCount >= 500) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        batchCount = 0;
      }
    }
    
    stats.processed++;
    if (tags.length > 0) stats.updated++;
    
    if (stats.processed <= 10) {
      console.log(`Sample ${stats.processed}:`);
      console.log(`  Project: ${data.projectName}`);
      console.log(`  Risk: ${data.riskArea?.substring(0, 60)}...`);
      console.log(`  Tags: ${tags.length > 0 ? tags.join(', ') : '(none)'}\n`);
    }
  }
  
  if (!dryRun && batchCount > 0) {
    batches.push(currentBatch);
  }
  
  // Commit all batches
  if (!dryRun) {
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      console.log(`Committed batch ${i + 1}/${batches.length}`);
    }
  }
  
  console.log('\n=== STATISTICS ===');
  console.log(`Processed: ${stats.processed}`);
  console.log(`With Tags: ${stats.updated}`);
  
  console.log('\n=== TAG DISTRIBUTION (top 30) ===');
  Object.entries(stats.tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .forEach(([tag, count]) => console.log(`  ${tag}: ${count}`));
}

main().then(() => process.exit(0)).catch(console.error);
