@echo off
echo ========================================
echo Department Normalization Script
echo ========================================
echo.
echo This script will:
echo 1. Fetch all departments from audit-results
echo 2. Normalize and deduplicate them
echo 3. Generate searchable keywords
echo 4. Store in the departments collection
echo.
echo Press Ctrl+C to cancel, or
pause

node scripts/normalize-departments.mjs

echo.
echo ========================================
echo Script completed!
echo ========================================
pause
