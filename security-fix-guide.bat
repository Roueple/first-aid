@echo off
echo ========================================
echo SECURITY FIX GUIDE - FIRST-AID PROJECT
echo ========================================
echo.
echo This guide will help you fix the exposed credentials.
echo Follow each step carefully.
echo.
pause

:STEP1
echo.
echo ========================================
echo STEP 1: REVOKE FIREBASE WEB API KEY
echo ========================================
echo.
echo 1. Open browser: https://console.cloud.google.com
echo 2. Select your Firebase project
echo 3. Go to: APIs ^& Services ^> Credentials
echo 4. Find API key ending in: ...R41uKS8
echo 5. Click TRASH ICON to delete it
echo 6. Click "+ CREATE CREDENTIALS" ^> "API Key"
echo 7. Copy the new key immediately
echo 8. Click "RESTRICT KEY" and configure:
echo    - HTTP referrers: http://localhost:*
echo    - API restrictions: Firebase Auth, Firestore, Identity Toolkit
echo 9. Click SAVE
echo.
echo IMPORTANT: Save the new key somewhere safe!
echo.
pause

:STEP2
echo.
echo ========================================
echo STEP 2: REVOKE GEMINI API KEY
echo ========================================
echo.
echo 1. Open browser: https://aistudio.google.com/app/apikey
echo 2. Find key ending in: ...NwZlHxIs
echo 3. Click DELETE icon
echo 4. Click "Create API Key"
echo 5. Select your Firebase project
echo 6. Copy the new key immediately
echo.
echo IMPORTANT: Save the new key somewhere safe!
echo.
pause

:STEP3
echo.
echo ========================================
echo STEP 3: REVOKE SERVICE ACCOUNT KEY
echo ========================================
echo.
echo 1. Open browser: https://console.firebase.google.com
echo 2. Select your project
echo 3. Click gear icon ^> Project settings
echo 4. Go to "Service accounts" tab
echo 5. Click "Manage service account permissions"
echo 6. Find: firebase-adminsdk-xxxxx@...
echo 7. Click three dots ^> "Manage keys"
echo 8. DELETE all existing keys
echo 9. Click "ADD KEY" ^> "Create new key"
echo 10. Select JSON format
echo 11. Click CREATE
echo 12. Save the downloaded file as: serviceaccountKey.json
echo.
echo IMPORTANT: Move the downloaded JSON file to this project folder!
echo.
pause

:STEP4
echo.
echo ========================================
echo STEP 4: UPDATE LOCAL .env FILE
echo ========================================
echo.
echo Opening .env file in notepad...
echo.
notepad .env
echo.
echo Update these lines with your NEW keys:
echo   VITE_FIREBASE_API_KEY=YOUR_NEW_FIREBASE_KEY
echo   VITE_GEMINI_API_KEY=YOUR_NEW_GEMINI_KEY
echo.
echo Did you update and save .env? (Press any key when done)
pause

:STEP5
echo.
echo ========================================
echo STEP 5: VERIFY serviceaccountKey.json
echo ========================================
echo.
if exist serviceaccountKey.json (
    echo [OK] serviceaccountKey.json found!
) else (
    echo [ERROR] serviceaccountKey.json NOT found!
    echo Please move the downloaded JSON file here and rename it to:
    echo   serviceaccountKey.json
    echo.
    pause
    goto STEP5
)

:STEP6
echo.
echo ========================================
echo STEP 6: CLEAN GIT HISTORY
echo ========================================
echo.
echo WARNING: This will rewrite git history!
echo Make sure you completed Steps 1-5 first.
echo.
echo Do you want to continue? (Y/N)
set /p continue=
if /i not "%continue%"=="Y" goto END

echo.
echo Creating backup...
cd ..
git clone --mirror https://github.com/Roueple/first-aid.git first-aid-backup.git
cd FIRST-AID

echo.
echo Checking for BFG Repo Cleaner...
if not exist bfg.jar (
    echo [ERROR] bfg.jar not found!
    echo.
    echo Please download BFG Repo Cleaner:
    echo 1. Go to: https://rtyley.github.io/bfg-repo-cleaner/
    echo 2. Download bfg-1.14.0.jar
    echo 3. Save it in this folder as: bfg.jar
    echo.
    pause
    goto STEP6
)

echo.
echo Removing sensitive files from git history...
java -jar bfg.jar --delete-files .env --no-blob-protection
java -jar bfg.jar --delete-files serviceaccountKey.json --no-blob-protection
java -jar bfg.jar --delete-files .test-credentials.json --no-blob-protection

echo.
echo Cleaning up git...
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo.
echo Git history cleaned!
echo.
echo IMPORTANT: You need to force push to GitHub:
echo   git push --force
echo.
echo WARNING: This will rewrite history on GitHub!
echo Do you want to push now? (Y/N)
set /p push=
if /i "%push%"=="Y" (
    git push --force
    echo.
    echo [SUCCESS] Changes pushed to GitHub!
)

:END
echo.
echo ========================================
echo SECURITY FIX COMPLETE!
echo ========================================
echo.
echo Summary of what was done:
echo [X] Revoked old Firebase API key
echo [X] Revoked old Gemini API key
echo [X] Revoked old Service Account key
echo [X] Updated .env with new keys
echo [X] Replaced serviceaccountKey.json
echo [X] Cleaned git history
echo [X] Force pushed to GitHub
echo.
echo Your credentials are now secure!
echo.
echo NEXT STEPS:
echo 1. Test your app: npm run dev
echo 2. Verify Firebase connection works
echo 3. Verify Gemini AI works
echo.
pause
