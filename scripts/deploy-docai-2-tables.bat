@echo off
echo ========================================
echo DocAI 2-Table Deployment Script
echo ========================================
echo.

echo Step 1: Creating DocAI 2-table structure...
node create-docai-2-tables.mjs
if %errorlevel% neq 0 (
    echo ERROR: Failed to create tables
    pause
    exit /b 1
)
echo.

echo Step 2: Verifying structure...
node verify-docai-2-tables.mjs
if %errorlevel% neq 0 (
    echo ERROR: Verification failed
    pause
    exit /b 1
)
echo.

echo Step 3: Deploying Firestore indexes...
call firebase deploy --only firestore:indexes
if %errorlevel% neq 0 (
    echo ERROR: Index deployment failed
    pause
    exit /b 1
)
echo.

echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Test Doc Assistant in your application
echo 2. Verify messages are stored in doc_chats
echo 3. Check analytics are working
echo.
pause
