@echo off
REM FIRST-AID Release Script
REM This script builds and publishes a new version to GitHub Releases

echo ========================================
echo FIRST-AID Release Script
echo ========================================
echo.

REM Check if GH_TOKEN is set
if "%GH_TOKEN%"=="" (
    echo ERROR: GH_TOKEN environment variable is not set
    echo.
    echo Please set your GitHub Personal Access Token:
    echo   set GH_TOKEN=your_github_token_here
    echo.
    echo Or add it to your system environment variables
    echo.
    pause
    exit /b 1
)

echo Current version:
call npm version --json | findstr "first-aid-system"
echo.

echo What type of release?
echo 1. Patch (1.0.0 -^> 1.0.1) - Bug fixes
echo 2. Minor (1.0.0 -^> 1.1.0) - New features
echo 3. Major (1.0.0 -^> 2.0.0) - Breaking changes
echo.
set /p choice="Enter choice (1-3): "

if "%choice%"=="1" (
    echo.
    echo Bumping patch version...
    call npm version patch
) else if "%choice%"=="2" (
    echo.
    echo Bumping minor version...
    call npm version minor
) else if "%choice%"=="3" (
    echo.
    echo Bumping major version...
    call npm version major
) else (
    echo Invalid choice
    pause
    exit /b 1
)

echo.
echo New version:
call npm version --json | findstr "first-aid-system"
echo.

echo Building and publishing to GitHub Releases...
echo This will:
echo 1. Build the React app
echo 2. Build the Electron main process
echo 3. Package the app with electron-builder
echo 4. Upload to GitHub Releases
echo.

set /p confirm="Continue? (y/n): "
if /i not "%confirm%"=="y" (
    echo Cancelled
    pause
    exit /b 0
)

echo.
echo Starting build and publish...
call npm run publish

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! Release published to GitHub
    echo ========================================
    echo.
    echo Users will receive update notifications automatically
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR: Build or publish failed
    echo ========================================
    echo.
)

pause
