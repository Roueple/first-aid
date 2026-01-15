@echo off
REM ============================================================
REM FIRST-AID Production Archive Script
REM ============================================================
REM Archives all development/unused files before production build
REM Keeps only: Auth + Felix + AuditResultsTable + Core Services
REM ============================================================

echo.
echo ============================================================
echo FIRST-AID PRODUCTION ARCHIVE
echo ============================================================
echo.
echo This will archive all unnecessary files for production.
echo Only Auth, Felix, and core functionality will remain.
echo.
pause

REM Create archive structure
echo Creating archive structure...
mkdir archive-pre-production\pages 2>nul
mkdir archive-pre-production\components 2>nul
mkdir archive-pre-production\services 2>nul
mkdir archive-pre-production\scripts 2>nul
mkdir archive-pre-production\docs 2>nul
mkdir archive-pre-production\tests 2>nul
mkdir archive-pre-production\root-files 2>nul
mkdir archive-pre-production\batch-files 2>nul
mkdir archive-pre-production\folders 2>nul

echo.
echo [1/10] Archiving unused pages...
move src\renderer\pages\ProjectsPage.tsx archive-pre-production\pages\ 2>nul
move src\renderer\pages\AuthTestPage.tsx archive-pre-production\pages\ 2>nul
move src\renderer\pages\DashboardPage.README.md archive-pre-production\pages\ 2>nul
move src\renderer\pages\SettingsPage.README.md archive-pre-production\pages\ 2>nul

echo [2/10] Archiving unused components...
REM Keep: FelixResultsTable, AuditResultsTable, ErrorBoundary, ProtectedRoute
REM Keep: All UI components (ui/ and magicui/ folders)
REM Archive: Project/Finding/Dashboard related components
move src\components\ProjectsTable.tsx archive-pre-production\components\ 2>nul
move src\components\FindingSummaryTable.tsx archive-pre-production\components\ 2>nul
move src\components\ChatResultsTable.tsx archive-pre-production\components\ 2>nul
move src\components\FindingEditDialog.tsx archive-pre-production\components\ 2>nul
move src\components\FindingDetailsPanel.tsx archive-pre-production\components\ 2>nul
move src\components\FindingsTable.tsx archive-pre-production\components\ 2>nul
move src\components\ChatInterface.tsx archive-pre-production\components\ 2>nul
move src\components\ChatInput.tsx archive-pre-production\components\ 2>nul
move src\components\ChatMessage.tsx archive-pre-production\components\ 2>nul
move src\components\AuditLogViewer.tsx archive-pre-production\components\ 2>nul
move src\components\FilterPanel.tsx archive-pre-production\components\ 2>nul
move src\components\LocationSummaryChart.tsx archive-pre-production\components\ 2>nul
move src\components\RiskDistributionChart.tsx archive-pre-production\components\ 2>nul
move src\components\StatisticsCard.tsx archive-pre-production\components\ 2>nul
move src\components\SearchBar.tsx archive-pre-production\components\ 2>nul
move src\components\PaginationControls.tsx archive-pre-production\components\ 2>nul
move src\components\NotificationSystem.tsx archive-pre-production\components\ 2>nul
move src\components\OperationQueueStatus.tsx archive-pre-production\components\ 2>nul
move src\components\ConnectionStatus.tsx archive-pre-production\components\ 2>nul
move src\components\LoginForm.tsx archive-pre-production\components\ 2>nul
move src\components\AuthGuard.tsx archive-pre-production\components\ 2>nul
REM Archive component README files
move src\components\*.README.md archive-pre-production\components\ 2>nul

