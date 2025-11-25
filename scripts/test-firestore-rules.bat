@echo off
REM Firestore Security Rules Testing Script for Windows
REM This script helps test Firestore security rules using the Firebase Emulator

echo ==========================================
echo FIRST-AID Firestore Rules Testing
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

REM Start emulator
echo Starting Firebase Emulator...
echo.
echo The emulator UI will be available at: http://localhost:4000
echo.
echo To test the rules:
echo 1. Open http://localhost:4000 in your browser
echo 2. Go to Authentication tab and create test users
echo 3. Go to Firestore tab and test read/write operations
echo 4. Verify rules are enforced correctly
echo.
echo Press Ctrl+C to stop the emulator
echo.

firebase emulators:start
