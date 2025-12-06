@echo off
title Face Recognition Application
echo ====================================
echo   Face Recognition Application
echo ====================================
echo.
echo Starting all services...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ and add it to your PATH
    pause
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 18+ and add it to your PATH
    pause
    exit /b 1
)

REM Start Milvus database
echo Starting Milvus Vector Database...
start "Milvus Database" cmd /c "docker-compose up -d && echo Milvus started! && pause"
timeout /t 5 /nobreak >nul

REM Start Python Backend
echo Starting Python Backend...
cd backend
start "Python Backend" cmd /c "python app.py"
cd ..
timeout /t 3 /nobreak >nul

REM Start Frontend
echo Starting Frontend...
cd frontend
start "Frontend Server" cmd /c "npm run dev"
cd ..

echo.
echo ====================================
echo   Services Starting...
echo ====================================
echo.
echo Milvus Database: http://localhost:19530
echo Backend API: http://localhost:5000
echo Frontend App: http://localhost:3000
echo.
echo Wait for all services to start up, then open:
echo http://localhost:3000
echo.
pause