echo [3/10] Archiving unused services...
REM Keep: AuthService, FelixService, FelixChatService, FelixSessionService
REM Keep: GeminiService, DatabaseService, DataMaskingService, TransparentLogger
REM Keep: DepartmentService, CategoryService, SmartQueryRouter
REM Keep: AuditResultService (needed by AuditResultsTable)
REM Archive everything else
move src\services\ProjectService.ts archive-pre-production\services\ 2>nul
move src\services\FindingService.ts archive-pre-production\services\ 2>nul
move src\services\AuditService.ts archive-pre-production\services\ 2>nul
move src\services\QueryRouterService.ts archive-pre-production\services\ 2>nul
move src\services\QueryClassifier.ts archive-pre-production\services\ 2>nul
move src\services\FilterExtractor.ts archive-pre-production\services\ 2>nul
move src\services\ContextBuilder.ts archive-pre-production\services\ 2>nul
move src\services\ResponseFormatter.ts archive-pre-production\services\ 2>nul
move src\services\IntentRecognitionService.ts archive-pre-production\services\ 2>nul
move src\services\SmartFilterExtractor.ts archive-pre-production\services\ 2>nul
move src\services\SchemaService.ts archive-pre-production\services\ 2>nul
move src\services\SemanticSearchService.ts archive-pre-production\services\ 2>nul
move src\services\AuditResultAdapter.ts archive-pre-production\services\ 2>nul
move src\services\AuditResultContextBuilder.ts archive-pre-production\services\ 2>nul
move src\services\MCPService.ts archive-pre-production\services\ 2>nul
move src\services\DocAIService.ts archive-pre-production\services\ 2>nul
move src\services\DocQueryLogService.ts archive-pre-production\services\ 2>nul
move src\services\DocChatHistoryService.ts archive-pre-production\services\ 2>nul
move src\services\DocSessionService.ts archive-pre-production\services\ 2>nul
move src\services\DocChatService.ts archive-pre-production\services\ 2>nul
move src\services\DocAISimpleQueryService.ts archive-pre-production\services\ 2>nul
move src\services\DocAIResultFormatter.ts archive-pre-production\services\ 2>nul
move src\services\DocAIFilterExtractor.ts archive-pre-production\services\ 2>nul
move src\services\DocAIQueryBuilder.ts archive-pre-production\services\ 2>nul
move src\services\ChatSessionService.ts archive-pre-production\services\ 2>nul
move src\services\ChatSessionService.README.md archive-pre-production\services\ 2>nul

echo [4/10] Archiving development scripts...
move scripts archive-pre-production\folders\ 2>nul

echo [5/10] Archiving batch files...
move *.bat archive-pre-production\batch-files\ 2>nul
REM Restore this script and essential ones
move archive-pre-production\batch-files\archive-production-prep.bat . 2>nul
move archive-pre-production\batch-files\run-dev.bat . 2>nul
move archive-pre-production\batch-files\build-installer.bat . 2>nul

