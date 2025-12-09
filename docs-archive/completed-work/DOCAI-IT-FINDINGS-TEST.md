# DocAI IT Findings 2024 - Manual Test Guide

## Quick Test Instructions

### 1. Run Database Verification (Optional)
```bash
test-it-findings-2024.bat
```

This confirms the expected results from the database.

### 2. Test in DocAI Interface

1. **Open the application** and navigate to the DocAI page
2. **Enter this exact query**:
   ```
   show all IT findings 2024
   ```
3. **Click Send** or press Enter

### 3. Expected Results

You should see **exactly 6 findings**, all with these characteristics:

- **Project**: Asuransi Ciputra Life
- **Year**: 2024
- **SH**: SH2
- **Department**: Manajemen Risiko Teknologi Informasi dan Keamanan Informasi
- **Code**: F (Finding)

#### The 6 Risk Areas Should Be:

1. Belum adanya pelaksanaan atas kegiatan mitigasi risiko atas hal yang telah dikategorikan berisiko tinggi
2. Belum adanya struktur organisasi Manajemen Risiko keamanan informasi
3. Belum adanya pengkajian ulang atas profil risiko secara berkala
4. Belum kebijakan Manajemen atas pengelolaan Manajemen Risiko terkait teknologi informasi termasuk di dalamnya keamanan informasi
5. Belum adanya definisi kepemilikan asset informasi, profil risiko dan ambang batas risiko yang ditentukan oleh Manajemen terkait teknologi informasi dan keamanan informasi
6. Belum adanya proses pelaporan manajemen risiko atas teknologi informasi dan keamanan informasi

### 4. Verification Checklist

- [ ] Query returns results (not empty)
- [ ] Total count is 6 findings
- [ ] All findings are from "Asuransi Ciputra Life"
- [ ] All findings are year 2024
- [ ] All findings have department containing "Teknologi Informasi"
- [ ] All findings have code "F"
- [ ] All 6 risk areas listed above are present

### 5. If Results Don't Match

#### Possible Issues:

**If you get 0 results:**
- Check if SimpleQueryService is properly configured for department filters
- Check if the query pattern matches "IT findings" correctly
- Verify department normalization is working

**If you get more than 6 results:**
- Check if the department filter is too broad
- Verify the year filter is working correctly

**If you get fewer than 6 results:**
- Check if some records are being filtered out incorrectly
- Verify all 6 IT departments are recognized

#### Debug Steps:

1. Check the query log in `doc-query-logs` collection
2. Review the parsed filters in the log
3. Check if department category mapping is correct
4. Run the verification script again:
   ```bash
   node scripts/check-it-findings-2024.mjs
   ```

## Alternative Queries to Test

Try these variations to ensure the system handles different phrasings:

1. `show IT findings 2024`
2. `list all IT findings in 2024`
3. `IT department findings 2024`
4. `show all findings for IT department in 2024`

All should return the same 6 results.

## Database Context

- **Total audit results in 2024**: 3,029
- **IT findings**: 6 (0.2%)
- **IT departments in system**: 6 different department names
- **Only 1 project** has IT findings in 2024

This is a good test case because:
- Small result set (easy to verify)
- Clear department category
- Single project (easy to identify)
- All findings have the same characteristics

## Success Criteria

✓ DocAI returns exactly 6 findings
✓ All findings match the expected project and department
✓ Query completes in reasonable time (< 5 seconds)
✓ Results are properly formatted and displayed
✓ No errors in console or logs
