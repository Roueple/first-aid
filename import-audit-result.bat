@echo off
echo ========================================
echo Import Audit Results from audit-result.xlsx
echo ========================================
echo.

node scripts/import-audit-result-xlsx.mjs

echo.
echo ========================================
echo Import Complete
echo ========================================
pause