echo [6/10] Archiving root junk files...
move console.log* archive-pre-production\root-files\ 2>nul
move process.exit* archive-pre-production\root-files\ 2>nul
move k.includes* archive-pre-production\root-files\ 2>nul
move echo archive-pre-production\root-files\ 2>nul
move { archive-pre-production\root-files\ 2>nul
move $null archive-pre-production\root-files\ 2>nul
move Dance*.* archive-pre-production\root-files\ 2>nul
move kategori_temuan.csv archive-pre-production\root-files\ 2>nul
move email-whitelist-*.* archive-pre-production\root-files\ 2>nul
move .test-credentials.json archive-pre-production\root-files\ 2>nul
move audit-result*.* archive-pre-production\root-files\ 2>nul
move projects-export.* archive-pre-production\root-files\ 2>nul

echo [7/10] Archiving documentation...
move docs archive-pre-production\folders\ 2>nul
move docs-archive archive-pre-production\folders\ 2>nul
move PASSWORDLESS-AUTH-SETUP.md archive-pre-production\docs\ 2>nul
move SECURITY-SETUP.md archive-pre-production\docs\ 2>nul
move SECURITY-FIX-CHECKLIST.txt archive-pre-production\docs\ 2>nul
move START-HERE.txt archive-pre-production\docs\ 2>nul
move devnote.md archive-pre-production\docs\ 2>nul
move DOCUMENTATION-INDEX.md archive-pre-production\docs\ 2>nul

echo [8/10] Archiving tests...
move tests archive-pre-production\folders\ 2>nul
move test-results archive-pre-production\folders\ 2>nul

echo [9/10] Archiving unused folders...
move copy archive-pre-production\folders\ 2>nul
move scripts-archive archive-pre-production\folders\ 2>nul
move src-archive archive-pre-production\folders\ 2>nul
move .claude archive-pre-production\folders\ 2>nul
move .firebase archive-pre-production\folders\ 2>nul
move .kiro\specs archive-pre-production\folders\ 2>nul

echo [10/10] Archiving unused hooks and utils...
REM Keep only: stringSimilarity, connectionMonitor, ErrorHandler, RetryHandler
move src\hooks\useAuditLogs.ts archive-pre-production\services\ 2>nul
move src\hooks\useDashboardStats.ts archive-pre-production\services\ 2>nul
move src\hooks\useFindings.ts archive-pre-production\services\ 2>nul

REM Archive unused utils (keep stringSimilarity, connectionMonitor, ErrorHandler, RetryHandler, auditResultExcelExport)
move src\utils\excelExport.ts archive-pre-production\services\ 2>nul
move src\utils\seedData.ts archive-pre-production\services\ 2>nul

echo [11/12] Archiving unused type files...
REM Keep: felix.types, filter.types, user.types, category.types, electron.d.ts, index.ts
move src\types\audit.types.ts archive-pre-production\services\ 2>nul
move src\types\chat.types.ts archive-pre-production\services\ 2>nul
move src\types\docAI.types.ts archive-pre-production\services\ 2>nul
move src\types\finding.constants.ts archive-pre-production\services\ 2>nul
move src\types\finding.types.ts archive-pre-production\services\ 2>nul
move src\types\pattern.types.ts archive-pre-production\services\ 2>nul
move src\types\project.types.ts archive-pre-production\services\ 2>nul
move src\types\queryRouter.types.ts archive-pre-production\services\ 2>nul
move src\types\report.types.ts archive-pre-production\services\ 2>nul
move src\types\summary.types.ts archive-pre-production\services\ 2>nul
move src\types\README.md archive-pre-production\services\ 2>nul

echo [12/12] Cleaning up test directories...
rmdir /S /Q src\services\__tests__ 2>nul
rmdir /S /Q src\components\__tests__ 2>nul
rmdir /S /Q src\utils\__tests__ 2>nul
rmdir /S /Q src\types\__tests__ 2>nul
rmdir /S /Q src\renderer\pages\__tests__ 2>nul

echo.
echo ============================================================
echo ARCHIVE COMPLETE!
echo ============================================================
echo.
echo All archived files: archive-pre-production\
echo.
echo PRODUCTION BUILD INCLUDES:
echo   Pages:
echo     - PasswordlessLoginPage (Auth)
echo     - FelixPage (AI Chat)
echo.
echo   Components:
echo     - FelixResultsTable
echo     - AuditResultsTable
echo     - ErrorBoundary
echo     - ProtectedRoute
echo     - UI components (cat-animation, felix-vanish-input, etc.)
echo.
echo   Services (10 files):
echo     - AuthService
echo     - FelixService, FelixChatService, FelixSessionService
echo     - GeminiService
echo     - DatabaseService
echo     - DataMaskingService
echo     - TransparentLogger
echo     - DepartmentService
echo     - CategoryService
echo     - SmartQueryRouter
echo     - AuditResultService (for AuditResultsTable)
echo.
echo   Utils (4 files):
echo     - stringSimilarity.ts
echo     - connectionMonitor.ts
echo     - ErrorHandler.ts
echo     - RetryHandler.ts
echo     - auditResultExcelExport.ts
echo.
echo   Hooks (3 files):
echo     - useErrorHandler.ts
echo     - useFirebaseConnection.ts
echo     - useRetryHandler.ts
echo.
echo   Types (6 files):
echo     - felix.types.ts
echo     - filter.types.ts
echo     - user.types.ts
echo     - category.types.ts
echo     - electron.d.ts
echo     - index.ts
echo.
echo   Config:
echo     - Firebase config
echo     - Electron config
echo     - Build config
echo.
echo Ready for production build!
echo Run: npm run build
echo Then: npm run dist:win
echo.
pause
