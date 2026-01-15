@echo off
REM Firestore Security Rules Deployment Script for Windows
REM This script deploys Firestore security rules to production

echo ==========================================
echo FIRST-AID Firestore Rules Deployment
echo ==========================================
echo.

REM Check if Firebase CLI is installed
where firebase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Firebase CLI is not installed
    echo.
    echo To install Firebase CLI, run:
    echo   npm install -g firebase-tools
    echo.
    exit /b 1
)

echo √ Firebase CLI is installed
echo.

REM Check if firestore.rules exists
if not exist "firestore.rules" (
    echo X firestore.rules file not found
    exit /b 1
)

echo √ firestore.rules file found
echo.

REM Show current project
echo Current Firebase project:
firebase use
echo.

REM Confirm deployment
set /p confirm="WARNING: Are you sure you want to deploy rules to production? (yes/no): "

if not "%confirm%"=="yes" (
    echo Deployment cancelled
    exit /b 0
)

echo.
echo Deploying Firestore security rules...
echo.

REM Deploy rules
firebase deploy --only firestore:rules

echo.
echo √ Deployment complete!
echo.
echo Next steps:
echo 1. Go to Firebase Console: https://console.firebase.google.com
echo 2. Navigate to Firestore Database ^> Rules
echo 3. Verify the rules are updated
echo 4. Test with a non-production account
echo.
