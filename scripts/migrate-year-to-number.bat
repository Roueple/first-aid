@echo off
echo ========================================
echo Migrating Year Field to Number Format
echo ========================================
echo.

node scripts/migrate-year-to-number.mjs

echo.
echo ========================================
echo Migration Complete!
echo ========================================
pause
