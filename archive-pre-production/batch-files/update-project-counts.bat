@echo off
echo ========================================
echo Update Project Counts from Audit Results
echo ========================================
echo.
echo This will update finding, nonFinding, and total columns
echo in the projects table by counting from audit-results.
echo.
echo Code F = Findings
echo Code NF = Non-Findings
echo.
pause

npm run update:project-counts

echo.
echo ========================================
echo Update Complete!
echo ========================================
pause
