@echo off
REM Show what will be archived vs kept

echo.
echo ============================================================
echo PRODUCTION ARCHIVE SUMMARY
echo ============================================================
echo.

echo CURRENT FILE COUNTS:
echo.
echo Pages:
dir /B src\renderer\pages\*.tsx 2>nul | find /C ".tsx"
echo.
echo Components:
dir /B src\components\*.tsx 2>nul | find /C ".tsx"
echo.
echo Services:
dir /B src\services\*.ts 2>nul | find /C ".ts"
echo.
echo Hooks:
dir /B src\hooks\*.ts 2>nul | find /C ".ts"
echo.
echo Utils:
dir /B src\utils\*.ts 2>nul | find /C ".ts"
echo.
echo Types:
dir /B src\types\*.ts 2>nul | find /C ".ts"
echo.
echo Scripts:
dir /B scripts\*.mjs 2>nul | find /C ".mjs"
echo.
echo Batch files:
dir /B *.bat 2>nul | find /C ".bat"
echo.

echo ============================================================
echo AFTER ARCHIVING, YOU WILL HAVE:
echo ============================================================
echo.
echo Pages: 2 files
echo   - PasswordlessLoginPage.tsx
echo   - FelixPage.tsx
echo.
echo Components: ~10 files
echo   - FelixResultsTable.tsx
echo   - AuditResultsTable.tsx
echo   - ErrorBoundary.tsx
echo   - ProtectedRoute.tsx
echo   - UI components (cat-animation, felix-vanish-input, etc.)
echo.
echo Services: 11 files
echo   - Core: Auth, Database, Gemini
echo   - Felix: FelixService, FelixChatService, FelixSessionService
echo   - Support: Department, Category, SmartQueryRouter, AuditResult
echo   - Utils: DataMasking, TransparentLogger
echo.
echo Hooks: 3 files
echo   - useErrorHandler, useFirebaseConnection, useRetryHandler
echo.
echo Utils: 5 files
echo   - stringSimilarity, connectionMonitor
echo   - ErrorHandler, RetryHandler
echo   - auditResultExcelExport
echo.
echo Types: 6 files
echo   - felix.types, filter.types, user.types
echo   - category.types, electron.d.ts, index.ts
echo.
echo Scripts: 0 files (all archived)
echo.
echo Batch files: 3 files
echo   - run-dev.bat
echo   - build-installer.bat
echo   - archive-production-prep.bat
echo.
echo ============================================================
echo ESTIMATED SIZE REDUCTION: ~70-80%%
echo ============================================================
echo.
pause
