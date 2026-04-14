#!/usr/bin/env node

/**
 * Seed Department Tags Collection
 * 
 * Creates a static department_tags collection with comprehensive keyword mappings
 * for Bernard query processing.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Department tags data with 11 tags each
const departmentTagsData = [
  {
    departmentName: 'Departemen Marketing',
    tags: ['Marketing', 'Pemasaran', 'Sales', 'Penjualan', 'Branding', 'Promosi', 'Promotion', 'Iklan', 'Advertising', 'Komunikasi Pemasaran', 'Market Research'],
    category: 'Marketing & Sales'
  },
  {
    departmentName: 'Departemen Legal',
    tags: ['Legal', 'Hukum', 'Law', 'Kontrak', 'Contract', 'Kepatuhan', 'Compliance', 'Regulasi', 'Regulation', 'Litigasi', 'Litigation'],
    category: 'Legal & Compliance'
  },
  {
    departmentName: 'Departemen QS',
    tags: ['QS', 'Quantity Surveyor', 'Estimasi Biaya', 'Cost Estimation', 'RAB', 'Bill of Quantity', 'BOQ', 'Cost Control', 'Pengendalian Biaya', 'Teknik Sipil', 'Construction Cost'],
    category: 'Engineering & Construction'
  },
  {
    departmentName: 'Departemen Estate (City Management)',
    tags: ['Estate', 'City Management', 'Manajemen Kota', 'Pengelolaan Kawasan', 'Area Management', 'Kawasan', 'Properti', 'Property', 'Tata Kota', 'Urban Management', 'Real Estate'],
    category: 'Property Management'
  },
  {
    departmentName: 'Departemen Actuary',
    tags: ['Actuary', 'Aktuaria', 'Risk', 'Risiko', 'Statistik', 'Statistics', 'Asuransi', 'Insurance', 'Premi', 'Premium', 'Modeling'],
    category: 'Insurance & Actuarial'
  },
  {
    departmentName: 'Departemen Underwriting',
    tags: ['Underwriting', 'Penjaminan', 'Risiko', 'Risk Assessment', 'Polis', 'Policy', 'Asuransi', 'Insurance', 'Seleksi Risiko', 'Risk Selection', 'Premi'],
    category: 'Insurance & Actuarial'
  },
  {
    departmentName: 'Departemen Investasi',
    tags: ['Investasi', 'Investment', 'Portofolio', 'Portfolio', 'Saham', 'Stock', 'Obligasi', 'Bonds', 'Aset', 'Asset Management', 'Reksa Dana'],
    category: 'Finance'
  },
  {
    departmentName: 'Departemen APU PPT',
    tags: ['APU PPT', 'Anti Pencucian Uang', 'Anti Money Laundering', 'AML', 'Pendanaan Terorisme', 'Terrorism Financing', 'Kepatuhan', 'Compliance', 'KYC', 'Know Your Customer', 'PPATK'],
    category: 'Legal & Compliance'
  },
  {
    departmentName: 'Departemen Claim',
    tags: ['Claim', 'Klaim', 'Asuransi', 'Insurance', 'Ganti Rugi', 'Reimbursement', 'Investigasi Klaim', 'Claim Investigation', 'Penyelesaian Klaim', 'Claim Settlement', 'Loss Adjuster'],
    category: 'Insurance & Actuarial'
  },
  {
    departmentName: 'Departemen Finance And Accounting Departemen (FAD)',
    tags: ['Finance', 'Keuangan', 'Accounting', 'Akuntansi', 'FAD', 'Laporan Keuangan', 'Financial Report', 'Anggaran', 'Budget', 'Pembukuan', 'Bookkeeping'],
    category: 'Finance'
  },
  {
    departmentName: 'Departemen HRD',
    tags: ['HRD', 'Human Resources', 'SDM', 'Sumber Daya Manusia', 'Rekrutmen', 'Recruitment', 'Payroll', 'Penggajian', 'Pelatihan', 'Training', 'Pengembangan Karyawan'],
    category: 'HR'
  },
  {
    departmentName: 'Departemen Teknologi Informasi',
    tags: ['Teknologi Informasi', 'Information Technology', 'IT', 'TI', 'Sistem', 'System', 'Jaringan', 'Network', 'Software', 'Hardware', 'Infrastruktur IT'],
    category: 'IT'
  },
  {
    departmentName: 'Departemen Teknik/konstruksi',
    tags: ['Teknik', 'Konstruksi', 'Engineering', 'Construction', 'Sipil', 'Civil', 'Proyek', 'Project', 'Infrastruktur', 'Infrastructure', 'Bangunan'],
    category: 'Engineering & Construction'
  },
  {
    departmentName: 'Suplemen - Outsource/ Kerja sama dengan pihak ketiga',
    tags: ['Outsource', 'Outsourcing', 'Pihak Ketiga', 'Third Party', 'Vendor', 'Kerja Sama', 'Cooperation', 'Mitra', 'Partner', 'Subkontraktor', 'Subcontractor'],
    category: 'Outsourcing & Third Party'
  },
  {
    departmentName: 'Departemen Keperawatan dan Pelayanan Medik',
    tags: ['Keperawatan', 'Nursing', 'Pelayanan Medik', 'Medical Service', 'Perawat', 'Nurse', 'Kesehatan', 'Healthcare', 'Klinik', 'Clinic', 'Rumah Sakit'],
    category: 'Healthcare'
  },
  {
    departmentName: 'Departemen Penunjang Medis',
    tags: ['Penunjang Medis', 'Medical Support', 'Laboratorium', 'Laboratory', 'Radiologi', 'Radiology', 'Farmasi', 'Pharmacy', 'Diagnostik', 'Diagnostic', 'Alat Kesehatan'],
    category: 'Healthcare'
  },
  {
    departmentName: 'Departemen Umum',
    tags: ['Umum', 'General Affairs', 'GA', 'Logistik', 'Logistics', 'Fasilitas', 'Facility', 'Administrasi', 'Administration', 'Pengadaan', 'Procurement'],
    category: 'Operations'
  },
  {
    departmentName: 'Departemen Franchise Development Department (FDD)',
    tags: ['Franchise', 'FDD', 'Franchise Development', 'Pengembangan Waralaba', 'Waralaba', 'Ekspansi', 'Expansion', 'Mitra Bisnis', 'Business Partner', 'Lisensi', 'License'],
    category: 'Operations'
  },
  {
    departmentName: 'General Overview - Cooperate Hospital',
    tags: ['Cooperate Hospital', 'Rumah Sakit Kerja Sama', 'Rekanan Rumah Sakit', 'Hospital Network', 'Panel Rumah Sakit', 'Provider', 'Healthcare Provider', 'Jaringan Kesehatan', 'Asuransi Kesehatan', 'Health Insurance', 'Mitra Medis'],
    category: 'Healthcare'
  },
  {
    departmentName: 'Departemen Pusat Layanan Pelanggan',
    tags: ['Layanan Pelanggan', 'Customer Service', 'Call Center', 'CS', 'Pusat Layanan', 'Service Center', 'Komplain', 'Complaint', 'CRM', 'Customer Relations', 'Kepuasan Pelanggan'],
    category: 'Operations'
  },
  {
    departmentName: 'Departemen House Keeping & Property',
    tags: ['House Keeping', 'Kebersihan', 'Housekeeping', 'Properti', 'Property', 'Tata Graha', 'Cleaning', 'Fasilitas', 'Facility', 'Pemeliharaan', 'Maintenance'],
    category: 'Operations'
  },
  {
    departmentName: 'Departemen Engineering',
    tags: ['Engineering', 'Teknik', 'Mekanikal', 'Mechanical', 'Elektrikal', 'Electrical', 'Pemeliharaan', 'Maintenance', 'Sistem Bangunan', 'Building System', 'MEP'],
    category: 'Engineering & Construction'
  },
  {
    departmentName: 'Departemen Golf Operation',
    tags: ['Golf', 'Golf Operation', 'Operasional Golf', 'Golf Course', 'Golf Club', 'Lapangan Golf', 'Rekreasi', 'Recreation', 'Sport', 'Olahraga', 'Hospitality'],
    category: 'Hospitality & F&B'
  },
  {
    departmentName: 'Departemen Food & Beverage',
    tags: ['Food & Beverage', 'F&B', 'Makanan Minuman', 'Restoran', 'Restaurant', 'Katering', 'Catering', 'Dapur', 'Kitchen', 'Kuliner', 'Culinary'],
    category: 'Hospitality & F&B'
  },
  {
    departmentName: 'Departemen Golf Course Maintenance (GCM)',
    tags: ['Golf Course Maintenance', 'GCM', 'Pemeliharaan Lapangan Golf', 'Turf', 'Landscape', 'Lansekap', 'Taman', 'Garden', 'Agronomi', 'Agronomy', 'Irigasi'],
    category: 'Hospitality & F&B'
  },
  {
    departmentName: 'Departemen Finance & Accounting',
    tags: ['Finance', 'Keuangan', 'Accounting', 'Akuntansi', 'Laporan Keuangan', 'Financial Report', 'Anggaran', 'Budget', 'Pajak', 'Tax', 'Audit Internal'],
    category: 'Finance'
  },
  {
    departmentName: 'Department Family Club & Villa Operation',
    tags: ['Family Club', 'Villa', 'Villa Operation', 'Operasional Vila', 'Club', 'Resort', 'Resor', 'Hospitality', 'Akomodasi', 'Accommodation', 'Recreation'],
    category: 'Hospitality & F&B'
  },
  {
    departmentName: 'Building Management',
    tags: ['Building Management', 'Manajemen Gedung', 'Pengelolaan Gedung', 'Gedung', 'Building', 'Fasilitas', 'Facility', 'Operasional Gedung', 'Building Operation', 'Pemeliharaan', 'Property'],
    category: 'Property Management'
  },
  {
    departmentName: 'Departemen Sales & Marketing',
    tags: ['Sales', 'Penjualan', 'Marketing', 'Pemasaran', 'Promosi', 'Promotion', 'Target Penjualan', 'Sales Target', 'Akuisisi Pelanggan', 'Customer Acquisition', 'Branding'],
    category: 'Marketing & Sales'
  },
  {
    departmentName: 'Tenant Leasing & Related Legal Matter',
    tags: ['Tenant', 'Penyewa', 'Leasing', 'Sewa', 'Legal', 'Hukum', 'Kontrak Sewa', 'Lease Agreement', 'Properti Komersial', 'Commercial Property', 'Occupancy'],
    category: 'Property Management'
  },
  {
    departmentName: 'Building Operation',
    tags: ['Building Operation', 'Operasional Gedung', 'Mekanikal Elektrikal', 'MEP', 'Fasilitas', 'Facility Management', 'Teknik Gedung', 'Building Engineering', 'Utilitas', 'Utility', 'Pemeliharaan'],
    category: 'Property Management'
  },
  {
    departmentName: 'Departemen Perencanaan',
    tags: ['Perencanaan', 'Planning', 'Rencana Kerja', 'Work Plan', 'Strategi', 'Strategy', 'Anggaran', 'Budget', 'Proyek', 'Project Planning', 'Pengembangan'],
    category: 'Planning & Development'
  },
  {
    departmentName: 'Departemen Front Office',
    tags: ['Front Office', 'FO', 'Resepsionis', 'Receptionist', 'Check-in', 'Check-out', 'Tamu', 'Guest', 'Reservasi', 'Reservation', 'Hospitality'],
    category: 'Hospitality & F&B'
  },
  {
    departmentName: 'Departemen Tanah',
    tags: ['Tanah', 'Land', 'Pertanahan', 'Land Affairs', 'Sertifikat Tanah', 'Land Certificate', 'Akuisisi Tanah', 'Land Acquisition', 'ATR/BPN', 'Tata Ruang', 'Zoning'],
    category: 'Legal & Compliance'
  },
  {
    departmentName: 'Departemen Security',
    tags: ['Security', 'Keamanan', 'Satpam', 'Satuan Pengamanan', 'Penjagaan', 'Guard', 'Pengamanan', 'Protection', 'K3', 'Safety', 'SOP Keamanan'],
    category: 'Security'
  },
  {
    departmentName: 'Food Court (FC)',
    tags: ['Food Court', 'FC', 'Tenant Makanan', 'Food Tenant', 'Kuliner', 'Culinary', 'Penyewa Kuliner', 'Retail Food', 'Kantin', 'Cafeteria', 'F&B'],
    category: 'Hospitality & F&B'
  },
  {
    departmentName: 'Unit Pendidikan',
    tags: ['Pendidikan', 'Education', 'Sekolah', 'School', 'Pelatihan', 'Training', 'Pembelajaran', 'Learning', 'Kurikulum', 'Curriculum', 'Akademik'],
    category: 'Academic & Administration'
  },
  {
    departmentName: 'Departemen General Property',
    tags: ['General Property', 'Properti Umum', 'Pengelolaan Properti', 'Property Management', 'Aset Properti', 'Property Asset', 'Fasilitas', 'Facility', 'Gedung', 'Building', 'Real Estate'],
    category: 'Property Management'
  },
  {
    departmentName: 'Departemen ICT',
    tags: ['ICT', 'Information Communication Technology', 'Teknologi Informasi Komunikasi', 'IT', 'Jaringan', 'Network', 'Sistem', 'System', 'Infrastruktur', 'Infrastructure', 'Digital'],
    category: 'IT'
  },
  {
    departmentName: 'Manajemen Risiko Teknologi Informasi dan Keamanan Informasi',
    tags: ['Manajemen Risiko', 'Risk Management', 'Teknologi Informasi', 'IT', 'Keamanan Informasi', 'Information Security', 'Cyber Security', 'IT Risk', 'Risiko TI', 'IT Security', 'InfoSec'],
    category: 'IT'
  },
  {
    departmentName: 'Property Management',
    tags: ['Property Management', 'Manajemen Properti', 'Pengelolaan Properti', 'Aset', 'Asset', 'Real Estate', 'Gedung', 'Building', 'Sewa', 'Leasing', 'Fasilitas'],
    category: 'Property Management'
  },
  {
    departmentName: 'Departemen Building Management',
    tags: ['Building Management', 'Manajemen Gedung', 'Pengelolaan Gedung', 'Fasilitas', 'Facility', 'Properti', 'Property', 'Teknik Gedung', 'MEP', 'Operasional', 'Pemeliharaan'],
    category: 'Property Management'
  },
  {
    departmentName: 'Penerimaan TBS dan Sortasi',
    tags: ['TBS', 'Tandan Buah Segar', 'Fresh Fruit Bunch', 'FFB', 'Sortasi', 'Sorting', 'Kelapa Sawit', 'Palm Oil', 'Penerimaan Buah', 'Fruit Reception', 'Perkebunan'],
    category: 'Supply Chain & Procurement'
  },
  {
    departmentName: 'Departemen CSR Dan Legal',
    tags: ['CSR', 'Corporate Social Responsibility', 'Tanggung Jawab Sosial', 'Legal', 'Hukum', 'Komunitas', 'Community', 'Sosial', 'Social', 'Kepatuhan', 'Compliance'],
    category: 'CSR & Community'
  },
  {
    departmentName: 'Departemen Commercial & FFB Supplies',
    tags: ['Commercial', 'Komersial', 'FFB', 'Fresh Fruit Bunch', 'TBS', 'Tandan Buah Segar', 'Supplies', 'Pasokan', 'Rantai Pasok', 'Supply Chain', 'Kelapa Sawit'],
    category: 'Supply Chain & Procurement'
  },
  {
    departmentName: 'Biro Mahasiswa dan Alumni',
    tags: ['Mahasiswa', 'Student', 'Alumni', 'Kemahasiswaan', 'Student Affairs', 'Lulusan', 'Graduate', 'Akademik', 'Academic', 'Kampus', 'Campus'],
    category: 'Academic & Administration'
  }
];

async function seedDepartmentTags() {
  console.log('🌱 Starting department tags seeding...\n');

  const collectionRef = db.collection('department_tags');
  let successCount = 0;
  let errorCount = 0;

  for (const data of departmentTagsData) {
    try {
      const docData = {
        ...data,
        findingsCount: 0, // Will be calculated later
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await collectionRef.add(docData);
      console.log(`✅ Added: ${data.departmentName}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error adding ${data.departmentName}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Seeding complete:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📦 Total: ${departmentTagsData.length}`);
}

// Run the seeding
seedDepartmentTags()
  .then(() => {
    console.log('\n✨ Department tags seeding finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
