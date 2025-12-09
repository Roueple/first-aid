@echo off
echo Cleaning up consolidated MD files...

del /F /Q "AUDIT-RESULTS-DASHBOARD.md" 2>nul
del /F /Q "AUDIT-RESULTS-MIGRATION.md" 2>nul
del /F /Q "AUDIT-RESULTS-PERMISSION-FIX.md" 2>nul
del /F /Q "AUDIT-RESULTS-QUICK-START.md" 2>nul
del /F /Q "AUDIT-RESULTS-VISUAL-GUIDE.md" 2>nul
del /F /Q "CHAT-TABLE-UI-COMPLETE.md" 2>nul
del /F /Q "CHAT-TABLE-VISUAL-GUIDE.md" 2>nul
del /F /Q "CHECKPOINT-RESTORE.md" 2>nul
del /F /Q "COMPLETE-REIMPORT-GUIDE.md" 2>nul
del /F /Q "DEPARTMENT-FILTER-FIX.md" 2>nul
del /F /Q "DEPLOYMENT-CHECKLIST.md" 2>nul
del /F /Q "EXPORT-COMPLETENESS-REPORT.md" 2>nul
del /F /Q "HYBRID-RAG-IMPLEMENTATION-COMPLETE.md" 2>nul
del /F /Q "HYBRID-RAG-QUICKSTART.md" 2>nul
del /F /Q "HYBRID-RAG-README.md" 2>nul
del /F /Q "IMPLEMENTATION-CHECKLIST.md" 2>nul
del /F /Q "IMPLEMENTATION-SUMMARY.md" 2>nul
del /F /Q "IMPORT-SUCCESS.md" 2>nul
del /F /Q "IMPORT-TROUBLESHOOTING.md" 2>nul
del /F /Q "INSTALLATION-GUIDE.md" 2>nul
del /F /Q "PROJECT-COUNTS-FIX.md" 2>nul
del /F /Q "PROJECT-INITIALS-COMPLETE.md" 2>nul
del /F /Q "PROJECTS-IMPLEMENTATION-SUMMARY.md" 2>nul
del /F /Q "PROJECTS-TABLE-COMPLETE.md" 2>nul
del /F /Q "PROJECTS-TABLE-VISUAL-GUIDE.md" 2>nul
del /F /Q "QUICK-REFERENCE.md" 2>nul
del /F /Q "REIMPORT-READY.md" 2>nul
del /F /Q "REIMPORT-SUCCESS.md" 2>nul
del /F /Q "REORGANIZATION-COMPLETE.md" 2>nul
del /F /Q "SECURITY-NOTE.md" 2>nul
del /F /Q "SMART-FILTER-SOLUTION.md" 2>nul
del /F /Q "SOLUTION-COMPLETE.md" 2>nul
del /F /Q "developer-comment.md" 2>nul
del /F /Q "developer-comment-2.md" 2>nul
del /F /Q "log.md" 2>nul
del /F /Q "service.md" 2>nul

echo.
echo Cleanup complete!
echo.
echo Remaining MD files in root:
echo - README.md
echo - PROJECT-STRUCTURE.md
echo - DOCUMENTATION.md
echo - DOCUMENTATION-INDEX.md (if exists)
echo.
echo All content has been consolidated into:
echo - docs/CONSOLIDATED-GUIDES.md
echo - docs/FEATURE-SUMMARIES.md
echo.
pause
