@echo off
echo ========================================
echo UPDATE AUDIT RESULTS FROM EXCEL
echo ========================================
echo.
echo This will update the audit-results table with data from audit-result.xlsx
echo while preserving all relationships (projectId, etc.)
echo.
echo Press Ctrl+C to cancel, or
pause

node scripts/update-audit-results-from-excel.mjs

echo.
echo ========================================
echo Script completed!
echo ========================================
pause
