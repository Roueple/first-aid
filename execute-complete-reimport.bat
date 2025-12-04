@echo off
echo ========================================
echo COMPLETE AUDIT RESULTS REIMPORT
echo ========================================
echo.
echo WARNING: This will DELETE all existing audit-results!
echo.
pause
echo.

echo Step 1: Creating backup...
node scripts/backup-audit-results.mjs
if errorlevel 1 (
    echo Backup failed!
    pause
    exit /b 1
)
echo.

echo Step 2: Deploying Firestore rules...
call firebase deploy --only firestore:rules
if errorlevel 1 (
    echo Rule deployment failed!
    pause
    exit /b 1
)
echo.

echo Step 3: Running complete reimport...
node scripts/complete-reimport-audit-results.mjs
if errorlevel 1 (
    echo Reimport failed!
    pause
    exit /b 1
)
echo.

echo Step 4: Running final verification...
node scripts/final-verification.mjs
if errorlevel 1 (
    echo Verification failed!
    pause
    exit /b 1
)
echo.

echo ========================================
echo SUCCESS! Reimport completed!
echo ========================================
pause
