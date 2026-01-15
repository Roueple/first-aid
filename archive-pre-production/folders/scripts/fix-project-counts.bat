@echo off
echo ========================================
echo Fix Project Counts from Audit Results
echo ========================================
echo.
echo This script will recalculate project counts
echo based on the audit-results table.
echo.
pause
node scripts/fix-project-counts-from-audit-results.mjs
pause
