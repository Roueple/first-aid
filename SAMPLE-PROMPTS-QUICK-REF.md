# Sample Prompts Quick Reference

## ✅ Implementation Complete

All 25 sample prompts have been successfully implemented and validated.

## 📋 The 25 Sample Prompts

### 🏘️ By Proyek & Kategori Temuan (5)
1. Temuan audit Housing category di CitraLand tahun 2023-2024
2. Finding audit Mall category Ciputra World Surabaya semua departemen
3. Audit finding proyek Hotel Ciputra Golf Club & Hotel
4. Semua temuan SH2 di proyek Housing dengan nilai >= 6
5. Temuan kategori Healthcare di Ciputra Hospital tahun 2024

### 💰 Finance & Accounting (5)
6. Temuan piutang dan collection di departemen Finance tahun 2024
7. Finding cash opname tidak rutin tanpa Berita Acara di Finance
8. Audit finding pencatatan akuntansi di Finance tahun 2023-2024
9. Temuan purchasing tidak sesuai prosedur SPK/PO perbandingan harga
10. Finding escrow KPR tidak sesuai prosedur di departemen Finance

### 🏗️ Engineering & QS (5)
11. Finding Engineering terkait material bekas atau pekerjaan tidak sesuai SPK
12. Temuan QS pekerjaan tambah kurang tidak didukung Instruksi Lapangan
13. Audit finding serah terima unit tanpa Form BAST
14. SPK klausul retensi tidak sesuai masa pemeliharaan kontrak
15. Temuan volume pekerjaan di departemen Engineering tahun 2024

### ⚖️ Legal & Legalitas (5)
16. Temuan legalitas tanah IMB belum lengkap atau tidak ada informasi di sistem
17. Finding SPPJB klausul tidak sesuai ketentuan kantor pusat
18. Audit finding pelaporan PPATK transaksi penjualan
19. Selisih luasan sertifikat di departemen Legal tahun 2023-2024
20. Temuan AJB belum balik nama atau proses balik nama tertunda

### 🏢 Estate & Property Management (5)
21. Finding outsourcing security di departemen Estate tahun 2024
22. Temuan lift atau sistem ARD tidak berfungsi di apartemen
23. Finding kebersihan dan estetika lingkungan cluster atau area mall
24. Audit finding BPJS karyawan dibayar lewat kasbon atau kas bon tidak sesuai prosedur
25. Temuan maintenance preventif di departemen Estate tahun 2023-2024

## 🧪 Validation Status

```
✅ Automated Test: 25/25 PASSED (100%)
⏳ Manual Test: Pending
```

## 🚀 How to Test

### Quick Test (Automated)
```bash
node scripts/test-sample-prompts.mjs
```

### Full Test (Manual)
1. Run app: `npm run dev`
2. Login to Bernard
3. Watch placeholder text cycle through prompts
4. Test each prompt manually
5. Verify results

## 📁 Files Changed

- ✅ `src/components/ui/bernard-vanish-input.tsx` - Updated placeholders
- ✅ `scripts/test-sample-prompts.mjs` - Validation script
- ✅ `scripts/test-sample-prompts.bat` - Windows wrapper
- ✅ `docs/sample-prompts-testing-guide.md` - Testing guide
- ✅ `docs/sample-prompts-summary.md` - Implementation summary
- ✅ `.kiro/specs/enhanced-sample-prompts/design.md` - Design doc

## 🎯 Key Features

✅ 100% validation pass rate
✅ All 5 audit domains covered
✅ Authentic Indonesian terminology
✅ Compatible with SmartQueryRouter
✅ No performance impact
✅ Easy to maintain

## 📚 Documentation

- **Testing Guide**: `docs/sample-prompts-testing-guide.md`
- **Summary**: `docs/sample-prompts-summary.md`
- **Design**: `.kiro/specs/enhanced-sample-prompts/design.md`

## ✨ What's New

**Before**: 10 generic prompts
**After**: 25 domain-specific prompts organized in 5 categories

All prompts use real Indonesian real estate audit terminology and demonstrate various query patterns (project-based, department-based, year-based, category-based, value-based, keyword-based).
