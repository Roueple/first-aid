@echo off
REM Verify what files will remain after archiving

echo.
echo ============================================================
echo PRODUCTION FILES VERIFICATION
echo ============================================================
echo.
echo This shows what will REMAIN after running archive-production-prep.bat
echo.

echo [PAGES - src/renderer/pages]
dir /B src\renderer\pages\*.tsx 2>nul | findstr /V /I "ProjectsPage AuthTestPage"
echo.

echo [COMPONENTS - src/components]
dir /B src\components\*.tsx 2>nul | findstr /V /I "ProjectsTable FindingSummaryTable ChatResultsTable FindingEditDialog FindingDetailsPanel"
echo.

echo [SERVICES - src/services]
dir /B src\services\*.ts 2>nul | findstr /V /I "ProjectService FindingService AuditResultService AuditService QueryRouterService QueryClassifier FilterExtractor ContextBuilder ResponseFormatter IntentRecognitionService SmartFilterExtractor SchemaService SemanticSearchService AuditResultAdapter AuditResultContextBuilder MCPService DocAIService DocQueryLogService DocChatHistoryService DocSessionService DocChatService DocAISimpleQueryService DocAIResultFormatter DocAIFilterExtractor DocAIQueryBuilder ChatSessionService"
echo.

echo [ROOT CONFIG FILES]
dir /B *.json *.js *.ts 2>nul
echo.

echo [BATCH FILES (after archive)]
echo - archive-production-prep.bat
echo - run-dev.bat
echo - build-installer.bat
echo.

echo ============================================================
echo Press any key to continue...
pause >nul
