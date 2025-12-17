@echo off
echo Cleaning release directory...
rmdir /s /q release 2>nul
timeout /t 2 /nobreak >nul

echo Building application...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b %errorlevel%
)

echo Creating installer...
call npx electron-builder --win
if %errorlevel% neq 0 (
    echo Installer creation failed!
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================
echo SUCCESS! Installers created in release/
echo ========================================
echo.
dir release\*.exe
echo.
pause
