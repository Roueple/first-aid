@echo off
echo ================================================================================
echo IT FINDINGS 2024 - DATABASE VERIFICATION
echo ================================================================================
echo.
echo This script will:
echo 1. Query the database for all IT findings in 2024
echo 2. Test the DocAI query simulation
echo.
pause

echo.
echo ================================================================================
echo STEP 1: Getting expected results from database...
echo ================================================================================
echo.
node scripts/check-it-findings-2024.mjs

echo.
echo ================================================================================
echo STEP 2: Testing DocAI query simulation...
echo ================================================================================
echo.
node scripts/test-docai-it-findings.mjs

echo.
echo ================================================================================
echo COMPLETE
echo ================================================================================
echo.
echo Now you can test in the actual DocAI interface with:
echo "show all IT findings 2024"
echo.
echo Expected result: 6 findings from Asuransi Ciputra Life
echo.
pause
