@echo off
echo Creating portable package...

powershell -Command "Compress-Archive -Path 'release\win-unpacked\*' -DestinationPath 'release\FIRST-AID-Portable-1.0.0.zip' -Force"

if exist "release\FIRST-AID-Portable-1.0.0.zip" (
    echo.
    echo ========================================
    echo SUCCESS! Portable package created:
    echo release\FIRST-AID-Portable-1.0.0.zip
    echo ========================================
    echo.
    dir release\FIRST-AID-Portable-1.0.0.zip
) else (
    echo Failed to create portable package
)

pause
