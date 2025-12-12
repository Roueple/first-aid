@echo off
echo ========================================
echo FIRST-AID Data Import Script
echo ========================================
echo.
echo This script will:
echo 1. Import projects from projects-export.xlsx
echo 2. Import audit results from audit-result.xlsx
echo 3. Calculate F/NF counts for each project
echo.
echo Make sure:
echo - Both Excel files are in the project root
echo - Excel files are NOT open
echo - You have serviceaccountKey.json configured
echo.
pause

npm run import:all

echo.
echo ========================================
echo Import Complete!
echo ========================================
pause
