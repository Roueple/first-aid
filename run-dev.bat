@echo off
echo Starting FIRST-AID in development mode...
echo.
echo This will start:
echo 1. Vite dev server (React app)
echo 2. Electron app
echo.
echo Press Ctrl+C to stop both processes
echo.
start "Vite Dev Server" cmd /k npm run dev:renderer
timeout /t 5 /nobreak
start "Electron App" cmd /k npm run dev:electron
