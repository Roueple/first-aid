@echo off
echo ========================================
echo GIT HISTORY CLEANER
echo ========================================
echo.
echo This script will remove sensitive files from git history.
echo.
echo PREREQUISITES:
echo [1] You have revoked all old API keys
echo [2] You have generated new API keys
echo [3] You have updated .env with new keys
echo [4] You have replaced serviceaccountKey.json
echo [5] You have downloaded bfg.jar to this folder
echo.
echo Have you completed all prerequisites? (Y/N)
set /p ready=
if /i not "%ready%"=="Y" (
    echo.
    echo Please complete the prerequisites first!
    echo See SECURITY-FIX-CHECKLIST.txt for details.
    pause
    exit
)

echo.
echo Checking for bfg.jar...
if not exist bfg.jar (
    echo [ERROR] bfg.jar not found!
    echo.
    echo Download from: https://rtyley.github.io/bfg-repo-cleaner/
    echo Save as: bfg.jar in this folder
    pause
    exit
)

echo [OK] bfg.jar found
echo.

echo Checking Java installation...
java -version 2>nul
if errorlevel 1 (
    echo [ERROR] Java not found!
    echo Please install Java from: https://adoptium.net/
    pause
    exit
)
echo [OK] Java installed
echo.

echo ========================================
echo STEP 1: CREATE BACKUP
echo ========================================
echo.
echo Creating backup in parent folder...
cd ..
if exist first-aid-backup.git (
    echo Backup already exists. Skipping...
) else (
    git clone --mirror https://github.com/Roueple/first-aid.git first-aid-backup.git
    echo [OK] Backup created: first-aid-backup.git
)
cd FIRST-AID
echo.
pause

echo ========================================
echo STEP 2: CLEAN GIT HISTORY
echo ========================================
echo.
echo Removing .env from history...
java -jar bfg.jar --delete-files .env --no-blob-protection
echo.

echo Removing serviceaccountKey.json from history...
java -jar bfg.jar --delete-files serviceaccountKey.json --no-blob-protection
echo.

echo Removing .test-credentials.json from history...
java -jar bfg.jar --delete-files .test-credentials.json --no-blob-protection
echo.

echo [OK] Files removed from history
pause

echo ========================================
echo STEP 3: CLEANUP GIT
echo ========================================
echo.
echo Expiring reflog...
git reflog expire --expire=now --all
echo.

echo Running garbage collection...
git gc --prune=now --aggressive
echo.

echo [OK] Git cleanup complete
pause

echo ========================================
echo STEP 4: FORCE PUSH TO GITHUB
echo ========================================
echo.
echo WARNING: This will rewrite history on GitHub!
echo All collaborators will need to re-clone the repository.
echo.
echo Current remote:
git remote -v
echo.
echo Do you want to force push now? (Y/N)
set /p dopush=
if /i not "%dopush%"=="Y" (
    echo.
    echo Skipping push. You can push later with:
    echo   git push --force
    pause
    exit
)

echo.
echo Force pushing to GitHub...
git push --force

if errorlevel 1 (
    echo.
    echo [ERROR] Push failed!
    echo You may need to authenticate or check your internet connection.
    pause
    exit
)

echo.
echo [SUCCESS] Force push complete!
echo.

echo ========================================
echo VERIFICATION
echo ========================================
echo.
echo Checking current status...
git status
echo.

echo ========================================
echo COMPLETE!
echo ========================================
echo.
echo Your git history has been cleaned and pushed to GitHub.
echo.
echo NEXT STEPS:
echo 1. Verify on GitHub that sensitive files are gone
echo 2. Test your application: npm run dev
echo 3. Inform collaborators to re-clone the repository
echo.
pause
