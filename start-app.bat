@echo off
echo ========================================
echo MedChat - Starting Backend and Frontend
echo ========================================
echo.

REM Check if Python backend is already running
echo [1/3] Checking Python backend...
curl -s http://localhost:5000/api/auth/me >nul 2>&1
if %errorlevel%==0 (
    echo ✓ Python backend already running on http://localhost:5000
) else (
    echo ⚠ Python backend not running. Please start it manually:
    echo    cd python_backend
    echo    python app.py
    echo.
)

REM Check if React frontend is already running
echo [2/3] Checking React frontend...
curl -s http://localhost:5173 >nul 2>&1
if %errorlevel%==0 (
    echo ✓ React frontend already running on http://localhost:5173
) else (
    echo ⚠ React frontend not running. Please start it manually:
    echo    npm run dev
    echo.
)

echo [3/3] Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================
echo ✅ Application ready!
echo ========================================
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Press any key to exit...
pause >nul
