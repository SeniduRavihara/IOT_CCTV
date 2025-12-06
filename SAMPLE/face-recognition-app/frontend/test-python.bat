@echo off
echo Testing Python installation...
echo.

python --version
if %errorlevel% equ 0 (
    echo.
    echo ✅ Python is installed and working!
    echo.
    echo Now you can run:
    echo cd backend
    echo pip install -r requirements.txt
    echo python app.py
) else (
    echo.
    echo ❌ Python is not installed or not in PATH
    echo.
    echo Please install Python from:
    echo - Microsoft Store (easiest)
    echo - https://www.python.org/downloads/
    echo.
    echo Make sure to check "Add Python to PATH" during installation
)

pause

