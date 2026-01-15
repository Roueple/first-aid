@echo off
echo ========================================
echo SECURITY FIX VERIFICATION
echo ========================================
echo.

set errors=0

echo Checking .env file...
if exist .env (
    echo [OK] .env exists
    findstr /C:"AIzaSyBt1JoukjkIGvFhvEvf5B648QrvR41uKS8" .env >nul
    if not errorlevel 1 (
        echo [ERROR] Old Firebase key still in .env!
        set /a errors+=1
    ) else (
        echo [OK] Old Firebase key not found in .env
    )
    
    findstr /C:"AIzaSyBu0xBkBuu_s2Goy-kzvsRN9ILtFJ9Pr1I" .env >nul
    if not errorlevel 1 (
        echo [ERROR] Old Gemini key still in .env!
        set /a errors+=1
    ) else (
        echo [OK] Old Gemini key not found in .env
    )
) else (
    echo [ERROR] .env file not found!
    set /a errors+=1
)
echo.

echo Checking serviceaccountKey.json...
if exist serviceaccountKey.json (
    echo [OK] serviceaccountKey.json exists
    findstr /C:"private_key_id" serviceaccountKey.json >nul
    if errorlevel 1 (
        echo [ERROR] serviceaccountKey.json appears invalid!
        set /a errors+=1
    ) else (
        echo [OK] serviceaccountKey.json appears valid
    )
) else (
    echo [ERROR] serviceaccountKey.json not found!
    set /a errors+=1
)
echo.

echo Checking .gitignore...
if exist .gitignore (
    findstr /C:".env" .gitignore >nul
    if errorlevel 1 (
        echo [ERROR] .env not in .gitignore!
        set /a errors+=1
    ) else (
        echo [OK] .env is in .gitignore
    )
    
    findstr /C:"serviceaccountKey.json" .gitignore >nul
    if errorlevel 1 (
        echo [ERROR] serviceaccountKey.json not in .gitignore!
        set /a errors+=1
    ) else (
        echo [OK] serviceaccountKey.json is in .gitignore
    )
) else (
    echo [ERROR] .gitignore not found!
    set /a errors+=1
)
echo.

echo Checking git tracking...
git ls-files | findstr /C:".env" >nul
if not errorlevel 1 (
    echo [WARNING] .env is tracked by git!
    echo Run: git rm --cached .env
    set /a errors+=1
) else (
    echo [OK] .env is not tracked by git
)

git ls-files | findstr /C:"serviceaccountKey.json" >nul
if not errorlevel 1 (
    echo [WARNING] serviceaccountKey.json is tracked by git!
    echo Run: git rm --cached serviceaccountKey.json
    set /a errors+=1
) else (
    echo [OK] serviceaccountKey.json is not tracked by git
)
echo.

echo Checking template files...
if exist .env.template (
    echo [OK] .env.template exists
) else (
    echo [WARNING] .env.template not found (optional)
)

if exist serviceaccountKey.json.template (
    echo [OK] serviceaccountKey.json.template exists
) else (
    echo [WARNING] serviceaccountKey.json.template not found (optional)
)
echo.

echo ========================================
echo VERIFICATION RESULTS
echo ========================================
echo.
if %errors%==0 (
    echo [SUCCESS] All checks passed!
    echo Your security fix is complete.
    echo.
    echo You can now:
    echo 1. Run: npm run dev
    echo 2. Test Firebase connection
    echo 3. Test Gemini AI features
) else (
    echo [FAILED] Found %errors% issue(s)
    echo Please review the errors above and fix them.
    echo See SECURITY-FIX-CHECKLIST.txt for guidance.
)
echo.
pause
